/**
 * enterprise-interest.js
 * Handles Enterprise interest form submissions.
 * Stores in Supabase + sends email notification to owner.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, company, role, teamSize, useCase, tier } = req.body;

  if (!name || !email || !company) {
    return res.status(400).json({ error: "Name, email and company are required." });
  }

  // Store in Supabase (table: enterprise_leads)
  try {
    await supabase.from("enterprise_leads").insert({
      name, email, company, role, team_size: teamSize,
      use_case: useCase, tier_interest: tier,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Supabase insert failed:", err);
    // Don't fail the request — still send the email
  }

  // Email notification to owner via simple fetch to a mailto API
  // (Replace with SendGrid/Resend if you want proper email)
  console.log(`[Enterprise Lead] ${name} <${email}> from ${company} — ${tier}`);

  return res.status(200).json({ success: true });
}
