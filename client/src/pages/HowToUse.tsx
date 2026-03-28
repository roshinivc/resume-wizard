import { Link } from "wouter";
import { ArrowLeft, Upload, FileText, Briefcase, Zap, Star, Lock, Crown, CheckCircle2 } from "lucide-react";

export default function HowToUse() {
  return (
    <div className="info-page">
      <div className="info-page-inner">

        {/* Back */}
        <Link href="/" className="info-back">
          <ArrowLeft size={15} /> Back to app
        </Link>

        <h1 className="info-title">How to Use Resume Wizard</h1>
        <p className="info-subtitle">Get the most out of your analysis in 3 simple steps.</p>

        {/* Steps */}
        <div className="info-steps">
          <div className="info-step">
            <div className="info-step-num">1</div>
            <div className="info-step-body">
              <h3>Upload your resume</h3>
              <p>Drag and drop or click to upload. Supported formats: <strong>PDF, DOCX, or TXT</strong>. Max 10 MB.</p>
              <ul>
                <li>Use your most recent version</li>
                <li>Make sure text is selectable — scanned image PDFs won't parse correctly</li>
                <li>DOCX and TXT give the cleanest results</li>
              </ul>
            </div>
          </div>

          <div className="info-step">
            <div className="info-step-num">2</div>
            <div className="info-step-body">
              <h3>Paste the full job description</h3>
              <p>Copy the entire job posting — not just the title. The more detail, the better the analysis.</p>
              <ul>
                <li>Include requirements, responsibilities, and preferred qualifications</li>
                <li>Copy directly from LinkedIn, company career pages, or job boards</li>
                <li>Limit is 1800 characters — paste the most important sections if it's very long</li>
              </ul>
            </div>
          </div>

          <div className="info-step">
            <div className="info-step-num">3</div>
            <div className="info-step-body">
              <h3>Click Analyze Resume</h3>
              <p>Results appear in under 15 seconds. You'll get 5 tabs of analysis.</p>
            </div>
          </div>
        </div>

        {/* Result tabs explained */}
        <h2 className="info-section-title">Understanding your results</h2>

        <div className="info-tabs-grid">
          <div className="info-tab-card info-tab-card--free">
            <div className="info-tab-card-header">
              <Star size={16} />
              <span>Feedback</span>
              <span className="info-free-tag">Free</span>
            </div>
            <p>Your overall match score out of 10 with a plain-English rationale, plus a breakdown across 6 categories:</p>
            <ul>
              <li><strong>Keyword Match</strong> — are the right terms from the JD in your resume?</li>
              <li><strong>Work Experience</strong> — does your history align with the role level?</li>
              <li><strong>Skills Alignment</strong> — technical and soft skills coverage</li>
              <li><strong>Impact & Metrics</strong> — do you show results, not just responsibilities?</li>
              <li><strong>Formatting & Clarity</strong> — is it ATS-friendly and easy to read?</li>
              <li><strong>Quick Wins</strong> — the 3 highest-impact changes you can make right now</li>
            </ul>
          </div>

          <div className="info-tab-card">
            <div className="info-tab-card-header">
              <FileText size={16} />
              <span>Resume Corrections</span>
              <span className="info-paid-tag"><Lock size={10} /> Paid</span>
            </div>
            <p>Side-by-side before/after rewrites of your actual resume bullet points — stronger language, better aligned to the JD. <strong>Nothing is fabricated</strong> — every rewrite is grounded in what's already on your resume.</p>
          </div>

          <div className="info-tab-card">
            <div className="info-tab-card-header">
              <Briefcase size={16} />
              <span>Cover Letter</span>
              <span className="info-paid-tag"><Lock size={10} /> Paid</span>
            </div>
            <p>A tailored ~150-word cover letter that references your actual experience and speaks directly to this specific role. Copy or download instantly.</p>
          </div>

          <div className="info-tab-card">
            <div className="info-tab-card-header">
              <Zap size={16} />
              <span>Message to Manager</span>
              <span className="info-paid-tag"><Lock size={10} /> Paid</span>
            </div>
            <p>A short, direct note to the hiring manager — not a cover letter. Conversational, confident, and specific to this role. Great for LinkedIn outreach or referral requests.</p>
          </div>

          <div className="info-tab-card">
            <div className="info-tab-card-header">
              <CheckCircle2 size={16} />
              <span>Why I'm the Best Fit</span>
              <span className="info-paid-tag"><Lock size={10} /> Paid</span>
            </div>
            <p>5–6 bullet points connecting your specific strengths directly to what this role needs. Useful for interview prep or framing your pitch.</p>
          </div>
        </div>

        {/* Tips */}
        <h2 className="info-section-title">Tips for a better score</h2>
        <div className="info-tips">
          <div className="info-tip">
            <span className="info-tip-icon">💡</span>
            <div>
              <strong>Mirror the job description language.</strong> If the JD says "cross-functional collaboration", use that phrase — not "worked with different teams". ATS systems and AI both score on keyword matching.
            </div>
          </div>
          <div className="info-tip">
            <span className="info-tip-icon">📊</span>
            <div>
              <strong>Add metrics wherever possible.</strong> "Led a team" scores lower than "Led a team of 8, reducing deployment time by 30%". Numbers make impact concrete.
            </div>
          </div>
          <div className="info-tip">
            <span className="info-tip-icon">🎯</span>
            <div>
              <strong>Tailor for each application.</strong> One resume rarely fits all jobs. Use the corrections tab to adjust your bullet points for each role — especially for senior positions.
            </div>
          </div>
          <div className="info-tip">
            <span className="info-tip-icon">⚠️</span>
            <div>
              <strong>Scores are intentionally honest.</strong> Most resumes score 4–7. A 6 doesn't mean your resume is bad — it means there's room to align it better with this specific role.
            </div>
          </div>
        </div>

        {/* Pricing reminder */}
        <div className="info-pricing-bar">
          <div className="info-pricing-item">
            <div className="info-pricing-name">Free</div>
            <div className="info-pricing-desc">3 analyses · Score + 6-category feedback</div>
          </div>
          <div className="info-pricing-divider" />
          <div className="info-pricing-item">
            <div className="info-pricing-name">$0.99 <span>/ analysis</span></div>
            <div className="info-pricing-desc">All 5 tabs · No subscription</div>
          </div>
          <div className="info-pricing-divider" />
          <div className="info-pricing-item">
            <div className="info-pricing-name">$5.99 <span>/ month</span></div>
            <div className="info-pricing-desc">15 analyses · Cancel anytime</div>
          </div>
        </div>

        <div className="info-footer">
          <Link href="/" className="info-back">
            <ArrowLeft size={15} /> Back to app
          </Link>
        </div>

      </div>
    </div>
  );
}
