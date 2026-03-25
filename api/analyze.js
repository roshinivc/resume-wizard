// Vercel serverless function — handles file upload + AI analysis
import Anthropic from "@anthropic-ai/sdk";
import { IncomingForm } from "formidable";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

export const config = {
  api: { bodyParser: false }, // required for file uploads
};

async function extractText(buffer, mimetype, filename) {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (mimetype === "application/pdf" || ext === "pdf") {
    const tmpIn = join(tmpdir(), `resume_${Date.now()}.pdf`);
    const tmpOut = join(tmpdir(), `resume_${Date.now()}.txt`);
    try {
      const { writeFile } = await import("fs/promises");
      await writeFile(tmpIn, buffer);
      await execFileAsync("pdftotext", ["-layout", tmpIn, tmpOut]);
      return await readFile(tmpOut, "utf-8");
    } finally {
      await unlink(tmpIn).catch(() => {});
      await unlink(tmpOut).catch(() => {});
    }
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ buffer });
    return result.value;
  }

  if (mimetype === "text/plain" || ext === "txt") {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
}

const SYSTEM_PROMPT = `You are a senior hiring manager and resume coach. Analyze the resume against the job description.

IMPORTANT RULES for corrections:
- Only suggest changes based on what is ALREADY TRUE in the resume
- Never invent experience, skills, or achievements the candidate doesn't have
- Rephrase existing content to be stronger, more quantified, and more aligned with JD language

Respond with ONLY valid JSON, no markdown fences:
{
  "score": <1-10>,
  "scoreRationale": "<2-3 sentences>",
  "sections": [
    {"category":"Keyword Match","icon":"search","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<point>","<point>","<point>"]},
    {"category":"Work Experience","icon":"briefcase","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<point>","<point>","<point>"]},
    {"category":"Skills Alignment","icon":"zap","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<point>","<point>","<point>"]},
    {"category":"Impact & Metrics","icon":"trending-up","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<point>","<point>","<point>"]},
    {"category":"Formatting & Clarity","icon":"layout","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<point>","<point>","<point>"]},
    {"category":"Quick Wins","icon":"star","rating":"strong","summary":"Top 3 highest-impact changes","details":["<change 1>","<change 2>","<change 3>"]}
  ],
  "corrections": [
    {"section":"<resume section>","original":"<exact text>","improved":"<rewritten — stronger, still truthful>","why":"<1 sentence>"}
  ],
  "coverLetter": "<full cover letter, 3-4 paragraphs, Dear Hiring Manager, ~300 words, specific to this JD and resume>"
}`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Parse multipart form
  const form = new IncomingForm({ keepExtensions: true });
  const [fields, files] = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });

  const jobDescription = Array.isArray(fields.jobDescription)
    ? fields.jobDescription[0]
    : fields.jobDescription;
  const resumeFile = Array.isArray(files.resume) ? files.resume[0] : files.resume;

  if (!resumeFile) return res.status(400).json({ error: "Please upload a resume file." });
  if (!jobDescription || jobDescription.trim().length < 20)
    return res.status(400).json({ error: "Please paste a job description." });

  let resumeText;
  try {
    const buffer = await readFile(resumeFile.filepath);
    resumeText = await extractText(buffer, resumeFile.mimetype, resumeFile.originalFilename || "resume.txt");
  } catch (err) {
    return res.status(400).json({ error: err.message || "Could not read the file." });
  }

  if (resumeText.trim().length < 50)
    return res.status(400).json({ error: "The resume file appears to be empty or unreadable." });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `RESUME:\n${resumeText.slice(0, 6000)}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 3000)}`,
      }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim());

    return res.json({
      score: parsed.score,
      scoreRationale: parsed.scoreRationale,
      sections: parsed.sections,
      corrections: parsed.corrections || [],
      coverLetter: parsed.coverLetter || "",
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Analysis failed. Please try again." });
  }
}
