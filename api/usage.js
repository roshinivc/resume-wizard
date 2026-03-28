// Usage tracking — fingerprint is the stable key, email is stored but not used for lookup
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const FREE_LIMIT = 3;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token, x-fp, x-email");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Admin bypass
  const adminToken = req.headers["x-admin-token"];
  if (adminToken && adminToken === process.env.ADMIN_TOKEN) {
    return res.json({ allowed: true, isAdmin: true, used: 0, limit: 999, paid: true, plan: "admin", email: null });
  }

  const email = req.headers["x-email"] || null;
  const fp = req.headers["x-fp"] || null;

  if (!email) {
    return res.json({ allowed: false, requiresEmail: true, used: 0, limit: FREE_LIMIT, paid: false, plan: "free", isAdmin: false, email: null });
  }

  if (!fp) {
    return res.json({ allowed: false, requiresEmail: true, used: 0, limit: FREE_LIMIT, paid: false, plan: "free", isAdmin: false, email: null });
  }

  // Look up by fingerprint — stable, always the same from this device
  const { data: rows, error } = await supabase
    .from("usage")
    .select("*")
    .eq("fingerprint", fp)
    .limit(1);

  let record = rows && rows.length > 0 ? rows[0] : null;

  // No record — create one
  if (!record) {
    const { data: inserted, error: ie } = await supabase
      .from("usage")
      .insert({ fingerprint: fp, email, count: 0, paid: false, plan: "free", last_used: new Date().toISOString() })
      .select()
      .single();
    console.log("Created:", fp, ie?.message || "ok");
    record = inserted || { fingerprint: fp, email, count: 0, paid: false, plan: "free" };
  }

  const count = record?.count || 0;
  const paid = record?.paid || false;
  const plan = record?.plan || "free";
  const limit = paid ? (plan === "monthly" ? 15 : 999) : FREE_LIMIT;

  if (req.method === "GET") {
    return res.json({ allowed: paid || count < FREE_LIMIT, used: count, limit, paid, plan, isAdmin: false, email });
  }

  if (req.method === "POST") {
    const newCount = count + 1;
    await supabase.from("usage")
      .update({ count: newCount, last_used: new Date().toISOString() })
      .eq("fingerprint", fp);
    console.log("Incremented:", fp, "to", newCount);
    return res.json({ count: newCount, paid, plan });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
