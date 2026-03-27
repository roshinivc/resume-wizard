import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Briefcase, Zap, TrendingUp, Layout, Star, Search,
  ChevronDown, ChevronUp, Loader2, Moon, Sun, RotateCcw,
  UploadCloud, X, CheckCircle2, ArrowRight, Copy, Check, Download,
  Lock, Zap as ZapIcon, Crown, Mail, LogOut
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

interface UsageStatus {
  allowed: boolean;
  used: number;
  limit: number;
  paid: boolean;
  plan: string;
  isAdmin: boolean;
  email: string | null;
}

// ─── Login Modal ──────────────────────────────────────────────────────────────

function LoginModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fingerprint = (() => {
    let fp = sessionStorage.getItem("rw_fp");
    if (!fp) { fp = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("rw_fp", fp); }
    return fp;
  })();

  async function handleSend() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fingerprint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send link");
      setSent(true);
      // Optimistically store email so they don't have to wait for the link
      sessionStorage.setItem("rw_email", email);
      onSuccess(email);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-modal-backdrop" onClick={onClose}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>
        <button className="login-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="login-modal-icon"><Mail size={28} /></div>
        <h2 className="login-modal-title">Sign in with Email</h2>
        {!sent ? (
          <>
            <p className="login-modal-sub">
              Already paid? Enter your email and we'll send a magic link to restore your access on any device.
            </p>
            <input
              className="login-modal-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              autoFocus
              data-testid="input-login-email"
            />
            {error && <p className="login-modal-error">{error}</p>}
            <button
              className="paywall-btn paywall-btn--primary login-modal-btn"
              onClick={handleSend}
              disabled={loading}
              data-testid="button-send-magic-link"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              {loading ? "Sending…" : "Send Magic Link"}
            </button>
            <p className="login-modal-note">No password needed · Free to sign in · Access from any device</p>
          </>
        ) : (
          <>
            <div className="login-sent-icon"><CheckCircle2 size={40} className="login-check" /></div>
            <p className="login-modal-sub login-modal-sub--success">
              Magic link sent to <strong>{email}</strong>.<br />
              Check your inbox and click the link to verify. Your access will be restored on this device too.
            </p>
            <button className="paywall-btn login-modal-btn" onClick={onClose}>
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Paywall ──────────────────────────────────────────────────────────────────

function PaywallScreen({ used, paygLink, monthlyLink, fingerprint, onSignIn }: {
  used: number;
  paygLink: string;
  monthlyLink: string;
  fingerprint: string;
  onSignIn: () => void;
}) {
  function goToPay(link: string, plan: string) {
    const url = new URL(link);
    url.searchParams.set("client_reference_id", fingerprint);
    url.searchParams.set("metadata[fingerprint]", fingerprint);
    url.searchParams.set("metadata[plan]", plan);
    window.open(url.toString(), "_blank");
  }

  return (
    <div className="paywall-overlay">
      <div className="paywall-card">
        <div className="paywall-icon"><Lock size={32} /></div>
        <h2 className="paywall-title">You've used your {used} free analyses</h2>
        <p className="paywall-sub">Unlock full analysis — score, corrections, cover letter, manager note, and why you're the best fit.</p>
        <div className="paywall-options">
          <div className="paywall-option paywall-option--featured">
            <div className="paywall-option-badge">Most Popular</div>
            <div className="paywall-option-price">$5.99<span>/month</span></div>
            <div className="paywall-option-name">Monthly Plan</div>
            <ul className="paywall-option-features">
              <li>✓ 15 analyses per month</li>
              <li>✓ All 5 result tabs</li>
              <li>✓ Cancel or pause anytime</li>
            </ul>
            <button className="paywall-btn paywall-btn--primary" onClick={() => goToPay(monthlyLink, "monthly")}>
              <Crown size={15} /> Subscribe — $5.99/mo
            </button>
          </div>
          <div className="paywall-option">
            <div className="paywall-option-price">$0.99<span>/analysis</span></div>
            <div className="paywall-option-name">Pay As You Go</div>
            <ul className="paywall-option-features">
              <li>✓ 1 full analysis</li>
              <li>✓ All 5 result tabs</li>
              <li>✓ No subscription</li>
            </ul>
            <button className="paywall-btn" onClick={() => goToPay(paygLink, "payg")}>
              <ZapIcon size={15} /> Buy 1 Analysis — $0.99
            </button>
          </div>
        </div>
        <button className="paywall-signin-link" onClick={onSignIn}>
          <Mail size={13} /> Already paid? Sign in with email
        </button>
        <p className="paywall-note">No account required · Secure payment via Stripe · Cancel anytime</p>
      </div>
    </div>
  );
}

// ─── Locked Tab ───────────────────────────────────────────────────────────────

function LockedTab({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="locked-tab">
      <Lock size={28} className="locked-icon" />
      <h3 className="locked-title">Premium Feature</h3>
      <p className="locked-sub">Upgrade to access this section</p>
      <button className="paywall-btn paywall-btn--primary" style={{marginTop: "var(--space-4)"}} onClick={onUnlock}>
        <Crown size={14} /> Unlock Full Analysis
      </button>
    </div>
  );
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
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Admin token from URL param — stored in sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("admin");
    if (token) {
      sessionStorage.setItem("rw_admin", token);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Restore email from sessionStorage on load
  useEffect(() => {
    const savedEmail = sessionStorage.getItem("rw_email");
    if (savedEmail) setLoggedInEmail(savedEmail);
  }, []);

  // Handle magic link callback — Supabase puts tokens in URL hash
  // After clicking the email link, user lands on /?fp=...#access_token=...
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const accessToken = params.get("access_token");
      const urlParams = new URLSearchParams(window.location.search);
      const fp = urlParams.get("fp");

      if (accessToken) {
        // Verify access token via our own API (avoids exposing Supabase keys on frontend)
        fetch(`${API_BASE}/api/auth?action=verify&token=${encodeURIComponent(accessToken)}`)
          .then(r => r.json())
          .then(data => {
            if (data?.email) {
              const email = data.email;
              sessionStorage.setItem("rw_email", email);
              // Restore old fingerprint if passed via URL
              if (fp) sessionStorage.setItem("rw_fp", fp);
              setLoggedInEmail(email);
              toast({ title: "Signed in!", description: `Welcome back, ${email}` });
              refetchUsage();
            }
          })
          .catch(console.error);
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  // Fingerprint for usage tracking
  const fingerprint = (() => {
    let fp = sessionStorage.getItem("rw_fp");
    if (!fp) {
      fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("rw_fp", fp);
    }
    return fp;
  })();

  // Check usage status — passes email header if logged in
  const { data: usageStatus, refetch: refetchUsage } = useQuery<UsageStatus>({
    queryKey: ["/api/usage", loggedInEmail],
    queryFn: async () => {
      const adminToken = sessionStorage.getItem("rw_admin") || "";
      const email = sessionStorage.getItem("rw_email") || "";
      const headers: Record<string, string> = {
        "x-admin-token": adminToken,
        "x-fp": fingerprint,
      };
      if (email) headers["x-email"] = email;
      const res = await fetch(`${API_BASE}/api/usage`, { headers });
      return res.json();
    },
    staleTime: 30000,
  });

  const isPaid = usageStatus?.paid || usageStatus?.isAdmin || false;
  const paygLink = import.meta.env.VITE_STRIPE_PAYG_LINK || "#";
  const monthlyLink = import.meta.env.VITE_STRIPE_MONTHLY_LINK || "#";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // When user signs in via login modal, refetch usage to pick up paid status
  function handleLoginSuccess(email: string) {
    setLoggedInEmail(email);
    sessionStorage.setItem("rw_email", email);
    // Refetch after a short delay (give the magic link time to be clicked)
    setTimeout(() => refetchUsage(), 500);
  }

  function handleLogout() {
    sessionStorage.removeItem("rw_email");
    setLoggedInEmail(null);
    refetchUsage();
  }

  const submitMutation = useMutation({
    mutationFn: (): Promise<AnalysisResult> => new Promise(async (resolve, reject) => {
      const adminToken = sessionStorage.getItem("rw_admin") || "";
      const email = sessionStorage.getItem("rw_email") || "";
      const headers: Record<string, string> = {
        "x-admin-token": adminToken,
        "x-fp": fingerprint,
      };
      if (email) headers["x-email"] = email;

      const usageRes = await fetch(`${API_BASE}/api/usage`, { headers });
      const usage: UsageStatus = await usageRes.json();
      if (!usage.allowed) {
        setShowPaywall(true);
        return reject(new Error("PAYWALL"));
      }

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
        }
      }
      reject(new Error("No result received. Please try again."));
    }),
    onSuccess: (data) => {
      setResult(data);
      setActiveTab("feedback");
      const adminToken = sessionStorage.getItem("rw_admin") || "";
      const email = sessionStorage.getItem("rw_email") || "";
      const headers: Record<string, string> = {
        "x-admin-token": adminToken,
        "x-fp": fingerprint,
        "Content-Type": "application/json",
      };
      if (email) headers["x-email"] = email;
      fetch(`${API_BASE}/api/usage`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fingerprint, email }),
      }).then(() => refetchUsage());
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (err: Error) => {
      if (err.message !== "PAYWALL") {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
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
      {/* Login Modal */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(email) => {
            handleLoginSuccess(email);
            setShowLogin(false);
            if (showPaywall) setShowPaywall(false);
          }}
        />
      )}

      {/* Paywall */}
      {showPaywall && !showLogin && (
        <div className="paywall-backdrop" onClick={() => setShowPaywall(false)}>
          <div onClick={e => e.stopPropagation()}>
            <PaywallScreen
              used={usageStatus?.used || 3}
              paygLink={paygLink}
              monthlyLink={monthlyLink}
              fingerprint={fingerprint}
              onSignIn={() => setShowLogin(true)}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <div className="logo-group">
            <img src="/logo.png" alt="Resume Wizard" className="logo-img" />
            <div>
              <h1 className="logo-name">Resume Wizard</h1>
              <p className="logo-tagline">Built by a job seeker, for job seekers — honest AI feedback that respects your time.</p>
            </div>
          </div>
          <div className="header-right">
            {/* Logged-in user display */}
            {loggedInEmail && (
              <div className="header-user">
                <span className="header-user-email"><Mail size={11} /> {loggedInEmail}</span>
                <button className="header-logout-btn" onClick={handleLogout} title="Sign out" data-testid="button-logout">
                  <LogOut size={13} />
                </button>
              </div>
            )}

            {/* Usage / plan badges */}
            {usageStatus && !usageStatus.isAdmin && !usageStatus.paid && (
              <>
                <span className="usage-badge">
                  {Math.max(0, 3 - usageStatus.used)} free left
                </span>
                <button className="header-subscribe-btn" onClick={() => setShowPaywall(true)}>
                  <Crown size={12} /> Subscribe
                </button>
                {!loggedInEmail && (
                  <button className="header-signin-btn" onClick={() => setShowLogin(true)} data-testid="button-header-signin">
                    <Mail size={12} /> Sign in
                  </button>
                )}
              </>
            )}
            {usageStatus?.paid && usageStatus.plan === "monthly" && (
              <span className="usage-badge usage-badge--paid">
                <Crown size={11} /> Monthly · {Math.max(0, 15 - usageStatus.used)} left
              </span>
            )}
            {usageStatus?.paid && usageStatus.plan === "payg" && (
              <span className="usage-badge usage-badge--paid">
                <ZapIcon size={11} /> Pay-as-you-go
              </span>
            )}
            {usageStatus?.isAdmin && (
              <span className="usage-badge usage-badge--admin">
                Admin
              </span>
            )}
            <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} aria-label="Toggle dark mode">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
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
                <span className={`char-count${jobDesc.length > 2300 ? " char-count--warn" : jobDesc.length > 2500 ? " char-count--over" : ""}`}>
                  {jobDesc.length} / 2500 chars
                  {jobDesc.length > 2500 && " — will be trimmed to 2500"}
                  {jobDesc.length > 2300 && jobDesc.length <= 2500 && " — near limit"}
                </span>
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
              isPaid
                ? <div className="corrections-grid">
                    <p className="corrections-note">These edits are based only on what's already in your resume — rephrased and aligned with the job description. Nothing fabricated.</p>
                    {result.corrections.map((c, i) => <CorrectionCard key={i} correction={c} index={i} />)}
                  </div>
                : <LockedTab onUnlock={() => setShowPaywall(true)} />
            )}

            {activeTab === "cover-letter" && (
              isPaid
                ? <CoverLetterPanel text={result.coverLetter} />
                : <LockedTab onUnlock={() => setShowPaywall(true)} />
            )}

            {activeTab === "manager-note" && (
              isPaid
                ? <CoverLetterPanel text={result.hiringManagerNote} />
                : <LockedTab onUnlock={() => setShowPaywall(true)} />
            )}

            {activeTab === "why-me" && (
              !isPaid ? <LockedTab onUnlock={() => setShowPaywall(true)} /> :
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
