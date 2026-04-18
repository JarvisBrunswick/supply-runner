import { Router, type IRouter } from "express";
import { db, materialsTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getStripe } from "../lib/stripe";
import { calculateDeliveryFees } from "../lib/deliveryFees";

const router: IRouter = Router();

/**
 * POST /api/payments/create-checkout
 *
 * Creates a Stripe Checkout Session for an order.
 * The frontend redirects the user to Stripe's hosted checkout page.
 *
 * Body:
 *   - consumerId (string)
 *   - jobSiteName (string)
 *   - jobSiteAddress (string)
 *   - deliveryNotes (string, optional)
 *   - distanceMiles (number, optional)
 *   - isRushDelivery (boolean, optional)
 *   - items: Array<{ materialId: number; quantity: number }>
 *   - successUrl (string) — redirect URL after successful payment
 *   - cancelUrl (string) — redirect URL if customer cancels
 */
router.post("/payments/create-checkout", async (req, res) => {
  try {
    const stripe = getStripe();

    const {
      consumerId,
      jobSiteName,
      jobSiteAddress,
      deliveryNotes,
      distanceMiles,
      isRushDelivery,
      items: rawItems,
      successUrl,
      cancelUrl,
    } = req.body;

    if (!consumerId || !jobSiteAddress || !jobSiteName || !rawItems?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: "successUrl and cancelUrl are required" });
    }

    // Resolve materials from DB
    const materials = await db.select().from(materialsTable);
    const materialMap = new Map(materials.map(m => [m.id, m]));

    const items = rawItems.map((item: { materialId: number; quantity: number }) => {
      const material = materialMap.get(item.materialId);
      if (!material) throw new Error(`Material ${item.materialId} not found`);
      const pricePerUnit = parseFloat(material.pricePerUnit);
      return {
        materialId: item.materialId,
        materialName: material.name,
        quantity: item.quantity,
        unit: material.unit,
        pricePerUnit,
        subtotal: pricePerUnit * item.quantity,
      };
    });

    const materialSubtotal = items.reduce(
      (sum: number, item: { subtotal: number }) => sum + item.subtotal,
      0,
    );

    // Calculate fees
    const fees = calculateDeliveryFees(
      materialSubtotal,
      typeof distanceMiles === "number" ? distanceMiles : parseFloat(distanceMiles) || 0,
      !!isRushDelivery,
    );

    // Create the order in DB with status "pending_payment"
    const [order] = await db
      .insert(ordersTable)
      .values({
        consumerId,
        jobSiteAddress,
        jobSiteName,
        deliveryNotes: deliveryNotes || null,
        items,
        status: "pending_payment",
        totalAmount: fees.grandTotal.toFixed(2),
      })
      .returning();

    // Build Stripe line items
    const lineItems: Array<{
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }> = [];

    // Add each material as a line item
    for (const item of items) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.materialName,
            description: `${item.quantity} ${item.unit}`,
          },
          unit_amount: Math.round(item.pricePerUnit * 100), // Stripe uses cents
        },
        quantity: item.quantity,
      });
    }

    // Add delivery fee as a line item (if not waived)
    if (fees.baseFee - fees.deliveryDiscount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Delivery Fee",
            description: `Base delivery (first 10 miles included)`,
          },
          unit_amount: Math.round((fees.baseFee - fees.deliveryDiscount) * 100),
        },
        quantity: 1,
      });
    }

    // Add distance fee if applicable
    if (fees.distanceFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Distance Fee",
            description: `Extra miles beyond 10-mile radius`,
          },
          unit_amount: Math.round(fees.distanceFee * 100),
        },
        quantity: 1,
      });
    }

    // Add service fee
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Service Fee",
          description: "5% platform service fee",
        },
        unit_amount: Math.round(fees.serviceFee * 100),
      },
      quantity: 1,
    });

    // Add rush fee if applicable
    if (fees.rushFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Rush Delivery",
            description: "Priority delivery (<1 hour)",
          },
          unit_amount: Math.round(fees.rushFee * 100),
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${successUrl}?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}?orderId=${order.id}`,
      metadata: {
        orderId: String(order.id),
        consumerId,
        jobSiteName,
      },
    });

    res.status(201).json({
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: order.id,
      fees,
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

/**
 * POST /api/payments/confirm
 *
 * Called after successful Stripe checkout to confirm the order.
 * Updates order status from "pending_payment" to "pending" (ready for drivers).
 *
 * Body:
 *   - orderId (number)
 *   - sessionId (string) — Stripe checkout session ID
 */
router.post("/payments/confirm", async (req, res) => {
  try {
    const stripe = getStripe();
    const { orderId, sessionId } = req.body;

    if (!orderId || !sessionId) {
      return res.status(400).json({ error: "orderId and sessionId are required" });
    }

    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    // Verify the orderId matches
    if (session.metadata?.orderId !== String(orderId)) {
      return res.status(400).json({ error: "Order ID mismatch" });
    }

    // Update order status to "pending" (available for drivers)
    const [order] = await db
      .update(ordersTable)
      .set({
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId))
      .returning();

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      ...order,
      totalAmount: parseFloat(order.totalAmount),
      paymentStatus: "paid",
    });
  } catch (err) {
    console.error("confirm-payment error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

/**
 * GET /api/payments/status/:orderId
 *
 * Check payment status for an order.
 */
router.get("/payments/status/:orderId", async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      orderId: order.id,
      status: order.status,
      isPaid: order.status !== "pending_payment",
      totalAmount: parseFloat(order.totalAmount),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check payment status" });
  }
});

/**
 * GET /api/payments/success
 * 
 * Redirect page after successful Stripe checkout.
 * Confirms payment and shows success message.
 */
router.get("/payments/success", async (req, res) => {
  try {
    const stripe = getStripe();
    const { orderId, session_id: sessionId } = req.query as {
      orderId?: string;
      session_id?: string;
    };

    if (orderId && sessionId) {
      // Auto-confirm the payment
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid" && session.metadata?.orderId === orderId) {
        await db
          .update(ordersTable)
          .set({ status: "pending", updatedAt: new Date() })
          .where(eq(ordersTable.id, parseInt(orderId)));
      }
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F1F5F9; }
          .card { text-align: center; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 360px; }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h1 { color: #1A1A1A; font-size: 22px; margin: 0 0 8px; }
          p { color: #64748B; font-size: 15px; margin: 0 0 20px; }
          .btn { background: #F96302; color: white; border: none; border-radius: 12px; padding: 14px 28px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h1>Payment Successful!</h1>
          <p>Your order has been placed and drivers will be notified. You can close this window and return to the app.</p>
          <p style="font-size:13px; color:#94A3B8;">Order #${orderId ?? ""}</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("payment success page error:", err);
    res.send("<h1>Payment received! You can close this window.</h1>");
  }
});

/**
 * GET /api/payments/cancel
 *
 * Redirect page when customer cancels Stripe checkout.
 */
router.get("/payments/cancel", async (req, res) => {
  const { orderId } = req.query as { orderId?: string };

  // Clean up the pending_payment order
  if (orderId) {
    try {
      await db
        .update(ordersTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(ordersTable.id, parseInt(orderId)));
    } catch {}
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F1F5F9; }
        .card { text-align: center; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 360px; }
        .icon { font-size: 48px; margin-bottom: 16px; }
        h1 { color: #1A1A1A; font-size: 22px; margin: 0 0 8px; }
        p { color: #64748B; font-size: 15px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">❌</div>
        <h1>Payment Cancelled</h1>
        <p>Your order was not placed. You can close this window and try again in the app.</p>
      </div>
    </body>
    </html>
  `);
});

export default router;
