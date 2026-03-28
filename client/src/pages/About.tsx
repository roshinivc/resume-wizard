import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Linkedin, ExternalLink, Star } from "lucide-react";
import FeedbackModal from "@/components/FeedbackModal";
import { API_BASE } from "@/lib/queryClient";

interface Review {
  name: string;
  rating: number;
  review: string;
  created_at: string;
}

export default function About() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/feedback`)
      .then(r => r.json())
      .then(d => { if (d.reviews) setReviews(d.reviews); })
      .catch(() => {});
  }, [showFeedback]);

  return (
    <div className="info-page">
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      <div className="info-page-inner">

        {/* Back */}
        <Link href="/" className="info-back">
          <ArrowLeft size={15} /> Back to app
        </Link>

        <h1 className="info-title">About Resume Wizard</h1>

        {/* Story */}
        <div className="about-story">
          <div className="about-avatar">
            <img src="/logo.png" alt="Resume Wizard" className="about-logo" />
          </div>
          <div className="about-story-body">
            <h2 className="about-name">Built by Roshini V.</h2>
            <p className="about-role">Senior Program Manager · AI &amp; Product Enthusiast</p>
            <p className="about-bio">
              Job hunting is exhausting. You spend hours tailoring resumes, writing cover letters,
              and second-guessing every word — only to hear nothing back. I built Resume Wizard
              because I was going through that exact process and wanted honest, specific feedback
              without the fluff.
            </p>
            <p className="about-bio">
              This isn't a generic resume grader. It reads your actual resume against the specific
              job you're applying for and tells you exactly where the gaps are — and how to fix them.
              Everything is grounded in what's already on your resume. No fabrication, no inflated scores.
            </p>
            <p className="about-bio">
              I'm still on my own job search journey. If this tool helps even one person land an interview
              they deserved, it was worth building.
            </p>

            {/* LinkedIn CTA */}
            <div className="about-linkedin">
              <a
                href="https://www.linkedin.com/in/roshiniv"
                target="_blank"
                rel="noopener noreferrer"
                className="about-linkedin-btn"
              >
                <Linkedin size={16} />
                Connect on LinkedIn
                <ExternalLink size={12} />
              </a>
              <p className="about-linkedin-note">
                Hiring for a <strong>Product Manager</strong> or <strong>Program Manager</strong> role?
                I'd love to connect.
              </p>
            </div>
          </div>
        </div>

        {/* What it is */}
        <h2 className="info-section-title">What Resume Wizard does</h2>
        <div className="about-features">
          <div className="about-feature">
            <span className="about-feature-icon">🎯</span>
            <div>
              <strong>Honest scoring</strong>
              <p>A match score out of 10 based on how well your resume aligns with the specific job description. Most scores land between 4–7 — that's intentional, not a bug.</p>
            </div>
          </div>
          <div className="about-feature">
            <span className="about-feature-icon">✏️</span>
            <div>
              <strong>Truth-grounded corrections</strong>
              <p>Before/after rewrites of your actual resume bullet points. Every correction is based only on what you've already written — nothing invented.</p>
            </div>
          </div>
          <div className="about-feature">
            <span className="about-feature-icon">📄</span>
            <div>
              <strong>Ready-to-use outputs</strong>
              <p>Tailored cover letter, direct message to the hiring manager, and a "why I'm the best fit" summary — all specific to the role you're applying for.</p>
            </div>
          </div>
          <div className="about-feature">
            <span className="about-feature-icon">🔒</span>
            <div>
              <strong>Privacy first</strong>
              <p>Your resume is processed and discarded — nothing is stored after the analysis. Only your usage count is tracked (by email) to enforce the free tier.</p>
            </div>
          </div>
        </div>

        {/* Feedback section */}
        <h2 className="info-section-title">Reviews</h2>
        <div className="about-feedback">
          <p className="about-feedback-sub">Did Resume Wizard help with your job search? Leave a quick review — 200 words or less.</p>
          <button className="about-feedback-btn" onClick={() => setShowFeedback(true)}>
            Leave a Review
          </button>
          <p className="about-feedback-alt">Or reach me on <a href="https://www.linkedin.com/in/roshiniv" target="_blank" rel="noopener noreferrer">LinkedIn</a></p>
        </div>

        {/* Reviews list */}
        {reviews.length > 0 && (
          <div className="reviews-list">
            {reviews.map((r, i) => (
              <div key={i} className="review-card">
                <div className="review-header">
                  <span className="review-name">{r.name}</span>
                  <div className="review-stars">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} className={s <= r.rating ? "star-filled" : "star-empty"} />
                    ))}
                  </div>
                </div>
                <p className="review-text">{r.review}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tech note */}
        <div className="about-tech">
          <p>Built with React, Vercel, Supabase, Stripe, and Claude AI (Anthropic). <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer">Built with Perplexity Computer</a>.</p>
        </div>

        {/* Links */}
        <div className="about-links">
          <a href="https://roshinivc.github.io/resume-wizard/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <span>·</span>
          <a href="https://roshinivc.github.io/resume-wizard/terms.html" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          <span>·</span>
          <a href="https://www.linkedin.com/in/roshiniv" target="_blank" rel="noopener noreferrer">LinkedIn</a>
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
