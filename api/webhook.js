// Stripe webhook — marks user as paid after successful payment
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => resolve(Buffer.from(data)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    const session = event.data.object;
    const fingerprint = session.metadata?.fingerprint;
    const plan = session.metadata?.plan || "payg";

    if (fingerprint) {
      await supabase
        .from("usage")
        .upsert({
          fingerprint,
          paid: true,
          plan,
          count: plan === "payg" ? 0 : 0, // reset count on new purchase
          last_used: new Date().toISOString(),
        }, { onConflict: "fingerprint" });
    }
  }

  // Handle subscription cancellation
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const fingerprint = sub.metadata?.fingerprint;
    if (fingerprint) {
      await supabase
        .from("usage")
        .update({ paid: false, plan: "free" })
        .eq("fingerprint", fingerprint);
    }
  }

  res.json({ received: true });
}
