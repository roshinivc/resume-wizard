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
    const fingerprint = session.client_reference_id || session.metadata?.fingerprint;
    const plan = session.metadata?.plan || (session.mode === "subscription" ? "monthly" : "payg");

    // Extract customer email — Stripe provides it on checkout.session.completed
    const customerEmail = session.customer_details?.email
      || session.customer_email
      || null;

    console.log(`Payment complete: fingerprint=${fingerprint}, plan=${plan}, email=${customerEmail}`);

    if (fingerprint) {
      // Upsert by fingerprint
      const { data: existing } = await supabase
        .from("usage")
        .select("fingerprint, email")
        .eq("fingerprint", fingerprint)
        .single();

      if (existing) {
        // Update existing record
        await supabase
          .from("usage")
          .update({
            paid: true,
            plan,
            count: 0, // reset count on new purchase
            last_used: new Date().toISOString(),
            ...(customerEmail && !existing.email ? { email: customerEmail } : {}),
          })
          .eq("fingerprint", fingerprint);
      } else {
        // Insert new record (user paid without prior free usage)
        await supabase.from("usage").insert({
          fingerprint,
          paid: true,
          plan,
          count: 0,
          last_used: new Date().toISOString(),
          ...(customerEmail ? { email: customerEmail } : {}),
        });
      }

      // If we have an email, also update any existing email-matched record
      // so paid status propagates across devices
      if (customerEmail) {
        const { data: emailRecord } = await supabase
          .from("usage")
          .select("fingerprint")
          .eq("email", customerEmail)
          .neq("fingerprint", fingerprint)
          .limit(1)
          .single();

        if (emailRecord) {
          // Merge: mark the email-matched record as paid too
          await supabase
            .from("usage")
            .update({ paid: true, plan, count: 0, last_used: new Date().toISOString() })
            .eq("fingerprint", emailRecord.fingerprint);
        }
      }
    } else if (customerEmail) {
      // No fingerprint but have email — upsert by email
      const { data: emailRecord } = await supabase
        .from("usage")
        .select("fingerprint")
        .eq("email", customerEmail)
        .single();

      if (emailRecord) {
        await supabase
          .from("usage")
          .update({ paid: true, plan, count: 0, last_used: new Date().toISOString() })
          .eq("email", customerEmail);
      } else {
        // Create a new record keyed by email (fingerprint = email hash)
        const fp = "email_" + customerEmail.replace(/[^a-z0-9]/gi, "_");
        await supabase.from("usage").insert({
          fingerprint: fp,
          email: customerEmail,
          paid: true,
          plan,
          count: 0,
          last_used: new Date().toISOString(),
        });
      }
    }
  }

  // Handle subscription cancellation
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const fingerprint = sub.metadata?.fingerprint;

    // Try to get email from Stripe customer
    let customerEmail = null;
    try {
      if (sub.customer) {
        const customer = await stripe.customers.retrieve(sub.customer);
        customerEmail = customer.email;
      }
    } catch (e) {
      console.error("Could not retrieve customer:", e.message);
    }

    if (fingerprint) {
      await supabase
        .from("usage")
        .update({ paid: false, plan: "free" })
        .eq("fingerprint", fingerprint);
    }
    if (customerEmail) {
      await supabase
        .from("usage")
        .update({ paid: false, plan: "free" })
        .eq("email", customerEmail);
    }
  }

  res.json({ received: true });
}
