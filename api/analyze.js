import Anthropic from "@anthropic-ai/sdk";
import { IncomingForm } from "formidable";
import { readFile } from "fs/promises";

export const config = { api: { bodyParser: false } };

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

const SYSTEM_PROMPT = `You are a brutally honest senior hiring manager scoring resumes against job descriptions.

SCORING SCALE — follow strictly:
9-10: Near-perfect. 80%+ requirements met with evidence, right level, right industry.
7-8: Good match. Most requirements met but 2-3 clear gaps.
5-6: Partial. Core skills present but significant gaps in keywords or experience.
3-4: Weak. Some transferable skills but major gaps, ATS would likely filter.
1-2: Poor. Wrong industry, wrong level, or missing most requirements.
Important: Most resumes score 4-7. Only give 8+ if genuinely 80%+ match. Inflated scores help no one.

CORRECTIONS: Only rewrite text that is ALREADY in the resume. Never invent skills or experience.

Return ONLY a valid JSON object. No markdown, no explanation outside JSON.

The JSON must follow this exact structure:
{
  "score": 6,
  "scoreRationale": "Two sentences explaining the score and main gaps.",
  "sections": [
    {
      "category": "Keyword Match",
      "icon": "search",
      "rating": "moderate",
      "summary": "One sentence summary.",
      "details": ["Point 1.", "Point 2.", "Point 3."]
    },
    {
      "category": "Work Experience",
      "icon": "briefcase",
      "rating": "strong",
      "summary": "One sentence summary.",
      "details": ["Point 1.", "Point 2.", "Point 3."]
    },
    {
      "category": "Skills Alignment",
      "icon": "zap",
      "rating": "moderate",
      "summary": "One sentence summary.",
      "details": ["Point 1.", "Point 2.", "Point 3."]
    },
    {
      "category": "Impact & Metrics",
      "icon": "trending-up",
      "rating": "weak",
      "summary": "One sentence summary.",
      "details": ["Point 1.", "Point 2.", "Point 3."]
    },
    {
      "category": "Formatting & Clarity",
      "icon": "layout",
      "rating": "strong",
      "summary": "One sentence summary.",
      "details": ["Point 1.", "Point 2.", "Point 3."]
    },
    {
      "category": "Quick Wins",
      "icon": "star",
      "rating": "strong",
      "summary": "Top 3 highest-impact changes.",
      "details": ["Change 1.", "Change 2.", "Change 3."]
    }
  ],
  "corrections": [
    {
      "section": "Which resume section",
      "original": "Exact original text copied from the resume.",
      "improved": "Rewritten version — stronger, more aligned with JD language, still 100% grounded in the original. Uses the same facts, same numbers, same role — just rephrased to be clearer and more impactful.",
      "merged": "The final ready-to-use sentence that combines the strongest parts of both original and improved. This is what the candidate should paste directly into their resume. It must sound like the candidate wrote it, not AI. Every fact, number, and achievement must come from the original text only.",
      "why": "One sentence explaining what changed and why it strengthens the resume for this specific JD."
    }
  ],
  "coverLetter": "Full 250-word cover letter starting with Dear Hiring Manager, tailored to this specific job description using actual experience from the resume.",
  "hiringManagerNote": "A concise 8-10 line direct message to the hiring manager. Conversational, confident, not a cover letter. Opens with one specific thing about the company or role that genuinely excites the candidate based on the JD. Then connects 2-3 specific achievements from the resume directly to what the role needs. Closes with a clear ask for a conversation. No generic phrases like 'I am writing to express my interest'. Sounds like a real person, not a template.",
  "whyBestCandidate": "5-6 lines separated by newline characters (\\n). Each line is one reason why this candidate is the best fit. Format each line as: Strength label: Evidence from resume — Why it matters for this specific role. No bullet symbols, no markdown, just plain text lines separated by \\n."
}

Replace the example values with real analysis. Provide 3-4 corrections. Rating values must be exactly: strong, moderate, or weak.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `RESUME:\n${resumeText.slice(0, 4000)}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 2000)}`
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

    const parsed = JSON.parse(jsonStr);

    clearInterval(ping);
    res.write(`event: result\ndata: ${JSON.stringify({
      score: parsed.score,
      scoreRationale: parsed.scoreRationale,
      sections: parsed.sections,
      corrections: (parsed.corrections || []).map((c) => ({
        section: c.section,
        original: c.original,
        improved: c.improved,
        merged: c.merged || "",
        why: c.why,
      })),
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
