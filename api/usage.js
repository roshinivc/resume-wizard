// Usage tracking — single source of truth
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

  // Always look up by EMAIL first — canonical cross-device key
  const { data: rows, error: lookupErr } = await supabase
    .from("usage")
    .select("*")
    .eq("email", email)
    .order("last_used", { ascending: false })
    .limit(1);

  console.log("Lookup by email:", email, "rows:", rows?.length, "err:", lookupErr?.message);

  let record = rows && rows.length > 0 ? rows[0] : null;

  // No email record — check fingerprint
  if (!record && fp) {
    const { data: fpRows } = await supabase.from("usage").select("*").eq("fingerprint", fp).limit(1);
    if (fpRows && fpRows.length > 0) {
      record = fpRows[0];
      // Attach email to this record
      await supabase.from("usage").update({ email }).eq("fingerprint", fp);
      record.email = email;
      console.log("Found by fp, attached email");
    }
  }

  // Still nothing — create new record
  if (!record) {
    const newFp = fp || ("u_" + Math.random().toString(36).slice(2));
    const { data: inserted, error: insertErr } = await supabase
      .from("usage")
      .insert({ fingerprint: newFp, email, count: 0, paid: false, plan: "free", last_used: new Date().toISOString() })
      .select()
      .single();
    console.log("Created new record:", newFp, "err:", insertErr?.message);
    record = inserted || { fingerprint: newFp, email, count: 0, paid: false, plan: "free" };
  }

  const count = record?.count || 0;
  const paid = record?.paid || false;
  const plan = record?.plan || "free";
  const limit = paid ? (plan === "monthly" ? 15 : 999) : FREE_LIMIT;

  if (req.method === "GET") {
    return res.json({ allowed: paid || count < FREE_LIMIT, used: count, limit, paid, plan, isAdmin: false, email });
  }

  if (req.method === "POST") {
    // Increment using email as key (consistent)
    const newCount = count + 1;
    const { error: updateErr } = await supabase
      .from("usage")
      .update({ count: newCount, last_used: new Date().toISOString() })
      .eq("email", email);
    console.log("Incremented to", newCount, "err:", updateErr?.message);
    return res.json({ count: newCount, paid, plan });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
