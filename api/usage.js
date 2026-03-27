// Usage tracking API — check and increment usage count
// Supports both fingerprint (default) and email-based (logged-in users) lookup
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const FREE_LIMIT = 3;

// Get a fingerprint from request headers (client sends x-fp)
function getFingerprint(req) {
  // Client sends a session fingerprint via header
  const clientFp = req.headers["x-fp"];
  if (clientFp && clientFp.length > 4) return clientFp;

  // Fallback: IP + UA hash
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  let hash = 0;
  const str = ip + ua;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function getUsageByEmail(email) {
  const { data, error } = await supabase
    .from("usage")
    .select("fingerprint, count, paid, plan, email")
    .eq("email", email)
    .order("last_used", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") return null;
  return data;
}

async function getUsageByFingerprint(fingerprint) {
  const { data, error } = await supabase
    .from("usage")
    .select("fingerprint, count, paid, plan, email")
    .eq("fingerprint", fingerprint)
    .single();
  if (error && error.code !== "PGRST116") return null;
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token, x-fp, x-email");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Admin bypass
  const adminToken = req.headers["x-admin-token"];
  if (adminToken && adminToken === process.env.ADMIN_TOKEN) {
    return res.json({ allowed: true, isAdmin: true, used: 0, limit: 999 });
  }

  // Email takes priority (logged-in user, cross-device)
  const emailHeader = req.headers["x-email"];
  const fingerprint = getFingerprint(req);

  // Try to find record by email first, then by fingerprint
  let data = null;
  let lookupKey = "fingerprint";
  let lookupVal = fingerprint;

  if (emailHeader) {
    data = await getUsageByEmail(emailHeader);
    if (data) {
      lookupKey = "email";
      lookupVal = emailHeader;
    }
  }

  if (!data) {
    data = await getUsageByFingerprint(fingerprint);
  }

  if (req.method === "GET") {
    const count = data?.count || 0;
    const paid = data?.paid || false;
    const plan = data?.plan || "free";
    const userEmail = data?.email || null;
    const limit = paid ? (plan === "monthly" ? 15 : 999) : FREE_LIMIT;

    return res.json({
      allowed: paid || count < FREE_LIMIT,
      used: count,
      limit,
      paid,
      plan,
      isAdmin: false,
      email: userEmail,
    });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const emailToSave = emailHeader || body.email || null;

    if (data) {
      const newCount = (data.count || 0) + 1;
      // If we found by email, update by email; else by fingerprint
      let query = supabase
        .from("usage")
        .update({
          count: newCount,
          last_used: new Date().toISOString(),
          ...(emailToSave && !data.email ? { email: emailToSave } : {}),
        });

      if (data.email) {
        query = query.eq("email", data.email);
      } else {
        query = query.eq("fingerprint", data.fingerprint || fingerprint);
        // If we just got their email now, save it
        if (emailToSave) {
          await supabase
            .from("usage")
            .update({ email: emailToSave })
            .eq("fingerprint", data.fingerprint || fingerprint);
        }
      }
      await query;
      return res.json({ count: newCount, paid: data.paid, plan: data.plan });
    } else {
      // New user — create record
      await supabase.from("usage").insert({
        fingerprint,
        count: 1,
        paid: false,
        plan: "free",
        last_used: new Date().toISOString(),
        ...(emailToSave ? { email: emailToSave } : {}),
      });
      return res.json({ count: 1, paid: false, plan: "free" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
