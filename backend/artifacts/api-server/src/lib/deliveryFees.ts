/**
 * Supply Runner — Delivery Fee Calculation
 *
 * All config values are at the top for easy adjustment.
 * Fee structure:
 *   - Base delivery fee (covers first N miles)
 *   - Per-mile fee beyond the included radius
 *   - Service fee (% of material subtotal)
 *   - Rush delivery premium
 *   - Large order discount (waive base fee)
 *   - Driver payout split
 */

// ─── Configurable Defaults ───────────────────────────────────────────

/** Flat base delivery fee ($) */
export const BASE_DELIVERY_FEE = 35;

/** Miles included in the base fee */
export const INCLUDED_MILES = 10;

/** Per-mile charge beyond included radius ($/mile) */
export const PER_MILE_FEE = 2;

/** Service fee as a fraction of material subtotal */
export const SERVICE_FEE_RATE = 0.05;

/** Minimum service fee ($) */
export const MIN_SERVICE_FEE = 2;

/** Rush delivery surcharge ($) */
export const RUSH_FEE = 20;

/** Material subtotal threshold for free delivery (waives base fee) */
export const FREE_DELIVERY_THRESHOLD = 750;

/** Fraction of (baseFee + distanceFee + rushFee - discount) paid to driver */
export const DRIVER_PAYOUT_RATE = 0.80;

// ─── Types ───────────────────────────────────────────────────────────

export interface FeeBreakdown {
  /** Material cost before fees */
  materialSubtotal: number;
  /** Flat base delivery charge */
  baseFee: number;
  /** Extra charge for distance beyond included miles */
  distanceFee: number;
  /** Percentage-based service fee */
  serviceFee: number;
  /** Rush delivery surcharge (0 if not rush) */
  rushFee: number;
  /** Discount applied (negative = savings, stored as positive number) */
  deliveryDiscount: number;
  /** Sum of all fees after discount */
  totalFees: number;
  /** Amount the driver receives from delivery fees */
  driverPayout: number;
  /** materialSubtotal + totalFees */
  grandTotal: number;
}

// ─── Calculator ──────────────────────────────────────────────────────

export function calculateDeliveryFees(
  materialSubtotal: number,
  distanceMiles: number = 0,
  isRushDelivery: boolean = false,
): FeeBreakdown {
  // Base fee
  let baseFee = BASE_DELIVERY_FEE;

  // Distance fee (only for miles beyond included radius)
  const extraMiles = Math.max(0, distanceMiles - INCLUDED_MILES);
  const distanceFee = round(extraMiles * PER_MILE_FEE);

  // Service fee (% of material subtotal, with minimum)
  const serviceFee = round(Math.max(MIN_SERVICE_FEE, materialSubtotal * SERVICE_FEE_RATE));

  // Rush fee
  const rushFee = isRushDelivery ? RUSH_FEE : 0;

  // Large order discount — waive the base delivery fee
  let deliveryDiscount = 0;
  if (materialSubtotal >= FREE_DELIVERY_THRESHOLD) {
    deliveryDiscount = baseFee;
  }

  // Total fees
  const totalFees = round(baseFee + distanceFee + serviceFee + rushFee - deliveryDiscount);

  // Driver payout: 80% of delivery-related fees (base + distance + rush - discount), NOT service fee
  const deliveryRelatedFees = baseFee + distanceFee + rushFee - deliveryDiscount;
  const driverPayout = round(deliveryRelatedFees * DRIVER_PAYOUT_RATE);

  // Grand total
  const grandTotal = round(materialSubtotal + totalFees);

  return {
    materialSubtotal: round(materialSubtotal),
    baseFee: round(baseFee),
    distanceFee,
    serviceFee,
    rushFee,
    deliveryDiscount: round(deliveryDiscount),
    totalFees,
    driverPayout,
    grandTotal,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
