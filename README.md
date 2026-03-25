# Resume Wizard 🧙

An AI-powered resume analyzer that scores your resume against a job description, gives actionable corrections, and generates a tailored cover letter.

## What it does

1. **Upload your resume** — PDF, DOCX, or TXT
2. **Paste a job description** — any role, any company
3. **Get instant analysis:**
   - **Match Score** (1–10) with rationale
   - **6-category feedback** — Keywords, Experience, Skills, Impact, Formatting, Quick Wins
   - **Resume Corrections** — before/after edits grounded in what's already on your resume (nothing fabricated)
   - **Cover Letter** — tailored 1-pager you can copy or download

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express |
| AI | Anthropic Claude (Haiku) |
| File parsing | pdftotext (PDF), mammoth (DOCX) |
| Build | Vite |

## Running locally

```bash
# Install dependencies
npm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY=your_key_here

# Start dev server
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

## Project Structure

```
├── server/
│   ├── routes.ts      # API endpoints — file parsing + Claude AI call
│   └── storage.ts     # SQLite persistence layer
├── client/src/
│   ├── pages/Home.tsx # Full UI — input form, results, tabs
│   └── index.css      # Custom design system (light + dark mode)
└── shared/
    └── schema.ts      # Shared data types
```

## Key design decisions

- **Claude Haiku** — fast enough for sub-10s response within proxy timeout limits
- **Corrections are grounded** — the AI prompt explicitly instructs: never invent experience, only rephrase what exists
- **Single API call** — score + feedback + corrections + cover letter all returned in one structured JSON response to minimize latency

## Built with

[Perplexity Computer](https://www.perplexity.ai/computer)
