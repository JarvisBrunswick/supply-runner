/**
 * Supply Runner — Stripe Integration
 *
 * Uses Stripe Checkout Sessions for a simple, hosted payment flow.
 * This avoids needing native Stripe SDK in the Expo app —
 * customers are redirected to Stripe's hosted checkout page.
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env["STRIPE_SECRET_KEY"];

if (!STRIPE_SECRET_KEY) {
  console.warn("⚠️  STRIPE_SECRET_KEY not set — payment endpoints will fail");
}

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" })
  : null;

export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.");
  }
  return stripe;
}
