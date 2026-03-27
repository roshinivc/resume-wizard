// Usage tracking API — check and increment usage count
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const FREE_LIMIT = 3;

// Get a fingerprint from request (IP + user agent)
function getFingerprint(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  // Simple hash
  let hash = 0;
  const str = ip + ua;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Admin bypass
  const adminToken = req.headers["x-admin-token"];
  if (adminToken && adminToken === process.env.ADMIN_TOKEN) {
    return res.json({ allowed: true, isAdmin: true, used: 0, limit: 999 });
  }

  const fingerprint = getFingerprint(req);

  if (req.method === "GET") {
    // Check usage
    const { data, error } = await supabase
      .from("usage")
      .select("count, paid, plan")
      .eq("fingerprint", fingerprint)
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(500).json({ error: "Could not check usage" });
    }

    const count = data?.count || 0;
    const paid = data?.paid || false;
    const plan = data?.plan || "free";

    const limit = paid
      ? (plan === "monthly" ? 15 : 999)
      : FREE_LIMIT;

    return res.json({
      allowed: paid || count < FREE_LIMIT,
      used: count,
      limit,
      paid,
      plan,
      isAdmin: false,
    });
  }

  if (req.method === "POST") {
    // Increment usage
    const { data: existing } = await supabase
      .from("usage")
      .select("count, paid, plan")
      .eq("fingerprint", fingerprint)
      .single();

    if (existing) {
      const newCount = (existing.count || 0) + 1;
      await supabase
        .from("usage")
        .update({ count: newCount, last_used: new Date().toISOString() })
        .eq("fingerprint", fingerprint);
      return res.json({ count: newCount, paid: existing.paid, plan: existing.plan });
    } else {
      await supabase
        .from("usage")
        .insert({ fingerprint, count: 1, paid: false, plan: "free", last_used: new Date().toISOString() });
      return res.json({ count: 1, paid: false, plan: "free" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
