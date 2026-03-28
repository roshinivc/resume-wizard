// Usage tracking API
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

  // Email required
  if (!email) {
    return res.json({ allowed: false, requiresEmail: true, used: 0, limit: FREE_LIMIT, paid: false, plan: "free", isAdmin: false, email: null });
  }

  // Try to find record by email first, then by fingerprint
  let record = null;

  // 1. Look up by email
  try {
    const { data } = await supabase.from("usage").select("*").eq("email", email).order("last_used", { ascending: false }).limit(1);
    if (data && data.length > 0) record = data[0];
  } catch (e) { console.error("email lookup error:", e.message); }

  // 2. Fall back to fingerprint
  if (!record && fp) {
    try {
      const { data } = await supabase.from("usage").select("*").eq("fingerprint", fp).limit(1);
      if (data && data.length > 0) {
        record = data[0];
        // Attach email to this record
        try {
          await supabase.from("usage").update({ email }).eq("fingerprint", fp);
          record.email = email;
        } catch (e) { /* email column may not exist yet, that's ok */ }
      }
    } catch (e) { console.error("fp lookup error:", e.message); }
  }

  // 3. Create new record
  if (!record) {
    const newFp = fp || "usr_" + Math.random().toString(36).slice(2);
    try {
      await supabase.from("usage").upsert(
        { fingerprint: newFp, count: 0, paid: false, plan: "free", last_used: new Date().toISOString() },
        { onConflict: "fingerprint" }
      );
      // Try to attach email separately (in case column exists)
      try { await supabase.from("usage").update({ email }).eq("fingerprint", newFp); } catch (_) {}
    } catch (e) { console.error("insert error:", e.message); }
    record = { fingerprint: newFp, email, count: 0, paid: false, plan: "free" };
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
    try {
      await supabase.from("usage").update({ count: newCount, last_used: new Date().toISOString() }).eq("fingerprint", record.fingerprint);
    } catch (e) { console.error("increment error:", e.message); }
    return res.json({ count: newCount, paid, plan });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
