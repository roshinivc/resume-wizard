// Usage tracking API — fingerprint as PK, email for cross-device lookup
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const FREE_LIMIT = 3;

function getFingerprint(req) {
  const clientFp = req.headers["x-fp"];
  if (clientFp && clientFp.length > 4) return clientFp;
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  let hash = 0;
  const str = ip + ua;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return "srv_" + Math.abs(hash).toString(36);
}

async function findRecord(email, fingerprint) {
  // 1. Look up by email — finds the canonical record across devices
  const { data: byEmail } = await supabase
    .from("usage")
    .select("*")
    .eq("email", email)
    .order("last_used", { ascending: false })
    .limit(1);

  if (byEmail && byEmail.length > 0) return byEmail[0];

  // 2. Look up by fingerprint
  const { data: byFp } = await supabase
    .from("usage")
    .select("*")
    .eq("fingerprint", fingerprint)
    .limit(1);

  if (byFp && byFp.length > 0) {
    // Attach email to this record for future cross-device lookups
    const record = byFp[0];
    if (!record.email) {
      await supabase.from("usage").update({ email }).eq("fingerprint", record.fingerprint);
      record.email = email;
    }
    return record;
  }

  return null;
}

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
  const fingerprint = getFingerprint(req);

  // Email required
  if (!email) {
    return res.json({ allowed: false, requiresEmail: true, used: 0, limit: FREE_LIMIT, paid: false, plan: "free", isAdmin: false, email: null });
  }

  let record = await findRecord(email, fingerprint);

  // Brand new user — create record keyed by fingerprint, with email attached
  if (!record) {
    const newFp = req.headers["x-fp"] || fingerprint;
    const { data: inserted } = await supabase
      .from("usage")
      .upsert({ fingerprint: newFp, email, count: 0, paid: false, plan: "free", last_used: new Date().toISOString() }, { onConflict: "fingerprint" })
      .select()
      .single();
    record = inserted || { fingerprint: newFp, email, count: 0, paid: false, plan: "free" };
  }

  const count = record?.count || 0;
  const paid = record?.paid || false;
  const plan = record?.plan || "free";
  const limit = paid ? (plan === "monthly" ? 15 : 999) : FREE_LIMIT;
  const allowed = paid || count < FREE_LIMIT;

  if (req.method === "GET") {
    return res.json({ allowed, used: count, limit, paid, plan, isAdmin: false, email });
  }

  if (req.method === "POST") {
    const newCount = count + 1;
    // Update the record we found (by its actual fingerprint)
    await supabase.from("usage")
      .update({ count: newCount, last_used: new Date().toISOString() })
      .eq("fingerprint", record.fingerprint);
    return res.json({ count: newCount, paid, plan });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
