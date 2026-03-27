import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { API_BASE } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Briefcase, Zap, TrendingUp, Layout, Star, Search,
  ChevronDown, ChevronUp, Loader2, Moon, Sun, RotateCcw,
  UploadCloud, X, CheckCircle2, ArrowRight, Copy, Check, Download
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedbackSection {
  category: string;
  icon: string;
  rating: "strong" | "moderate" | "weak";
  summary: string;
  details: string[];
}

interface Correction {
  section: string;
  original: string;
  improved: string;
  why: string;
}

interface AnalysisResult {
  score: number;
  scoreRationale: string;
  sections: FeedbackSection[];
  corrections: Correction[];
  coverLetter: string;
  hiringManagerNote: string;
  whyBestCandidate: string;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search, briefcase: Briefcase, zap: Zap,
  "trending-up": TrendingUp, layout: Layout, star: Star, "file-text": FileText,
};

const RATING_CONFIG = {
  strong:   { label: "Strong",     className: "badge-strong" },
  moderate: { label: "Moderate",   className: "badge-moderate" },
  weak:     { label: "Needs Work", className: "badge-weak" },
};

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 54, circ = 2 * Math.PI * r;
  const color = score >= 8 ? "#22c55e" : score >= 6 ? "#f59e0b" : "#ef4444";
  return (
    <svg viewBox="0 0 128 128" width="160" height="160" className="mx-auto">
      <circle cx="64" cy="64" r={r} fill="none" stroke="var(--ring-bg)" strokeWidth="10" />
      <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${circ * score / 10} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
      <text x="64" y="58" textAnchor="middle" fontSize="30" fontWeight="700" fill={color} fontFamily="inherit">{score}</text>
      <text x="64" y="78" textAnchor="middle" fontSize="13" fill="var(--color-text-muted)" fontFamily="inherit">/ 10</text>
    </svg>
  );
}

// ─── Feedback Card ────────────────────────────────────────────────────────────

function FeedbackCard({ section }: { section: FeedbackSection }) {
  const [open, setOpen] = useState(true);
  const IconComp = ICON_MAP[section.icon] ?? FileText;
  const { label, className } = RATING_CONFIG[section.rating];
  return (
    <div className="feedback-card">
      <button className="feedback-card-header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="feedback-card-icon"><IconComp size={18} /></span>
        <span className="feedback-card-title">{section.category}</span>
        <span className={`feedback-badge ${className}`}>{label}</span>
        <span className="feedback-chevron">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {open && (
        <div className="feedback-card-body">
          <p className="feedback-summary">{section.summary}</p>
          <ul className="feedback-details">
            {section.details.map((d, i) => (
              <li key={i} className="feedback-detail-item"><span className="detail-dot" />{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Correction Card ──────────────────────────────────────────────────────────

function CorrectionCard({ correction, index }: { correction: Correction; index: number }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="correction-card">
      <button className="correction-header" onClick={() => setOpen(o => !o)}>
        <span className="correction-num">{index + 1}</span>
        <span className="correction-section">{correction.section}</span>
        <span className="correction-chevron">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>
      {open && (
        <div className="correction-body">
          <div className="correction-row">
            <div className="correction-col correction-col--before">
              <span className="correction-label correction-label--before">Original</span>
              <p className="correction-text">{correction.original}</p>
            </div>
            <span className="correction-arrow"><ArrowRight size={18} /></span>
            <div className="correction-col correction-col--after">
              <span className="correction-label correction-label--after">Improved</span>
              <p className="correction-text correction-text--improved">{correction.improved}</p>
            </div>
          </div>
          <p className="correction-why"><strong>Why:</strong> {correction.why}</p>
        </div>
      )}
    </div>
  );
}

// ─── Cover Letter ─────────────────────────────────────────────────────────────

function CoverLetterPanel({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cover-letter.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="cover-letter-panel">
      <div className="cover-letter-toolbar">
        <h3 className="cover-letter-title">Cover Letter</h3>
        <div className="cover-letter-actions">
          <button className="cl-btn" onClick={handleCopy} data-testid="button-copy-cl">
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
          <button className="cl-btn cl-btn--primary" onClick={handleDownload} data-testid="button-download-cl">
            <Download size={14} /> Download
          </button>
        </div>
      </div>
      <div className="cover-letter-body">
        {text.split("\n\n").map((para, i) => (
          <p key={i} className="cover-letter-para">{para}</p>
        ))}
      </div>
    </div>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ file, onFile, disabled }: { file: File | null; onFile: (f: File | null) => void; disabled: boolean }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (f: File) => {
    const ok = ["application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"].includes(f.type) || /\.(pdf|docx|txt)$/i.test(f.name);
    if (ok) onFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) accept(f);
  }, []);

  if (file) {
    return (
      <div className="drop-zone drop-zone--filled">
        <CheckCircle2 size={28} className="dz-check" />
        <span className="dz-filename">{file.name}</span>
        <span className="dz-filesize">{(file.size / 1024).toFixed(0)} KB</span>
        {!disabled && (
          <button className="dz-remove" onClick={() => onFile(null)} aria-label="Remove file"><X size={14} /></button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`drop-zone${dragging ? " drop-zone--drag" : ""}`}
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
      data-testid="input-resume-dropzone"
    >
      <UploadCloud size={32} className="dz-icon" />
      <p className="dz-primary">Drop your resume here</p>
      <p className="dz-secondary">or click to browse · PDF, DOCX, or TXT</p>
      <input ref={inputRef} type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) accept(f); }}
        disabled={disabled} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "feedback" | "corrections" | "cover-letter" | "manager-note" | "why-me";

export default function Home() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("feedback");
  const [darkMode, setDarkMode] = useState(window.matchMedia("(prefers-color-scheme: dark)").matches);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const submitMutation = useMutation({
    mutationFn: (): Promise<AnalysisResult> => new Promise(async (resolve, reject) => {
      const form = new FormData();
      form.append("resume", resumeFile!);
      form.append("jobDescription", jobDesc);

      let res: Response;
      try {
        res = await fetch(`/api/analyze`, { method: "POST", body: form });
      } catch {
        return reject(new Error("Network error — please try again."));
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        return reject(new Error(err.error || "Failed to analyze"));
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const eventLine = part.split("\n").find(l => l.startsWith("event:"));
          const dataLine = part.split("\n").find(l => l.startsWith("data:"));
          if (!dataLine) continue;
          const eventName = eventLine ? eventLine.replace("event:", "").trim() : "message";
          const data = JSON.parse(dataLine.replace("data:", "").trim());
          if (eventName === "result") return resolve(data as AnalysisResult);
          if (eventName === "error") return reject(new Error(data.error));
          // token / ping — ignore, keep reading
        }
      }
      reject(new Error("No result received. Please try again."));
    }),
    onSuccess: (data) => {
      setResult(data);
      setActiveTab("feedback");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const loading = submitMutation.isPending;
  const done = !!result;
  const canSubmit = !!resumeFile && jobDesc.trim().length >= 20 && !loading;

  function handleReset() {
    setResumeFile(null);
    setJobDesc("");
    setResult(null);
    submitMutation.reset();
  }

  return (
    <div className="page-root">
      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <div className="logo-group">
            <img src="/logo.png" alt="Resume Wizard" className="logo-img" />
            <div>
              <h1 className="logo-name">Resume Wizard</h1>
              <p className="logo-tagline">Match your resume to any job</p>
            </div>
          </div>
          <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Input */}
        {!done && (
          <section className="input-section">
            <div className="input-grid">
              <div className="input-col">
                <label className="input-label"><FileText size={15} />Your Resume</label>
                <DropZone file={resumeFile} onFile={f => setResumeFile(f)} disabled={loading} />
                <p className="input-hint">PDF, DOCX, or TXT · max 10 MB</p>
              </div>
              <div className="input-col">
                <label className="input-label" htmlFor="job"><Briefcase size={15} />Job Description</label>
                <Textarea id="job" data-testid="input-job"
                  placeholder="Paste the full job description here…"
                  value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                  className="big-textarea" disabled={loading} />
                <span className="char-count">{jobDesc.length} chars</span>
              </div>
            </div>
            <div className="submit-row">
              <Button data-testid="button-analyze" onClick={() => submitMutation.mutate()}
                disabled={!canSubmit} className="analyze-btn" size="lg">
                {loading ? <><Loader2 size={18} className="mr-2 animate-spin" />Analyzing…</> : "Analyze Resume"}
              </Button>
              {loading && <p className="loading-hint">Reviewing your resume against the job requirements…</p>}
            </div>
          </section>
        )}

        {/* Results */}
        {done && result && (
          <section className="results-section" ref={resultsRef}>
            {/* Score hero */}
            <div className="score-hero">
              <div className="score-ring-wrap">
                <ScoreRing score={result.score} />
                <p className="score-label">Match Score</p>
              </div>
              <div className="score-rationale">
                <h2 className="score-heading">
                  {result.score >= 8 ? "Great match" : result.score >= 6 ? "Solid foundation" : "Room to improve"}
                </h2>
                <p className="score-text">{result.scoreRationale}</p>
                <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset" className="mt-4">
                  <RotateCcw size={14} className="mr-1.5" />Analyze another
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="result-tabs">
              <button className={`result-tab${activeTab === "feedback" ? " result-tab--active" : ""}`}
                onClick={() => setActiveTab("feedback")}>
                Feedback
              </button>
              <button className={`result-tab${activeTab === "corrections" ? " result-tab--active" : ""}`}
                onClick={() => setActiveTab("corrections")}>
                Resume Corrections
                <span className="tab-badge">{result.corrections.length}</span>
              </button>
              <button className={`result-tab${activeTab === "cover-letter" ? " result-tab--active" : ""}`}
                onClick={() => setActiveTab("cover-letter")}>
                Cover Letter
              </button>
              <button className={`result-tab${activeTab === "manager-note" ? " result-tab--active" : ""}`}
                onClick={() => setActiveTab("manager-note")}>
                Message to Manager
              </button>
              <button className={`result-tab${activeTab === "why-me" ? " result-tab--active" : ""}`}
                onClick={() => setActiveTab("why-me")}>
                Why I'm the Best Fit
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "feedback" && (
              <div className="feedback-grid">
                {result.sections.map((s, i) => <FeedbackCard key={i} section={s} />)}
              </div>
            )}

            {activeTab === "corrections" && (
              <div className="corrections-grid">
                <p className="corrections-note">
                  These edits are based only on what's already in your resume — rephrased and aligned with the job description. Nothing fabricated.
                </p>
                {result.corrections.map((c, i) => <CorrectionCard key={i} correction={c} index={i} />)}
              </div>
            )}

            {activeTab === "cover-letter" && (
              <CoverLetterPanel text={result.coverLetter} />
            )}

            {activeTab === "manager-note" && (
              <CoverLetterPanel text={result.hiringManagerNote} />
            )}

            {activeTab === "why-me" && (
              <div className="why-me-panel">
                <div className="cover-letter-toolbar">
                  <h3 className="cover-letter-title">Why I'm the Best Candidate</h3>
                  <div className="cover-letter-actions">
                    <button className="cl-btn" onClick={() => navigator.clipboard.writeText(result.whyBestCandidate)}>
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                </div>
                <div className="why-me-body">
                  {result.whyBestCandidate
                    ? result.whyBestCandidate
                        .split(/\n+/)
                        .map(l => l.replace(/^[\s•\-\*]+/, "").trim())
                        .filter(l => l.length > 3)
                        .map((line, i) => (
                          <div key={i} className="why-me-item">
                            <span className="why-me-bullet">✦</span>
                            <span>{line}</span>
                          </div>
                        ))
                    : <p style={{color:"var(--color-text-muted)",padding:"var(--space-6)"}}>No content returned — please try analyzing again.</p>
                  }
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="site-footer">
        <p className="footer-disclaimer">
          ⚠️ All analysis is AI-generated. Use your own judgment before applying any suggestions.
          Resume Wizard is not responsible for job application outcomes.
        </p>
        <div className="footer-links-row">
          <a href="https://roshinivc.github.io/resume-wizard/privacy.html" target="_blank" rel="noopener noreferrer" className="footer-link">Privacy Policy</a>
          <span className="footer-dot">·</span>
          <a href="https://roshinivc.github.io/resume-wizard/terms.html" target="_blank" rel="noopener noreferrer" className="footer-link">Terms of Service</a>
          <span className="footer-dot">·</span>
          <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="footer-link">Created with Perplexity Computer</a>
        </div>
      </footer>
    </div>
  );
}
