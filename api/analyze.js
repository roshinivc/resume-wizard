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

// Same hash as usage.js — email always maps to same fingerprint
function emailToFp(email) {
  let hash = 5381;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) + hash) + email.charCodeAt(i);
    hash |= 0;
  }
  return "em_" + Math.abs(hash).toString(36);
}

async function incrementUsage(email) {
  if (!email) return;
  const fp = emailToFp(email);

  const { data: rows } = await supabase.from("usage").select("fingerprint, count").eq("fingerprint", fp).limit(1);

  if (rows && rows.length > 0) {
    const rec = rows[0];
    await supabase.from("usage").update({ count: (rec.count || 0) + 1, last_used: new Date().toISOString() }).eq("fingerprint", fp);
  } else {
    await supabase.from("usage").insert({ fingerprint: fp, email, count: 1, paid: false, plan: "free", last_used: new Date().toISOString() });
  }
}

// Balanced prompt — quality feedback within Vercel 30s limit
const SYSTEM_PROMPT = `You are a strict, experienced recruiter and ATS expert. Analyze the resume against the job description. Be specific — name actual missing keywords, actual skill gaps, actual title mismatches. No generic feedback. Return ONLY valid JSON, no markdown.
CRITICAL: Never fabricate or extrapolate experience. Every claim in cover letter, manager note, and why best candidate MUST be grounded in explicit resume content. If the resume doesn't mention LED displays, do not claim LED experience. Be honest about gaps.

Scoring: 9-10=rare perfect match. 7-8=good,1-2 gaps. 5-6=partial. 3-4=weak. 1-2=poor. Most resumes score 4-7. Do not inflate.
ATS checks: missing JD keywords, tables/columns, missing summary section, generic title vs JD title, acronyms not spelled out.

Return this JSON in EXACTLY this field order (corrections and cover letter MUST come before sections):
{"score":6,"scoreRationale":"2 sentences: strength + gap.","atsScore":65,"atsIssues":["Issue 1","Issue 2","Issue 3"],"corrections":[{"section":"Section","original":"Exact text from resume","improved":"Rewrite with JD keywords","why":"Why this helps"},{"section":"Section","original":"Exact text","improved":"Rewrite","why":"Why"},{"section":"Section","original":"Exact text","improved":"Rewrite","why":"Why"}],"coverLetter":"90 words written BY THE CANDIDATE. ONLY use skills and experience actually in the resume. Dear Hiring Manager, [opening specific to this role]. [1-2 sentences connecting REAL resume experience to role requirements — do not invent]. [Closing]. Sincerely, [candidate name].","hiringManagerNote":"5-6 lines written BY THE CANDIDATE to the hiring manager. First person (I). ONLY reference skills and achievements that are explicitly stated in the resume — do NOT extrapolate or claim experience that is not in the resume. Opens with something specific from the JD. Honestly connects 2 real resume achievements to the role. If the match is weak, acknowledge the transferable skills honestly. Ends with asking for a conversation.","whyBestCandidate":"3 lines separated by \\n. Strength: evidence — relevance.","sections":[{"category":"Keyword Match","icon":"search","rating":"moderate","summary":"Exact missing/present JD keywords.","details":["Finding 1","Finding 2","Finding 3"]},{"category":"Work Experience","icon":"briefcase","rating":"strong","summary":"Seniority and domain match.","details":["Finding 1","Finding 2","Finding 3"]},{"category":"Skills Alignment","icon":"zap","rating":"moderate","summary":"Required skills present vs missing.","details":["Finding 1","Finding 2","Finding 3"]},{"category":"Impact & Metrics","icon":"trending-up","rating":"weak","summary":"Quantified achievements?","details":["Finding 1","Finding 2","Finding 3"]},{"category":"ATS Compatibility","icon":"layout","rating":"strong","summary":"ATS pass likelihood.","details":["ATS finding 1","ATS finding 2","ATS finding 3"]},{"category":"Quick Wins","icon":"star","rating":"strong","summary":"Top 3 changes.","details":["Change 1","Change 2","Change 3"]}]}
Rules: ratings=strong/moderate/weak. corrections=only rewrite existing resume text, never add fabricated content.`;

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
        content: `RESUME:\n${resumeText.slice(0, 1800)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 1800)}`
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

    // Be lenient — if we got a score we have enough to show something
    if (!parsed.score) throw new Error("Incomplete analysis. Please try again.");
    // Default missing fields
    parsed.sections = parsed.sections || [];
    parsed.corrections = parsed.corrections || [];
    parsed.atsIssues = parsed.atsIssues || [];

    // Increment usage server-side
    if (!isAdmin) await incrementUsage(emailHeader);

    clearInterval(ping);
    res.write(`event: result\ndata: ${JSON.stringify({
      score: parsed.score,
      scoreRationale: parsed.scoreRationale,
      atsScore: parsed.atsScore ?? null,
      atsIssues: parsed.atsIssues || [],
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
