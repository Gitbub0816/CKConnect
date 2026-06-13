import "server-only";
import Stripe from "stripe";

let stripe: Stripe | undefined;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-05-27.dahlia",
    typescript: true,
  });
  return stripe;
}
