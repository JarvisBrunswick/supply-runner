import { Router, type IRouter } from "express";
import { calculateDeliveryFees } from "../lib/deliveryFees";

const router: IRouter = Router();

/**
 * GET /api/delivery-fees/calculate
 * Query params:
 *   - subtotal (number, required) — material cost
 *   - distance (number, optional) — miles from store to job site
 *   - rush (string, optional) — "true" for rush delivery
 *
 * Returns full fee breakdown.
 */
router.get("/delivery-fees/calculate", (req, res) => {
  try {
    const subtotal = parseFloat(req.query.subtotal as string);
    if (isNaN(subtotal) || subtotal < 0) {
      return res.status(400).json({ error: "Valid subtotal is required" });
    }

    const distance = parseFloat(req.query.distance as string) || 0;
    const rush = req.query.rush === "true";

    const fees = calculateDeliveryFees(subtotal, distance, rush);
    res.json(fees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to calculate fees" });
  }
});

export default router;
