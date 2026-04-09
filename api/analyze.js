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

Scoring: 9-10=rare perfect match. 7-8=good,1-2 gaps. 5-6=partial. 3-4=weak. 1-2=poor. Most resumes score 4-7. Do not inflate.
ATS checks: missing JD keywords, tables/columns, missing summary section, generic title vs JD title, acronyms not spelled out.

Return this JSON (exact field order, be specific and actionable in every field):
{"score":6,"scoreRationale":"2 specific sentences: biggest strength + biggest gap.","atsScore":65,"atsIssues":["Specific issue 1","Specific issue 2","Specific issue 3"],"coverLetter":"100 words. Dear Hiring Manager, [specific opening referencing role]. [2 sentences connecting real experience to this role]. Sincerely.","hiringManagerNote":"5-6 lines. Direct and specific. Opens with something from JD. 2 real achievements. Ends with ask for call.","whyBestCandidate":"4 lines separated by \\n. Each: Strength: evidence — why it matters for this role.","sections":[{"category":"Keyword Match","icon":"search","rating":"moderate","summary":"Which exact keywords from JD are missing or present.","details":["Specific finding 1","Specific finding 2","Specific finding 3"]},{"category":"Work Experience","icon":"briefcase","rating":"strong","summary":"Seniority and domain match to this role.","details":["Specific finding 1","Specific finding 2","Specific finding 3"]},{"category":"Skills Alignment","icon":"zap","rating":"moderate","summary":"Required skills present vs missing.","details":["Specific finding 1","Specific finding 2","Specific finding 3"]},{"category":"Impact & Metrics","icon":"trending-up","rating":"weak","summary":"Are achievements quantified with numbers?","details":["Specific finding 1","Specific finding 2","Specific finding 3"]},{"category":"ATS Compatibility","icon":"layout","rating":"strong","summary":"Will this resume pass ATS filters?","details":["Specific ATS finding 1","Specific ATS finding 2","Specific ATS finding 3"]},{"category":"Quick Wins","icon":"star","rating":"strong","summary":"3 highest-impact changes to make now.","details":["Actionable change 1","Actionable change 2","Actionable change 3"]}],"corrections":[{"section":"Section name","original":"Exact text from resume","improved":"Stronger rewrite with keywords","why":"Why this improves ATS and recruiter read"},{"section":"Section name","original":"Exact text","improved":"Stronger rewrite","why":"Reason"},{"section":"Section name","original":"Exact text","improved":"Stronger rewrite","why":"Reason"}]}
Rules: ratings=strong/moderate/weak only. corrections=only rewrite text that exists in the resume, never fabricate.`;

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
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `RESUME:\n${resumeText.slice(0, 2700)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 2900)}`
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
