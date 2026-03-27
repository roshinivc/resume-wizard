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

// Increment usage count server-side (reliable — not dependent on frontend callback)
async function incrementUsage(fingerprint, emailHeader) {
  try {
    // Look up existing record
    let data = null;
    if (emailHeader) {
      const { data: emailData } = await supabase
        .from("usage").select("fingerprint, count, paid, plan, email")
        .eq("email", emailHeader).order("last_used", { ascending: false }).limit(1).single();
      data = emailData;
    }
    if (!data) {
      const { data: fpData } = await supabase
        .from("usage").select("fingerprint, count, paid, plan, email")
        .eq("fingerprint", fingerprint).single();
      data = fpData;
    }

    if (data) {
      const newCount = (data.count || 0) + 1;
      const updateBy = data.email ? { col: "email", val: data.email } : { col: "fingerprint", val: data.fingerprint || fingerprint };
      await supabase.from("usage")
        .update({ count: newCount, last_used: new Date().toISOString() })
        .eq(updateBy.col, updateBy.val);
    } else {
      await supabase.from("usage").insert({
        fingerprint,
        count: 1,
        paid: false,
        plan: "free",
        last_used: new Date().toISOString(),
        ...(emailHeader ? { email: emailHeader } : {}),
      });
    }
  } catch (e) {
    console.error("Usage increment error:", e.message);
  }
}

// Compact prompt — shorter output = faster response = no timeout
const SYSTEM_PROMPT = `You are a senior hiring manager scoring resumes against job descriptions.

SCORING: 9-10=80%+ match. 7-8=good, 2-3 gaps. 5-6=partial. 3-4=weak. 1-2=poor. Most score 4-7.
CORRECTIONS: Only rewrite text already in the resume. Never invent anything.
Return ONLY valid JSON, no markdown.

{
  "score": 6,
  "scoreRationale": "Two sentences max.",
  "sections": [
    {"category":"Keyword Match","icon":"search","rating":"moderate","summary":"One sentence.","details":["Point 1.","Point 2.","Point 3."]},
    {"category":"Work Experience","icon":"briefcase","rating":"strong","summary":"One sentence.","details":["Point 1.","Point 2.","Point 3."]},
    {"category":"Skills Alignment","icon":"zap","rating":"moderate","summary":"One sentence.","details":["Point 1.","Point 2.","Point 3."]},
    {"category":"Impact & Metrics","icon":"trending-up","rating":"weak","summary":"One sentence.","details":["Point 1.","Point 2.","Point 3."]},
    {"category":"Formatting & Clarity","icon":"layout","rating":"strong","summary":"One sentence.","details":["Point 1.","Point 2.","Point 3."]},
    {"category":"Quick Wins","icon":"star","rating":"strong","summary":"Top 3 changes.","details":["Change 1.","Change 2.","Change 3."]}
  ],
  "corrections": [
    {"section":"Section name","original":"Exact text from resume.","improved":"Rewritten version.","why":"One sentence."}
  ],
  "coverLetter": "150-word cover letter. Dear Hiring Manager, [body]. Sincerely, [name]",
  "hiringManagerNote": "6-8 lines. Direct, confident, specific to this role. No generic openers.",
  "whyBestCandidate": "4-5 lines separated by \\n. Each: Label: Evidence — Why it matters."
}

Provide exactly 3 corrections. Ratings must be: strong, moderate, or weak.`;

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

  // Get fingerprint + email from headers (passed by frontend)
  const fingerprint = req.headers["x-fp"] || "unknown";
  const emailHeader = req.headers["x-email"] || null;
  const adminToken = req.headers["x-admin-token"] || null;
  const isAdmin = adminToken && adminToken === process.env.ADMIN_TOKEN;

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
    let fullText = "";

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `RESUME:\n${resumeText.slice(0, 1500)}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 1500)}`
      }]
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullText += event.delta.text;
        res.write(`event: token\ndata: ${JSON.stringify({ t: event.delta.text })}\n\n`);
      }
    }

    // Extract JSON — find first { and last }
    let jsonStr = fullText.replace(/^```json?\s*/i, "").replace(/```\s*$/g, "").trim();
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);

    if (!jsonStr || start === -1) {
      throw new Error("AI did not return valid JSON. Please try again.");
    }

    // Try parse — repair if truncated
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

    if (!parsed.score || !parsed.sections) {
      throw new Error("Incomplete analysis returned. Please try again.");
    }

    // Increment usage server-side (reliable — works even if browser closes)
    if (!isAdmin) {
      await incrementUsage(fingerprint, emailHeader);
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
    console.error("Error:", err);
    clearInterval(ping);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err?.message || "Analysis failed. Please try again." })}\n\n`);
    res.end();
  }
}
