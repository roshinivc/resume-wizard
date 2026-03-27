// Email auth — Supabase magic links + session verification
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-access-token");
  if (req.method === "OPTIONS") return res.status(200).end();

  const url = new URL(req.url, `https://${req.headers.host}`);

  // POST /api/auth — send magic link
  // Body: { email, fingerprint }
  if (req.method === "POST") {
    const { email, fingerprint } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid email required" });
    }

    const appUrl = process.env.APP_URL || "https://resume-wizard-opal.vercel.app";
    // Redirect back to app after magic link click — pass fingerprint so we can merge records
    const redirectTo = `${appUrl}/?fp=${encodeURIComponent(fingerprint || "")}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error("Magic link error:", error.message);
      return res.status(500).json({ error: "Failed to send magic link. Please try again." });
    }

    return res.json({ ok: true, message: "Check your email for the magic link!" });
  }

  // POST /api/auth/verify — verify an access token and return email
  // Called by frontend after magic link click to get the user's email
  // Body: { access_token }
  if (req.method === "POST" && url.pathname.includes("/verify")) {
    // This won't match because POST already handled above — handled via query param instead
  }

  // GET /api/auth?action=verify&token=ACCESS_TOKEN
  // Frontend calls this to get user email from access token
  if (req.method === "GET" && url.searchParams.get("action") === "verify") {
    const token = url.searchParams.get("token");
    if (!token) return res.status(400).json({ error: "Token required" });

    // Use the service role to get user info from the token
    // We create a client with the user's access token
    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error } = await userClient.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.json({ email: user.email, id: user.id });
  }

  // GET /api/auth — magic link callback from Supabase
  // Supabase redirects here after the user clicks the email link
  // Tokens are in the URL fragment (hash) — which means they arrive client-side, not server-side
  // So we just redirect to the app root and let the frontend JS pick up the hash
  if (req.method === "GET") {
    const fp = url.searchParams.get("fp") || "";
    const appUrl = process.env.APP_URL || "https://resume-wizard-opal.vercel.app";
    // Pass fp through so the app can restore the fingerprint
    const qs = fp ? `?fp=${encodeURIComponent(fp)}` : "";
    return res.redirect(302, `${appUrl}/${qs}`);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
