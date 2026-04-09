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

// Strict, ATS-aware prompt
const SYSTEM_PROMPT = `You are a brutally honest senior recruiter and ATS expert. Analyze this resume against the job description. Be direct, specific, and strict. Do not inflate scores. Return ONLY valid JSON, no markdown, no commentary.

SCORING RULES:
- 9-10: Near-perfect match. Rare. Every key requirement met with strong evidence.
- 7-8: Good match. Most requirements met. 1-2 gaps.
- 5-6: Partial match. Core skills present but meaningful gaps exist.
- 3-4: Weak match. Missing critical requirements.
- 1-2: Poor match. Wrong experience level or domain.
- Most resumes score 4-7. Be honest, not encouraging.

ATS RULES TO CHECK:
- Missing keywords from JD = ATS fail
- Tables, columns, headers/footers = ATS parsing failure
- Images, graphics, icons = ATS cannot read
- Generic job titles vs JD titles = keyword mismatch
- Acronyms without spelling out = missed matches
- Missing sections (Summary, Skills, Experience, Education) = incomplete
- File format issues if detected

Return this exact JSON structure:
{"score":6,"scoreRationale":"2 blunt sentences. State the biggest strength and biggest gap.","atsScore":62,"atsIssues":["Specific ATS issue 1","Specific ATS issue 2","Specific ATS issue 3"],"sections":[{"category":"Keyword Match","icon":"search","rating":"moderate","summary":"Which exact keywords from JD are missing.","details":["Specific finding 1","Specific finding 2","Specific finding 3"]},{"category":"Work Experience","icon":"briefcase","rating":"strong","summary":"Does their seniority and domain match?","details":["Specific finding 1","Specific finding 2","Specific finding 3"]},{"category":"Skills Alignment","icon":"zap","rating":"moderate","summary":"Which required skills are present vs missing.","details":["Specific finding 1","Specific finding 2","Specific finding 3"]},{"category":"Impact & Metrics","icon":"trending-up","rating":"weak","summary":"Are achievements quantified or vague?","details":["Specific finding 1","Specific finding 2","Specific finding 3"]},{"category":"ATS Compatibility","icon":"layout","rating":"strong","summary":"Will this resume pass ATS filters?","details":["Specific ATS finding 1","Specific ATS finding 2","Specific ATS finding 3"]},{"category":"Quick Wins","icon":"star","rating":"strong","summary":"Top 3 changes with highest ROI.","details":["Specific actionable change 1","Specific actionable change 2","Specific actionable change 3"]}],"corrections":[{"section":"Section name","original":"Exact text from resume","improved":"Stronger rewrite with keywords and metrics","why":"Why this change improves ATS score and recruiter read"},{"section":"Section name","original":"Exact text","improved":"Rewrite","why":"Reason"},{"section":"Section name","original":"Exact text","improved":"Rewrite","why":"Reason"}],"coverLetter":"150 words max. Dear Hiring Manager, [opening that references specific role requirement]. [2-3 sentences connecting real experience to role needs]. [Closing ask]. Sincerely.","hiringManagerNote":"6-8 lines. Direct message. Opens with something specific from the JD. Connects 2 real achievements to role needs. Ends with ask for call. No generic phrases.","whyBestCandidate":"5 lines separated by \\n. Each: Specific strength: Specific evidence from resume — Why it matters for this exact role."}

CRITICAL RULES:
- rating values MUST be exactly: strong, moderate, or weak
- corrections MUST only rewrite text that exists in the resume — never fabricate
- atsScore is 0-100 (percentage likelihood of passing ATS filters)
- Be specific: name actual missing keywords, actual job titles, actual skills gaps`;

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
        content: `RESUME:\n${resumeText.slice(0, 3500)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 3500)}`
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
