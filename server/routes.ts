import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import mammoth from "mammoth";
import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const client = new Anthropic();

async function extractText(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (mimetype === "application/pdf" || ext === "pdf") {
    const tmpIn = join(tmpdir(), `resume_${Date.now()}.pdf`);
    const tmpOut = join(tmpdir(), `resume_${Date.now()}.txt`);
    try {
      await writeFile(tmpIn, buffer);
      await execFileAsync("pdftotext", ["-layout", tmpIn, tmpOut]);
      const text = await readFile(tmpOut, "utf-8");
      return text;
    } finally {
      await unlink(tmpIn).catch(() => {});
      await unlink(tmpOut).catch(() => {});
    }
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimetype === "text/plain" || ext === "txt") {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
}

export function registerRoutes(httpServer: Server, app: Express) {

  // Main analysis — score + feedback + corrections + cover letter all in one call
  app.post("/api/analyze", upload.single("resume"), async (req, res) => {
    const { jobDescription } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Please upload a resume file (PDF, DOCX, or TXT)." });
    if (!jobDescription || jobDescription.trim().length < 20) return res.status(400).json({ error: "Please paste a job description." });

    let resumeText: string;
    try {
      resumeText = await extractText(file.buffer, file.mimetype, file.originalname);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Could not read the file." });
    }

    if (resumeText.trim().length < 50) return res.status(400).json({ error: "The resume file appears to be empty or unreadable." });

    const SYSTEM_PROMPT = `You are a senior hiring manager and resume coach. Analyze the resume against the job description.

IMPORTANT RULES for corrections:
- Only suggest changes based on what is ALREADY TRUE in the resume
- Never invent experience, skills, or achievements the candidate doesn't have
- Rephrase existing content to be stronger, more quantified, and more aligned with JD language
- Reorder or restructure bullets to lead with the most relevant experience
- Suggest adding context that the candidate likely has but forgot to mention (e.g. team size, tools used)

Respond with ONLY valid JSON, no markdown fences:
{
  "score": <1-10>,
  "scoreRationale": "<2-3 sentences>",
  "sections": [
    {"category":"Keyword Match","icon":"search","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<specific point>","<specific point>","<specific point>"]},
    {"category":"Work Experience","icon":"briefcase","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<specific point>","<specific point>","<specific point>"]},
    {"category":"Skills Alignment","icon":"zap","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<specific point>","<specific point>","<specific point>"]},
    {"category":"Impact & Metrics","icon":"trending-up","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<specific point>","<specific point>","<specific point>"]},
    {"category":"Formatting & Clarity","icon":"layout","rating":"strong|moderate|weak","summary":"<1 sentence>","details":["<specific point>","<specific point>","<specific point>"]},
    {"category":"Quick Wins","icon":"star","rating":"strong","summary":"Top 3 highest-impact changes","details":["<change 1>","<change 2>","<change 3>"]}
  ],
  "corrections": [
    {
      "section": "<which resume section, e.g. 'Work Experience — Acme Corp'>",
      "original": "<exact text from resume to change>",
      "improved": "<rewritten version — stronger, more aligned with JD, still 100% truthful>",
      "why": "<1 sentence explaining what makes the improved version better>"
    }
  ],
  "coverLetter": "<full professional cover letter, 3-4 paragraphs, addressed 'Dear Hiring Manager', tailored to this specific JD, referencing the candidate's actual experience. Compelling opening, specific achievements from resume, closing with call to action. Do NOT use filler phrases like 'I am writing to express my interest'. Make it feel human and specific.>"
}

Provide 4-6 corrections covering the most impactful changes. The cover letter should be ~300 words.`;

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `RESUME:\n${resumeText.slice(0, 6000)}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 3000)}`
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
      console.error("LLM error:", err);
      return res.status(500).json({ error: "Analysis failed. Please try again." });
    }
  });
}
