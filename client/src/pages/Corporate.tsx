import { Link } from "wouter";
import {
  ArrowLeft, Building2, Download, Terminal, FolderOpen,
  CheckCircle2, Shield, Zap, Users, FileText, ExternalLink
} from "lucide-react";

const STEPS = [
  {
    icon: <Download size={18} />,
    title: "Install Ollama",
    desc: "Download and install Ollama on your HR machine. Pull the AI model once.",
    code: "ollama pull llama3.1:8b",
    link: "https://ollama.com",
    linkLabel: "Download Ollama →",
  },
  {
    icon: <FolderOpen size={18} />,
    title: "Set up your job folder",
    desc: "Create a folder for each job ID. Drop all resumes (PDF/DOCX) into the _input/ subfolder. Add job_description.txt.",
    code: "jobs/JOB001/_input/resume_jane.pdf\njobs/JOB001/job_description.txt",
  },
  {
    icon: <Terminal size={18} />,
    title: "Run HireScreen AI",
    desc: "Download and run HireScreen AI locally. Open your browser to localhost:5000.",
    code: "node dist/index.cjs",
    link: "https://github.com/roshinivc/hirescreen-ai",
    linkLabel: "Download HireScreen AI →",
  },
  {
    icon: <CheckCircle2 size={18} />,
    title: "Get ranked results",
    desc: "Paste your folder path, click Run. AI scores every candidate and sorts them into score folders automatically.",
    code: null,
  },
];

const FEATURES = [
  { icon: <Users size={15} />, label: "Unlimited resumes per job — handles 1,000+ applications" },
  { icon: <Zap size={15} />,   label: "Scores 9 & 10 shown first — your shortlist in seconds" },
  { icon: <FolderOpen size={15} />, label: "Resumes auto-sorted into score_10/, score_9/, score_8/, score_7/, score_below_7/" },
  { icon: <FileText size={15} />, label: "Download ranked report per tier or full CSV" },
  { icon: <Shield size={15} />, label: "100% local — no resume data ever leaves your machine" },
];

export default function Corporate() {
  return (
    <div className="info-page">
      <div className="info-page-inner" style={{ maxWidth: 740 }}>

        {/* Back */}
        <Link href="/" className="info-back">
          <ArrowLeft size={15} /> Back to Resume Wizard
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Building2 size={26} style={{ color: "var(--color-primary)" }} />
          <h1 className="info-title" style={{ margin: 0 }}>HireScreen AI</h1>
        </div>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.925rem", marginBottom: "2rem", lineHeight: 1.6 }}>
          AI-powered candidate screening for hiring teams. Upload your entire applicant pool,
          get every resume scored and sorted by fit — with zero data leaving your network.
        </p>

        {/* Feature list */}
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12, padding: "1.25rem",
          marginBottom: "2rem",
          display: "flex", flexDirection: "column", gap: "0.6rem",
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
              <span style={{ color: "var(--color-primary)", marginTop: 2, flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: "0.875rem", color: "var(--color-text)", lineHeight: 1.5 }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Setup steps */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--color-text)" }}>
          Getting Started
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10, padding: "1.1rem 1.25rem",
              display: "flex", gap: "1rem",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "var(--color-primary)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.8rem", fontWeight: 700,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "var(--color-primary)" }}>{step.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text)" }}>{step.title}</span>
                </div>
                <p style={{ fontSize: "0.825rem", color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: step.code ? "0.6rem" : 0 }}>
                  {step.desc}
                </p>
                {step.code && (
                  <pre style={{
                    background: "var(--color-surface-offset)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6, padding: "0.5rem 0.75rem",
                    fontSize: "0.75rem", color: "var(--color-text)",
                    fontFamily: "monospace", margin: 0,
                    overflowX: "auto", whiteSpace: "pre-wrap",
                  }}>
                    {step.code}
                  </pre>
                )}
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.3rem",
                      marginTop: "0.5rem", fontSize: "0.8rem",
                      color: "var(--color-primary)", fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={11} /> {step.linkLabel}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Launch button */}
        <div style={{
          background: "var(--color-primary)",
          borderRadius: 12, padding: "1.5rem",
          textAlign: "center", marginBottom: "1.5rem",
        }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", marginBottom: "0.4rem" }}>
            HireScreen AI is running locally?
          </div>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.825rem", marginBottom: "1rem" }}>
            Open the dashboard in your browser — make sure <code style={{ background: "rgba(255,255,255,0.15)", padding: "1px 5px", borderRadius: 4 }}>node dist/index.cjs</code> is running first.
          </p>
          <a
            href="http://localhost:5000"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.7rem 1.5rem",
              background: "#fff", color: "var(--color-primary)",
              borderRadius: 8, fontWeight: 700, fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} /> Open HireScreen AI →
          </a>
        </div>

        {/* Legal */}
        <div style={{
          padding: "0.9rem 1rem",
          background: "var(--color-surface-offset)",
          borderRadius: 8, fontSize: "0.75rem",
          color: "var(--color-text-muted)", lineHeight: 1.6,
        }}>
          <strong style={{ color: "var(--color-text)" }}>Legal Notice:</strong> AI-generated candidate
          scores are advisory guidance only and do not constitute automated employment decisions.
          A qualified human recruiter must review all results before any candidate is advanced or rejected.
          Employers must comply with applicable AI hiring laws including NYC Local Law 144, Colorado CAIA,
          Illinois HB3773, California FEHA, and the EU AI Act. This tool has not been bias-audited.
        </div>
      </div>
    </div>
  );
}
