// Usage tracking — read-only GET, write on POST
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

  // Read record by fingerprint — do NOT create if missing
  let record = null;
  if (fp) {
    const { data } = await supabase.from("usage").select("*").eq("fingerprint", fp).limit(1);
    if (data && data.length > 0) record = data[0];
  }

  const count = record?.count || 0;
  const paid = record?.paid || false;
  const plan = record?.plan || "free";
  const limit = paid ? (plan === "monthly" ? 15 : 999) : FREE_LIMIT;

  if (req.method === "GET") {
    return res.json({ allowed: paid || count < FREE_LIMIT, used: count, limit, paid, plan, isAdmin: false, email });
  }

  if (req.method === "POST") {
    if (record) {
      // Update existing
      const newCount = count + 1;
      await supabase.from("usage").update({ count: newCount, last_used: new Date().toISOString() }).eq("fingerprint", fp);
      return res.json({ count: newCount, paid, plan });
    } else {
      // Create new with count 1
      await supabase.from("usage").insert({ fingerprint: fp, email, count: 1, paid: false, plan: "free", last_used: new Date().toISOString() });
      return res.json({ count: 1, paid: false, plan: "free" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
