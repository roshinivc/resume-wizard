import { useState } from "react";
import { Link } from "wouter";
import { API_BASE } from "@/lib/queryClient";
import {
  ArrowLeft, Building2, Download, Shield, Zap,
  Users, FileText, CheckCircle2, ExternalLink,
  ChevronRight, Star, AlertCircle, Loader2
} from "lucide-react";

const TIERS = [
  {
    name: "Starter",
    price: "$199",
    period: "/mo",
    users: "1 user",
    reqs: "50 job reqs/mo",
    features: [
      "Unlimited resumes per job",
      "Excel + PDF ranked reports",
      "Score 9/10 shortlist view",
      "Auto-sort into score folders",
      "Email support",
    ],
    highlight: false,
    value: "starter",
  },
  {
    name: "Team",
    price: "$599",
    period: "/mo",
    users: "Up to 5 users",
    reqs: "50 job reqs/mo per user",
    features: [
      "Everything in Starter",
      "Multi-user (tracked by Windows login)",
      "Shared job req history",
      "Priority support",
      "Onboarding call",
    ],
    highlight: true,
    value: "team",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    users: "Unlimited users",
    reqs: "Unlimited job reqs",
    features: [
      "Everything in Team",
      "Workday / ATS API integration",
      "Custom branded reports",
      "Bias audit documentation",
      "SLA + dedicated support",
      "Data Processing Agreement",
    ],
    highlight: false,
    value: "enterprise",
  },
];

const FEATURES = [
  { icon: <Users size={15} />,    label: "Handles 1,000+ resumes per job req — no limit" },
  { icon: <Zap size={15} />,      label: "Score 9 & 10 candidates shown first — shortlist in seconds" },
  { icon: <FileText size={15} />, label: "Excel + PDF reports per job, per score tier" },
  { icon: <Shield size={15} />,   label: "100% local — no resume data leaves your machine" },
  { icon: <CheckCircle2 size={15} />, label: "Works with local folders, OneDrive, SharePoint, Google Drive, Dropbox" },
  { icon: <CheckCircle2 size={15} />, label: "Runs on Windows & Mac — no browser or internet required after setup" },
];

interface FormData {
  name: string;
  email: string;
  company: string;
  role: string;
  teamSize: string;
  useCase: string;
  tier: string;
}

export default function Corporate() {
  const [form, setForm] = useState<FormData>({
    name: "", email: "", company: "", role: "",
    teamSize: "", useCase: "", tier: "starter",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const update = (k: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.company) {
      setError("Name, email and company are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/enterprise-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = `w-full px-3 py-2.5 text-sm border border-[hsl(var(--border))] rounded-lg
    bg-[hsl(var(--card))] text-[hsl(var(--foreground))]
    placeholder:text-[hsl(var(--muted-foreground))]
    focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]`;

  return (
    <div className="info-page">
      <div className="info-page-inner" style={{ maxWidth: 820 }}>

        {/* Back */}
        <Link href="/" className="info-back">
          <ArrowLeft size={15} /> Back to Resume Wizard
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <Building2 size={26} style={{ color: "var(--color-primary)" }} />
          <h1 className="info-title" style={{ margin: 0 }}>HireScreen AI for Enterprise</h1>
        </div>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "2rem", lineHeight: 1.6 }}>
          AI-powered candidate screening for HR teams. Drop in your resumes, get every applicant
          scored, ranked, and sorted — with zero data leaving your network.
        </p>

        {/* Feature pills */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem",
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.4rem 0.8rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 999, fontSize: "0.8rem",
              color: "var(--color-text)",
            }}>
              <span style={{ color: "var(--color-primary)" }}>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* Free trial CTA */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "1rem",
          padding: "1.1rem 1.4rem",
          background: "var(--color-primary)",
          borderRadius: 12, marginBottom: "2rem",
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
              Start with a free trial
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.825rem", marginTop: 2 }}>
              Works on Windows & Mac. Process 2 job reqs free, up to 100 resumes each. No credit card.
            </div>
          </div>
          <a
            href="https://github.com/roshinivc/hirescreen-exe/releases/tag/v1.0-trial"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.65rem 1.4rem",
              background: "#fff", color: "var(--color-primary)",
              borderRadius: 8, fontWeight: 700, fontSize: "0.875rem",
              textDecoration: "none", flexShrink: 0,
            }}
          >
            <Download size={14} /> Download Free Trial
          </a>
        </div>

        {/* Pricing tiers */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "1rem" }}>
          Plans & Pricing
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem", marginBottom: "2.5rem",
        }}>
          {TIERS.map(tier => (
            <div
              key={tier.value}
              style={{
                background: tier.highlight ? "var(--color-primary)" : "var(--color-surface)",
                border: `2px solid ${tier.highlight ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: 12, padding: "1.25rem",
                position: "relative",
              }}
            >
              {tier.highlight && (
                <div style={{
                  position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  background: "#F59E0B", color: "#fff",
                  fontSize: "0.65rem", fontWeight: 700,
                  padding: "2px 10px", borderRadius: 999,
                  letterSpacing: "0.08em",
                }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ color: tier.highlight ? "#fff" : "var(--color-text)", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                {tier.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginBottom: "0.5rem" }}>
                <span style={{ color: tier.highlight ? "#fff" : "var(--color-primary)", fontWeight: 800, fontSize: "1.75rem" }}>
                  {tier.price}
                </span>
                <span style={{ color: tier.highlight ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)", fontSize: "0.8rem" }}>
                  {tier.period}
                </span>
              </div>
              <div style={{ color: tier.highlight ? "rgba(255,255,255,0.85)" : "var(--color-text-muted)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                {tier.users}
              </div>
              <div style={{ color: tier.highlight ? "rgba(255,255,255,0.85)" : "var(--color-text-muted)", fontSize: "0.8rem", marginBottom: "1rem" }}>
                {tier.reqs}
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {tier.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", fontSize: "0.8rem" }}>
                    <CheckCircle2 size={12} style={{ color: tier.highlight ? "#34d399" : "var(--color-primary)", marginTop: 2, flexShrink: 0 }} />
                    <span style={{ color: tier.highlight ? "rgba(255,255,255,0.9)" : "var(--color-text)" }}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  setForm(f => ({ ...f, tier: tier.value }));
                  document.getElementById("interest-form")?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "0.4rem", width: "100%",
                  marginTop: "1.1rem", padding: "0.65rem",
                  background: tier.highlight ? "#fff" : "var(--color-primary)",
                  color: tier.highlight ? "var(--color-primary)" : "#fff",
                  border: "none", borderRadius: 8,
                  fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                Get Started <ChevronRight size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Interest form */}
        <div id="interest-form" style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14, padding: "1.75rem",
          marginBottom: "1.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
            <Star size={18} style={{ color: "var(--color-primary)" }} fill="currentColor" />
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
              Request Access
            </h2>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
            Fill out this form and we'll be in touch within 24 hours with your license key and onboarding.
          </p>

          {submitted ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "0.75rem", padding: "2rem", textAlign: "center",
            }}>
              <CheckCircle2 size={40} style={{ color: "#16a34a" }} />
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text)" }}>
                Thank you — we'll be in touch within 24 hours!
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                In the meantime, download the free trial to get started.
              </div>
              <a
                href="https://github.com/roshinivc/hirescreen-exe/releases/tag/v1.0-trial"
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.6rem 1.2rem",
                  background: "var(--color-primary)", color: "#fff",
                  borderRadius: 8, fontWeight: 600, fontSize: "0.85rem",
                  textDecoration: "none",
                }}
              >
                <Download size={13} /> Download Free Trial
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Full Name <span style={{ color: "red" }}>*</span>
                  </label>
                  <input type="text" value={form.name} onChange={update("name")}
                    placeholder="Jane Smith" className={inputClass} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Work Email <span style={{ color: "red" }}>*</span>
                  </label>
                  <input type="email" value={form.email} onChange={update("email")}
                    placeholder="jane@company.com" className={inputClass} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Company <span style={{ color: "red" }}>*</span>
                  </label>
                  <input type="text" value={form.company} onChange={update("company")}
                    placeholder="Acme Corp" className={inputClass} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Your Role
                  </label>
                  <input type="text" value={form.role} onChange={update("role")}
                    placeholder="HR Manager, Recruiter..." className={inputClass} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    HR Team Size
                  </label>
                  <select value={form.teamSize} onChange={update("teamSize")} className={inputClass}>
                    <option value="">Select...</option>
                    <option value="1">Just me</option>
                    <option value="2-5">2–5 people</option>
                    <option value="6-20">6–20 people</option>
                    <option value="20+">20+ people</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Plan Interest
                  </label>
                  <select value={form.tier} onChange={update("tier")} className={inputClass}>
                    <option value="starter">Starter — $199/mo (1 user)</option>
                    <option value="team">Team — $599/mo (2–5 users)</option>
                    <option value="enterprise">Enterprise — Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  How will you use HireScreen?
                </label>
                <textarea value={form.useCase} onChange={update("useCase")}
                  placeholder="e.g. We screen 50-100 applicants per engineering role and need to shortlist faster..."
                  rows={3} className={inputClass}
                  style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#b91c1c", fontSize: "0.85rem" }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "0.5rem", padding: "0.8rem 1.5rem",
                  background: submitting ? "var(--color-surface-dynamic)" : "var(--color-primary)",
                  color: submitting ? "var(--color-text-muted)" : "#fff",
                  border: "none", borderRadius: 10,
                  fontWeight: 700, fontSize: "0.9rem", cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting
                  ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Submitting...</>
                  : <>Request Access <ChevronRight size={15} /></>
                }
              </button>
            </form>
          )}
        </div>

        {/* Legal */}
        <div style={{
          padding: "0.75rem 1rem",
          background: "var(--color-surface-offset)",
          borderRadius: 8, fontSize: "0.72rem",
          color: "var(--color-text-muted)", lineHeight: 1.6,
        }}>
          <strong>Legal:</strong> AI scores are advisory guidance only — not automated hiring decisions.
          Human review required before advancing or rejecting candidates.
          Employers must comply with NYC LL144, CO CAIA, IL HB3773, CA FEHA, and EU AI Act.
          HireScreen has not been bias-audited under any jurisdiction.
        </div>
      </div>
    </div>
  );
}
