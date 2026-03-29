import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { API_BASE } from "@/lib/queryClient";
import {
  ArrowLeft, UploadCloud, X, Briefcase, Users, FileText,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2,
  Download, RotateCcw, Building2, Star
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Candidate {
  name: string;
  file: string;
  score: number;
  score_label: string;
  recommendation: "STRONG MATCH" | "GOOD FIT" | "PARTIAL FIT" | "NOT A FIT" | "UNKNOWN";
  summary: string;
  strengths: string[];
  gaps: string[];
  transferable_skills: string[];
  reason: string;
}

interface ScreeningResult {
  jobId: string;
  totalProcessed: number;
  totalErrors: number;
  candidates: Candidate[];
  errors: { name: string; error: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const REC_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  "STRONG MATCH": { color: "#15803d", bg: "#dcfce7", dot: "#16a34a" },
  "GOOD FIT":     { color: "#0369a1", bg: "#e0f2fe", dot: "#0284c7" },
  "PARTIAL FIT":  { color: "#b45309", bg: "#fef3c7", dot: "#d97706" },
  "NOT A FIT":    { color: "#b91c1c", bg: "#fee2e2", dot: "#dc2626" },
  "UNKNOWN":      { color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
};

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "#16a34a" : score >= 6 ? "#0284c7" : score >= 4 ? "#d97706" : "#dc2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{
        flex: 1, height: 6, borderRadius: 999,
        background: "var(--color-border)", overflow: "hidden"
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: color, borderRadius: 999,
          transition: "width 0.6s ease"
        }} />
      </div>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color, minWidth: 52 }}>
        {score.toFixed(1)} / 10
      </span>
    </div>
  );
}

function CandidateCard({ candidate, rank }: { candidate: Candidate; rank: number }) {
  const [open, setOpen] = useState(rank === 1);
  const cfg = REC_CONFIG[candidate.recommendation] || REC_CONFIG["UNKNOWN"];

  return (
    <div style={{
      background: "var(--color-surface)",
      border: `1px solid ${rank === 1 ? cfg.dot : "var(--color-border)"}`,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: rank === 1 ? `0 0 0 2px ${cfg.dot}22` : "var(--shadow-sm)",
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          gap: "0.75rem", padding: "1rem 1.25rem",
          background: open ? "var(--color-surface-offset)" : "transparent",
          borderBottom: open ? "1px solid var(--color-border)" : "none",
          textAlign: "left", cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        {/* Rank badge */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: rank === 1 ? cfg.dot : "var(--color-surface-dynamic)",
          color: rank === 1 ? "#fff" : "var(--color-text-muted)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "0.85rem",
        }}>
          {rank === 1 ? <Star size={14} fill="currentColor" /> : rank}
        </div>

        {/* Name + recommendation */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text)" }}>
              {candidate.name}
            </span>
            <span style={{
              fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px",
              borderRadius: 999, background: cfg.bg, color: cfg.color,
              letterSpacing: "0.03em",
            }}>
              {candidate.recommendation}
            </span>
          </div>
          <div style={{ marginTop: 4 }}>
            <ScoreBar score={candidate.score} />
          </div>
        </div>

        {/* Chevron */}
        <div style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Summary */}
          <p style={{ fontSize: "0.875rem", color: "var(--color-text)", lineHeight: 1.6 }}>
            {candidate.summary}
          </p>

          {/* Reason chip */}
          <div style={{
            padding: "0.6rem 0.9rem",
            background: "var(--color-surface-offset)",
            borderRadius: 8, fontSize: "0.8rem",
            color: "var(--color-text-muted)", lineHeight: 1.5,
          }}>
            <strong style={{ color: "var(--color-text)" }}>Score rationale: </strong>
            {candidate.reason}
          </div>

          {/* 3-column grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
          }}>
            {/* Strengths */}
            <div>
              <div style={{
                fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#15803d", marginBottom: "0.4rem",
              }}>
                ✓ Strengths
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {candidate.strengths.map((s, i) => (
                  <li key={i} style={{ fontSize: "0.8rem", color: "var(--color-text)", lineHeight: 1.4 }}>
                    • {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Gaps */}
            <div>
              <div style={{
                fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#b91c1c", marginBottom: "0.4rem",
              }}>
                ✗ Gaps
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {candidate.gaps.length > 0 ? candidate.gaps.map((g, i) => (
                  <li key={i} style={{ fontSize: "0.8rem", color: "var(--color-text)", lineHeight: 1.4 }}>
                    • {g}
                  </li>
                )) : (
                  <li style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>None identified</li>
                )}
              </ul>
            </div>

            {/* Transferable skills */}
            <div>
              <div style={{
                fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#0369a1", marginBottom: "0.4rem",
              }}>
                ↔ Transferable Skills
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {candidate.transferable_skills.length > 0
                  ? candidate.transferable_skills.map((t, i) => (
                    <li key={i} style={{ fontSize: "0.8rem", color: "var(--color-text)", lineHeight: 1.4 }}>
                      • {t}
                    </li>
                  ))
                  : <li style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>None identified</li>
                }
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Corporate() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(f =>
      /\.(pdf|docx|txt)$/i.test(f.name)
    );
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const deduped = valid.filter(f => !existing.has(f.name));
      return [...prev, ...deduped].slice(0, 20);
    });
  }, []);

  const removeFile = (name: string) =>
    setFiles(prev => prev.filter(f => f.name !== name));

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (files.length === 0) { setError("Please upload at least one resume."); return; }
    if (jobDescription.trim().length < 20) { setError("Please paste a job description."); return; }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append("jobDescription", jobDescription);
      form.append("jobId", jobId || "JOB");
      files.forEach(f => form.append("resumes", f));

      const res = await fetch(`${API_BASE}/api/corporate`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Screening failed.");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFiles([]);
    setJobDescription("");
    setJobId("");
    setResult(null);
    setError("");
  }

  // ── Download CSV ──────────────────────────────────────────────────────────
  function downloadCSV() {
    if (!result) return;
    const header = ["Rank", "Name", "Score", "Recommendation", "Reason"].join(",");
    const rows = result.candidates.map((c, i) =>
      [i + 1, `"${c.name}"`, c.score, `"${c.recommendation}"`, `"${c.reason.replace(/"/g, "'")}"`].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hiring_report_${result.jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="info-page">
      <div className="info-page-inner" style={{ maxWidth: 800 }}>

        {/* Back */}
        <Link href="/" className="info-back">
          <ArrowLeft size={15} /> Back to Resume Wizard
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
          <Building2 size={28} style={{ color: "var(--color-primary)" }} />
          <h1 className="info-title" style={{ margin: 0 }}>Corporate Hiring Screen</h1>
        </div>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Upload up to 20 resumes for a job opening. AI ranks every candidate by fit score,
          highlights strengths, gaps, and transferable skills — in seconds.
        </p>

        {!result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Job ID */}
            <div>
              <label style={{
                display: "block", fontSize: "0.8rem", fontWeight: 600,
                color: "var(--color-text-muted)", marginBottom: "0.4rem", textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                Job ID / Requisition Number (optional)
              </label>
              <input
                type="text"
                value={jobId}
                onChange={e => setJobId(e.target.value)}
                placeholder="e.g. JOB-2026-042 or Senior TPM"
                style={{
                  width: "100%", padding: "0.65rem 0.9rem",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: 8, background: "var(--color-surface)",
                  color: "var(--color-text)", fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Job Description */}
            <div>
              <label style={{
                display: "block", fontSize: "0.8rem", fontWeight: 600,
                color: "var(--color-text-muted)", marginBottom: "0.4rem", textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                Job Description <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here — requirements, responsibilities, qualifications..."
                rows={8}
                style={{
                  width: "100%", padding: "0.75rem 0.9rem",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: 8, background: "var(--color-surface)",
                  color: "var(--color-text)", fontSize: "0.875rem",
                  resize: "vertical", lineHeight: 1.6, outline: "none",
                  fontFamily: "var(--font-body)",
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: 4 }}>
                {jobDescription.length} characters
              </div>
            </div>

            {/* Resume upload zone */}
            <div>
              <label style={{
                display: "block", fontSize: "0.8rem", fontWeight: 600,
                color: "var(--color-text-muted)", marginBottom: "0.4rem", textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                Candidate Resumes <span style={{ color: "var(--color-error)" }}>*</span>
                <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 6 }}>
                  (up to 20 files — PDF, DOCX, TXT)
                </span>
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${dragging ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: 10, padding: "2rem",
                  background: dragging ? "var(--color-primary-highlight)" : "var(--color-surface-offset)",
                  cursor: "pointer", textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                <UploadCloud size={28} style={{ color: "var(--color-text-faint)", margin: "0 auto 0.5rem" }} />
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)" }}>
                  Click to upload or drag &amp; drop
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: 4 }}>
                  PDF, DOCX, TXT · Max 20 resumes
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                style={{ display: "none" }}
                onChange={e => addFiles(e.target.files)}
              />

              {/* File list */}
              {files.length > 0 && (
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: 6 }}>
                  {files.map(f => (
                    <div key={f.name} style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.4rem 0.75rem",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 7, fontSize: "0.8rem",
                    }}>
                      <FileText size={13} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.name}
                      </span>
                      <span style={{ color: "var(--color-text-faint)", flexShrink: 0 }}>
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); removeFile(f.name); }}
                        style={{ color: "var(--color-text-faint)", flexShrink: 0, padding: 2 }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    {files.length} resume{files.length !== 1 ? "s" : ""} ready · {20 - files.length} slots remaining
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.75rem 1rem", borderRadius: 8,
                background: "#fee2e2", color: "#b91c1c", fontSize: "0.875rem",
              }}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || files.length === 0}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "0.5rem", padding: "0.85rem 1.5rem",
                background: loading || files.length === 0 ? "var(--color-surface-dynamic)" : "var(--color-primary)",
                color: loading || files.length === 0 ? "var(--color-text-muted)" : "#fff",
                borderRadius: 10, fontWeight: 700, fontSize: "0.95rem",
                cursor: loading || files.length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                border: "none",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Screening {files.length} candidate{files.length !== 1 ? "s" : ""}...
                </>
              ) : (
                <>
                  <Users size={16} />
                  Screen {files.length > 0 ? files.length : ""} Candidate{files.length !== 1 ? "s" : ""}
                </>
              )}
            </button>

            {loading && (
              <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                Analyzing each resume against the job description — this takes about 5-10 seconds per candidate.
              </p>
            )}
          </div>

        ) : (
          /* ── Results view ────────────────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Summary bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "1rem 1.25rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12, flexWrap: "wrap", gap: "0.75rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <CheckCircle2 size={20} style={{ color: "#16a34a" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text)" }}>
                    Screening complete — {result.jobId}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    {result.totalProcessed} candidate{result.totalProcessed !== 1 ? "s" : ""} ranked
                    {result.totalErrors > 0 && ` · ${result.totalErrors} error${result.totalErrors !== 1 ? "s" : ""}`}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={downloadCSV}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.5rem 0.9rem", borderRadius: 8,
                    border: "1.5px solid var(--color-border)",
                    background: "var(--color-surface)", color: "var(--color-text)",
                    fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
                  }}
                >
                  <Download size={13} /> Export CSV
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.5rem 0.9rem", borderRadius: 8,
                    border: "none",
                    background: "var(--color-primary)", color: "#fff",
                    fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
                  }}
                >
                  <RotateCcw size={13} /> New Screen
                </button>
              </div>
            </div>

            {/* Quick leaderboard */}
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12, overflow: "hidden",
            }}>
              <div style={{
                padding: "0.75rem 1.25rem",
                borderBottom: "1px solid var(--color-border)",
                display: "grid",
                gridTemplateColumns: "40px 1fr 120px 140px",
                gap: "0.5rem",
                fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.07em", color: "var(--color-text-muted)",
                background: "var(--color-surface-offset)",
              }}>
                <span>Rank</span>
                <span>Candidate</span>
                <span style={{ textAlign: "right" }}>Score</span>
                <span style={{ textAlign: "right" }}>Recommendation</span>
              </div>
              {result.candidates.map((c, i) => {
                const cfg = REC_CONFIG[c.recommendation] || REC_CONFIG["UNKNOWN"];
                return (
                  <div key={c.name} style={{
                    padding: "0.65rem 1.25rem",
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 120px 140px",
                    gap: "0.5rem",
                    alignItems: "center",
                    borderBottom: i < result.candidates.length - 1 ? "1px solid var(--color-divider)" : "none",
                    background: i === 0 ? `${cfg.dot}08` : "transparent",
                  }}>
                    <span style={{
                      fontWeight: 700, fontSize: "0.85rem",
                      color: i === 0 ? cfg.dot : "var(--color-text-muted)",
                    }}>
                      {i === 0 ? "★" : `#${i + 1}`}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)" }}>
                      {c.name}
                    </span>
                    <span style={{
                      textAlign: "right", fontWeight: 700,
                      fontSize: "0.875rem",
                      color: c.score >= 8 ? "#16a34a" : c.score >= 6 ? "#0284c7" : c.score >= 4 ? "#d97706" : "#dc2626",
                    }}>
                      {c.score_label}
                    </span>
                    <span style={{
                      textAlign: "right", fontSize: "0.72rem", fontWeight: 600,
                      color: cfg.color,
                    }}>
                      {c.recommendation}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Detailed candidate cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text)" }}>
                Detailed Profiles
              </h2>
              {result.candidates.map((c, i) => (
                <CandidateCard key={c.name} candidate={c} rank={i + 1} />
              ))}
            </div>

            {/* Errors if any */}
            {result.errors.length > 0 && (
              <div style={{
                padding: "1rem", borderRadius: 10,
                background: "#fff7ed", border: "1px solid #fed7aa",
              }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#9a3412", marginBottom: 6 }}>
                  {result.errors.length} resume{result.errors.length !== 1 ? "s" : ""} could not be processed:
                </div>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: "0.8rem", color: "#c2410c" }}>
                    • {e.name}: {e.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Privacy note */}
        <div style={{
          marginTop: "2rem", padding: "0.75rem 1rem",
          background: "var(--color-surface-offset)",
          borderRadius: 8, fontSize: "0.75rem",
          color: "var(--color-text-muted)", lineHeight: 1.5,
        }}>
          <strong>Privacy:</strong> Resume content is processed by AI to generate scores and is not stored after analysis.
          Scores are AI-assisted suggestions — always validate with your recruiter before making hiring decisions.
        </div>
      </div>
    </div>
  );
}
