import { Router, type IRouter } from "express";
import { db, materialsTable, ordersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { calculateDeliveryFees, type FeeBreakdown } from "../lib/deliveryFees";

const router: IRouter = Router();

router.get("/orders", async (req, res) => {
  try {
    const { role, userId, status } = req.query as {
      role?: string;
      userId?: string;
      status?: string;
    };

    let query = db.select().from(ordersTable);

    const conditions = [];

    if (role === "consumer" && userId) {
      conditions.push(eq(ordersTable.consumerId, userId));
    } else if (role === "driver" && userId) {
      conditions.push(eq(ordersTable.driverId, userId));
    }

    if (status) {
      conditions.push(eq(ordersTable.status, status));
    }

    const orders = conditions.length > 0
      ? await db.select().from(ordersTable).where(and(...conditions))
      : await db.select().from(ordersTable);

    res.json(orders.map(o => ({
      ...o,
      totalAmount: parseFloat(o.totalAmount),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ ...order, totalAmount: parseFloat(order.totalAmount) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const {
      consumerId,
      jobSiteAddress,
      jobSiteName,
      deliveryNotes,
      items: rawItems,
      distanceMiles,
      isRushDelivery,
    } = req.body;

    if (!consumerId || !jobSiteAddress || !jobSiteName || !rawItems?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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

    const materialSubtotal = items.reduce((sum: number, item: { subtotal: number }) => sum + item.subtotal, 0);

    // Calculate delivery fees
    const fees: FeeBreakdown = calculateDeliveryFees(
      materialSubtotal,
      typeof distanceMiles === "number" ? distanceMiles : parseFloat(distanceMiles) || 0,
      !!isRushDelivery,
    );

    const totalAmount = fees.grandTotal.toFixed(2);

    const [order] = await db.insert(ordersTable).values({
      consumerId,
      jobSiteAddress,
      jobSiteName,
      deliveryNotes: deliveryNotes || null,
      items,
      status: "pending",
      totalAmount,
    }).returning();

    res.status(201).json({
      ...order,
      totalAmount: parseFloat(order.totalAmount),
      fees,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.patch("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, driverId } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (driverId !== undefined) updateData.driverId = driverId;

    const [order] = await db
      .update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, id))
      .returning();

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ ...order, totalAmount: parseFloat(order.totalAmount) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;
