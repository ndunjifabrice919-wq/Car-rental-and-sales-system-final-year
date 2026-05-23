"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface RatingModalProps {
  rentalId: string;
  vehicleId: string;
  vehicleName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RatingModal({ rentalId, vehicleId, vehicleName, onClose, onSuccess }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    setError("");
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not logged in."); setLoading(false); return; }

    const { error } = await supabase.from("reviews").insert({
      rental_id: rentalId,
      vehicle_id: vehicleId,
      user_id: session.user.id,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      if (error.code === "23505") setError("You have already reviewed this rental.");
      else setError(error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    onSuccess();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,15,28,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease" }}>
      <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "24px", padding: "44px 36px", maxWidth: "440px", width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", animation: "fadeInUp 0.3s ease", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "18px", background: "none", border: "none", color: "var(--white-muted)", fontSize: "1.3rem", cursor: "pointer" }}>✕</button>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "14px" }}>⭐</div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 900, margin: "0 0 6px" }}>Rate your experience</h2>
          <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0 }}>{vehicleName}</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Stars */}
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: "4px",
                    fontSize: "2.2rem", transition: "transform 0.15s ease",
                    transform: (hovered || rating) >= star ? "scale(1.15)" : "scale(1)",
                    filter: (hovered || rating) >= star ? "none" : "grayscale(1) opacity(0.4)",
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>
            {(hovered || rating) > 0 && (
              <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.9rem", margin: 0, transition: "all 0.2s" }}>
                {labels[hovered || rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="form-group">
            <label className="form-label">Your review <span style={{ color: "var(--white-muted)", fontWeight: 400 }}>(optional)</span></label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Tell others about your experience with this vehicle…"
              rows={3}
              maxLength={500}
              style={{ resize: "vertical", minHeight: "80px" }}
            />
            <p style={{ color: "var(--white-muted)", fontSize: "0.72rem", textAlign: "right", margin: "4px 0 0" }}>{comment.length}/500</p>
          </div>

          <button type="submit" disabled={loading || rating === 0} style={{ width: "100%", padding: "13px", fontWeight: 700 }}>
            {loading ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
