// Vercel serverless function — streams response to avoid timeout
import Anthropic from "@anthropic-ai/sdk";
import { IncomingForm } from "formidable";
import { readFile } from "fs/promises";

export const config = {
  api: { bodyParser: false },
};

async function extractText(buffer, mimetype, filename) {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (mimetype === "application/pdf" || ext === "pdf") {
    const pdfParse = (await import("pdf-parse-fork")).default;
    const data = await pdfParse(buffer);
    return data.text;
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

const SYSTEM_PROMPT = `You are a brutally honest senior hiring manager. Analyze the resume against the job description and score it fairly using this strict scale:

SCORING RULES (follow exactly):
- 9-10: Near-perfect match. Almost every requirement met, strong metrics, right industry, right level.
- 7-8: Good match. Most requirements met but 2-3 meaningful gaps.
- 5-6: Partial match. Core skills present but significant gaps in experience, keywords, or level.
- 3-4: Weak match. Some transferable skills but major gaps. Would likely be filtered by ATS.
- 1-2: Poor match. Wrong industry, wrong level, or missing most requirements.

Most resumes score 4-7. Only give 8+ if the resume genuinely covers 80%+ of the JD requirements with evidence. Be honest — inflated scores help no one.

CORRECTIONS RULE: Only rewrite what is ALREADY TRUE in the resume. Never add skills or experience that don't exist.

Reply ONLY valid JSON, no markdown:
{"score":<1-10>,"scoreRationale":"<2 honest sentences explaining score and key gaps>","sections":[{"category":"Keyword Match","icon":"search","rating":"strong|moderate|weak","summary":"<brief>","details":["<point>","<point>","<point>"]},{"category":"Work Experience","icon":"briefcase","rating":"strong|moderate|weak","summary":"<brief>","details":["<point>","<point>","<point>"]},{"category":"Skills Alignment","icon":"zap","rating":"strong|moderate|weak","summary":"<brief>","details":["<point>","<point>","<point>"]},{"category":"Impact & Metrics","icon":"trending-up","rating":"strong|moderate|weak","summary":"<brief>","details":["<point>","<point>","<point>"]},{"category":"Formatting & Clarity","icon":"layout","rating":"strong|moderate|weak","summary":"<brief>","details":["<point>","<point>","<point>"]},{"category":"Quick Wins","icon":"star","rating":"strong","summary":"Top 3 highest-impact changes","details":["<change 1>","<change 2>","<change 3>"]}],"corrections":[{"section":"<section>","original":"<exact text from resume>","improved":"<rewrite — stronger, more aligned, still 100% truthful>","why":"<1 sentence>"}],"coverLetter":"<250 word cover letter, Dear Hiring Manager, specific to this JD and resume>"}`;

export default async function handler(req, res) {
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
    return res.status(400).json({ error: "Resume appears empty or unreadable." });

  // Stream SSE so Vercel doesn't timeout
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Keep-alive ping every 4s
  const ping = setInterval(() => {
    try { res.write("event: ping\ndata: {}\n\n"); } catch (_) {}
  }, 4000);

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      clearInterval(ping);
      res.write(`event: error\ndata: ${JSON.stringify({ error: "API key not configured. Please add ANTHROPIC_API_KEY in Vercel environment variables." })}\n\n`);
      return res.end();
    }

    const client = new Anthropic({ apiKey });

    let fullText = "";
    const stream = await client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `RESUME:\n${resumeText.slice(0, 4000)}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 2000)}`,
      }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullText += event.delta.text;
        res.write(`event: token\ndata: ${JSON.stringify({ t: event.delta.text })}\n\n`);
      }
    }

    const jsonStr = fullText.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(jsonStr);

    clearInterval(ping);
    res.write(`event: result\ndata: ${JSON.stringify({
      score: parsed.score,
      scoreRationale: parsed.scoreRationale,
      sections: parsed.sections,
      corrections: parsed.corrections || [],
      coverLetter: parsed.coverLetter || "",
    })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Error:", err);
    clearInterval(ping);
    const msg = err?.message || "Analysis failed. Please try again.";
    res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
}
