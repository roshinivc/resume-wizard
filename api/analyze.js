import Anthropic from "@anthropic-ai/sdk";
import { IncomingForm } from "formidable";
import { readFile } from "fs/promises";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function extractText(buffer, mimetype, filename) {
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  if (mimetype === "application/pdf" || ext === "pdf") {
    const pdfParse = (await import("pdf-parse-fork")).default;
    return (await pdfParse(buffer)).text;
  }
  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === "docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.default.extractRawText({ buffer })).value;
  }
  if (mimetype === "text/plain" || ext === "txt") return buffer.toString("utf-8");
  throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT.");
}

async function incrementUsage(fingerprint, email) {
  // 1. Try by email first
  if (email) {
    const { data, error } = await supabase.from("usage")
      .select("fingerprint,count,paid,plan")
      .eq("email", email)
      .order("last_used", { ascending: false })
      .limit(1);
    console.log("Email lookup:", JSON.stringify({ data, error: error?.message }));
    if (data && data.length > 0) {
      const rec = data[0];
      const { error: ue } = await supabase.from("usage")
        .update({ count: (rec.count || 0) + 1, last_used: new Date().toISOString() })
        .eq("fingerprint", rec.fingerprint);
      console.log("Update by email record:", ue?.message || "ok");
      return { updated: rec.fingerprint, newCount: (rec.count || 0) + 1 };
    }
  }

  // 2. Try by fingerprint
  if (fingerprint) {
    const { data, error } = await supabase.from("usage")
      .select("fingerprint,count,paid,plan")
      .eq("fingerprint", fingerprint)
      .limit(1);
    console.log("FP lookup:", JSON.stringify({ data, error: error?.message }));
    if (data && data.length > 0) {
      const rec = data[0];
      const updateData = { count: (rec.count || 0) + 1, last_used: new Date().toISOString() };
      if (email) updateData.email = email;
      const { error: ue } = await supabase.from("usage").update(updateData).eq("fingerprint", fingerprint);
      console.log("Update by fp:", ue?.message || "ok");
      return { updated: fingerprint, newCount: (rec.count || 0) + 1 };
    }
  }

  // 3. Create new
  const newFp = fingerprint || "anl_" + Math.random().toString(36).slice(2);
  const insertData = { fingerprint: newFp, count: 1, paid: false, plan: "free", last_used: new Date().toISOString() };
  if (email) insertData.email = email;
  const { error: ie } = await supabase.from("usage").upsert(insertData, { onConflict: "fingerprint" });
  console.log("Insert new:", ie?.message || "ok", JSON.stringify(insertData));
  return { inserted: newFp };
}

// Minimal prompt — every token saved = faster response
const SYSTEM_PROMPT = `Senior hiring manager. Score resume vs job description. Return ONLY valid JSON, no markdown.

JSON structure:
{"score":7,"scoreRationale":"2 sentences.","sections":[{"category":"Keyword Match","icon":"search","rating":"moderate","summary":"1 sentence.","details":["x","x","x"]},{"category":"Work Experience","icon":"briefcase","rating":"strong","summary":"1 sentence.","details":["x","x","x"]},{"category":"Skills Alignment","icon":"zap","rating":"moderate","summary":"1 sentence.","details":["x","x","x"]},{"category":"Impact & Metrics","icon":"trending-up","rating":"weak","summary":"1 sentence.","details":["x","x","x"]},{"category":"Formatting & Clarity","icon":"layout","rating":"strong","summary":"1 sentence.","details":["x","x","x"]},{"category":"Quick Wins","icon":"star","rating":"strong","summary":"Top changes.","details":["x","x","x"]}],"corrections":[{"section":"s","original":"exact text","improved":"rewrite","why":"reason"},{"section":"s","original":"exact text","improved":"rewrite","why":"reason"},{"section":"s","original":"exact text","improved":"rewrite","why":"reason"}],"coverLetter":"120 words. Dear Hiring Manager, [body]. Sincerely.","hiringManagerNote":"5-6 lines. Direct, specific, no generic openers.","whyBestCandidate":"4 lines separated by \\n. Label: evidence — relevance."}

Rules: score 4-7 for most resumes. rating values: strong/moderate/weak only. corrections: rewrite only existing resume text.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-fp, x-email, x-admin-token");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = new IncomingForm({ keepExtensions: true });
  const [fields, files] = await new Promise((resolve, reject) => {
    form.parse(req, (err, f, fi) => err ? reject(err) : resolve([f, fi]));
  });

  const jobDescription = Array.isArray(fields.jobDescription) ? fields.jobDescription[0] : fields.jobDescription;
  const resumeFile = Array.isArray(files.resume) ? files.resume[0] : files.resume;

  if (!resumeFile) return res.status(400).json({ error: "Please upload a resume file." });
  if (!jobDescription || jobDescription.trim().length < 20)
    return res.status(400).json({ error: "Please paste a job description." });

  const fingerprint = req.headers["x-fp"] || "unknown";
  const emailHeader = req.headers["x-email"] || null;
  const adminToken = req.headers["x-admin-token"] || null;
  const isAdmin = adminToken && adminToken === process.env.ADMIN_TOKEN;

  // Email required (except admin)
  if (!emailHeader && !isAdmin) {
    return res.status(401).json({ error: "Please sign in with your email to use Resume Wizard." });
  }

  let resumeText;
  try {
    const buffer = await readFile(resumeFile.filepath);
    resumeText = await extractText(buffer, resumeFile.mimetype, resumeFile.originalFilename || "resume.txt");
  } catch (err) {
    return res.status(400).json({ error: err.message || "Could not read the file." });
  }

  if (resumeText.trim().length < 50)
    return res.status(400).json({ error: "Resume appears empty or unreadable." });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const ping = setInterval(() => {
    try { res.write("event: ping\ndata: {}\n\n"); } catch (_) {}
  }, 4000);

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      clearInterval(ping);
      res.write(`event: error\ndata: ${JSON.stringify({ error: "API key not configured." })}\n\n`);
      return res.end();
    }

    const client = new Anthropic({ apiKey });

    // Single non-streaming call — simpler, more reliable, ~5-10s for Haiku
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `RESUME:\n${resumeText.slice(0, 2500)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 2500)}`
      }]
    });

    const fullText = message.content[0]?.text || "";

    // Extract JSON
    let jsonStr = fullText.replace(/^```json?\s*/i, "").replace(/```\s*$/g, "").trim();
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start === -1) throw new Error("AI did not return valid JSON. Please try again.");
    jsonStr = jsonStr.slice(start, end + 1);

    // Parse with repair fallback
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      let repaired = jsonStr;
      let openBraces = 0, openBrackets = 0, inStr = false, escape = false;
      for (const ch of repaired) {
        if (escape) { escape = false; continue; }
        if (ch === "\\" && inStr) { escape = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === "{") openBraces++;
        if (ch === "}") openBraces--;
        if (ch === "[") openBrackets++;
        if (ch === "]") openBrackets--;
      }
      if (inStr) repaired += '"';
      repaired += "]".repeat(Math.max(0, openBrackets));
      repaired += "}".repeat(Math.max(0, openBraces));
      try { parsed = JSON.parse(repaired); }
      catch { throw new Error("Analysis response was incomplete. Please try again."); }
    }

    if (!parsed.score || !parsed.sections) throw new Error("Incomplete analysis. Please try again.");

    // Increment usage server-side
    if (!isAdmin) {
      const result = await incrementUsage(fingerprint, emailHeader);
      console.log("Usage increment result:", JSON.stringify(result));
    }

    clearInterval(ping);
    res.write(`event: result\ndata: ${JSON.stringify({
      score: parsed.score,
      scoreRationale: parsed.scoreRationale,
      sections: parsed.sections,
      corrections: parsed.corrections || [],
      coverLetter: parsed.coverLetter || "",
      hiringManagerNote: parsed.hiringManagerNote || "",
      whyBestCandidate: parsed.whyBestCandidate || "",
    })}\n\n`);
    res.end();

  } catch (err) {
    console.error("Analyze error:", err);
    clearInterval(ping);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err?.message || "Analysis failed. Please try again." })}\n\n`);
    res.end();
  }
}
