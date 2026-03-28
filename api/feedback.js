// Feedback / review submission and retrieval
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-email");
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET — return approved/recent reviews
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("feedback")
      .select("name, rating, review, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ reviews: data || [] });
  }

  // POST — submit a review
  if (req.method === "POST") {
    const { name, rating, review } = req.body || {};
    const email = req.headers["x-email"] || null;

    if (!review || review.trim().length < 5) {
      return res.status(400).json({ error: "Please write a review." });
    }
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Rating must be 1-5." });
    }

    // Trim to 200 words
    const words = review.trim().split(/\s+/);
    const trimmed = words.slice(0, 200).join(" ");

    const { error } = await supabase.from("feedback").insert({
      email,
      name: name?.trim() || "Anonymous",
      rating: rating || 5,
      review: trimmed,
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
