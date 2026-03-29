import Anthropic from "@anthropic-ai/sdk";
import { IncomingForm } from "formidable";
import { readFile } from "fs/promises";

export const config = { api: { bodyParser: false } };

// ── Text extraction (reuses same logic as analyze.js) ────────────────────────
async function extractText(buffer, mimetype, filename) {
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  if (mimetype === "application/pdf" || ext === "pdf") {
    const pdfParse = (await import("pdf-parse-fork")).default;
    return (await pdfParse(buffer)).text;
  }
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = await import("mammoth");
    return (await mammoth.default.extractRawText({ buffer })).value;
  }
  if (mimetype === "text/plain" || ext === "txt") return buffer.toString("utf-8");
  throw new Error(`Unsupported file type: ${ext}. Upload PDF, DOCX, or TXT.`);
}

// ── Scoring prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert technical recruiter and hiring advisor.
Score the candidate resume against the job description. Return ONLY valid JSON, no markdown.

JSON structure:
{"score":8.5,"recommendation":"STRONG MATCH","summary":"2-3 sentence executive summary for hiring manager.","strengths":["strength 1","strength 2","strength 3"],"gaps":["gap 1","gap 2"],"transferable_skills":["skill from another domain that applies"],"reason":"1-2 sentence reason for the score."}

Recommendation values: STRONG MATCH, GOOD FIT, PARTIAL FIT, NOT A FIT
Score guide: 9-10 exceptional, 7-8 strong, 5-6 partial, 3-4 weak, 1-2 not a fit
Return ONLY valid JSON. No extra text.`;

async function scoreCandidate(client, resumeText, jobDescription, candidateName) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `CANDIDATE: ${candidateName}\n\nRESUME:\n${resumeText.slice(0, 3000)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 2500)}`
    }]
  });

  const raw = message.content[0]?.text || "";
  let jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/g, "").trim();
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}") + 1;
  if (start === -1) throw new Error("Invalid response from AI");
  jsonStr = jsonStr.slice(start, end);
  return JSON.parse(jsonStr);
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-email, x-admin-token");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured." });

  // Parse multipart form — multiple resume files + job description
  const form = new IncomingForm({ keepExtensions: true, multiples: true });
  const [fields, files] = await new Promise((resolve, reject) => {
    form.parse(req, (err, f, fi) => err ? reject(err) : resolve([f, fi]));
  });

  const jobDescription = Array.isArray(fields.jobDescription)
    ? fields.jobDescription[0]
    : fields.jobDescription;
  const jobId = Array.isArray(fields.jobId) ? fields.jobId[0] : (fields.jobId || "JOB");

  if (!jobDescription || jobDescription.trim().length < 20)
    return res.status(400).json({ error: "Please paste a job description (at least 20 characters)." });

  // Collect all uploaded resume files
  let resumeFiles = files.resumes;
  if (!resumeFiles) return res.status(400).json({ error: "Please upload at least one resume." });
  if (!Array.isArray(resumeFiles)) resumeFiles = [resumeFiles];
  if (resumeFiles.length === 0) return res.status(400).json({ error: "No resumes received." });
  if (resumeFiles.length > 20) return res.status(400).json({ error: "Maximum 20 resumes per batch." });

  const client = new Anthropic({ apiKey });
  const results = [];
  const errors = [];

  // Score each resume sequentially (parallel would hit rate limits)
  for (const file of resumeFiles) {
    const name = (file.originalFilename || file.newFilename || "Unknown")
      .replace(/\.(pdf|docx|txt)$/i, "")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();

    try {
      const buffer = await readFile(file.filepath);
      const resumeText = await extractText(buffer, file.mimetype, file.originalFilename);

      if (resumeText.trim().length < 50) {
        errors.push({ name, error: "Resume appears empty or unreadable." });
        continue;
      }

      const scored = await scoreCandidate(client, resumeText, jobDescription, name);
      results.push({
        name,
        file: file.originalFilename || name,
        score: parseFloat(scored.score) || 0,
        score_label: `${parseFloat(scored.score || 0).toFixed(1)} / 10`,
        recommendation: scored.recommendation || "UNKNOWN",
        summary: scored.summary || "",
        strengths: scored.strengths || [],
        gaps: scored.gaps || [],
        transferable_skills: scored.transferable_skills || [],
        reason: scored.reason || "",
      });
    } catch (err) {
      console.error(`Error scoring ${name}:`, err);
      errors.push({ name, error: err.message || "Scoring failed." });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return res.status(200).json({
    jobId,
    totalProcessed: results.length,
    totalErrors: errors.length,
    candidates: results,
    errors,
  });
}
