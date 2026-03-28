import { useState } from "react";
import { X, Star, CheckCircle2, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/queryClient";

interface Props {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const wordCount = review.trim().split(/\s+/).filter(Boolean).length;

  async function handleSubmit() {
    if (review.trim().length < 5) {
      setError("Please write at least a few words.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const email = localStorage.getItem("rw_email") || "";
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-email": email },
        body: JSON.stringify({ name: name || "Anonymous", rating, review }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="feedback-modal-backdrop" onClick={onClose}>
      <div className="feedback-modal" onClick={e => e.stopPropagation()}>
        <button className="feedback-modal-close" onClick={onClose}><X size={16} /></button>

        {!done ? (
          <>
            <h2 className="feedback-modal-title">Leave a Review</h2>
            <p className="feedback-modal-sub">How was your experience? Up to 200 words.</p>

            {/* Star rating */}
            <div className="feedback-stars">
              {[1,2,3,4,5].map(s => (
                <button
                  key={s}
                  className={`feedback-star${s <= (hoverRating || rating) ? " feedback-star--active" : ""}`}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  aria-label={`${s} star`}
                >
                  <Star size={28} />
                </button>
              ))}
            </div>

            {/* Name */}
            <input
              className="feedback-input"
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
            />

            {/* Review */}
            <textarea
              className="feedback-textarea"
              placeholder="Share your experience with Resume Wizard..."
              value={review}
              onChange={e => setReview(e.target.value)}
              rows={4}
            />
            <div className="feedback-wordcount">{wordCount} / 200 words</div>

            {error && <p className="feedback-error">{error}</p>}

            <button
              className="feedback-submit-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? "Submitting…" : "Submit Review"}
            </button>
          </>
        ) : (
          <div className="feedback-done">
            <CheckCircle2 size={44} className="feedback-done-icon" />
            <h2 className="feedback-modal-title">Thank you!</h2>
            <p className="feedback-modal-sub">Your review has been submitted. It means a lot.</p>
            <button className="feedback-submit-btn" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
