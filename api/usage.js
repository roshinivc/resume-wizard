// Usage tracking API — email-based, cross-device
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
  return Math.abs(hash).toString(36);
}

// Get or create a usage record — always keyed by email
// If only fingerprint exists, migrate it to the email record
async function getOrCreateRecord(email, fingerprint) {
  // 1. Try email first
  const { data: emailRecord } = await supabase
    .from("usage").select("*").eq("email", email).single();

  if (emailRecord) return { record: emailRecord, key: "email", val: email };

  // 2. Try fingerprint — migrate it to email
  const { data: fpRecord } = await supabase
    .from("usage").select("*").eq("fingerprint", fingerprint).single();

  if (fpRecord) {
    // Migrate: attach email to this fingerprint record
    await supabase.from("usage").update({ email }).eq("fingerprint", fingerprint);
    return { record: { ...fpRecord, email }, key: "email", val: email };
  }

  // 3. Brand new user — create record
  const newRecord = { fingerprint, email, count: 0, paid: false, plan: "free", last_used: new Date().toISOString() };
  await supabase.from("usage").insert(newRecord);
  return { record: newRecord, key: "email", val: email };
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

  const { record } = await getOrCreateRecord(email, fingerprint);

  const count = record.count || 0;
  const paid = record.paid || false;
  const plan = record.plan || "free";
  const limit = paid ? (plan === "monthly" ? 15 : 999) : FREE_LIMIT;

  if (req.method === "GET") {
    return res.json({ allowed: paid || count < FREE_LIMIT, used: count, limit, paid, plan, isAdmin: false, email });
  }

  if (req.method === "POST") {
    const newCount = count + 1;
    await supabase.from("usage")
      .update({ count: newCount, last_used: new Date().toISOString() })
      .eq("email", email);
    return res.json({ count: newCount, paid, plan });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
