"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ReauthModalProps {
  userEmail: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ReauthModal({ userEmail, onSuccess, onClose }: ReauthModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(true); // auto-sends on mount
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Auto-send OTP when modal opens
  useEffect(() => {
    sendOTP();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for resend
  useEffect(() => {
    if (canResend) return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); setCanResend(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [canResend]);

  const sendOTP = async () => {
    setSending(true);
    setError("");
    try {
      // Use Supabase reauthenticate for existing users
      const { error } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: { shouldCreateUser: false },
      });
      if (error) setError("Could not send code. Please try again.");
    } catch {
      setError("Network error. Please check your connection.");
    }
    setSending(false);
  };

  const handleResend = async () => {
    setResending(true);
    setCanResend(false);
    setCountdown(60);
    setCode("");
    setError("");
    await sendOTP();
    setResending(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: userEmail,
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("Invalid or expired code. Please check your email and try again.");
    } else {
      onSuccess();
    }
  };

  return (
    /* Overlay */
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5, 15, 28, 0.85)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "var(--navy-mid)",
        border: "1px solid var(--navy-border)",
        borderRadius: "24px",
        padding: "44px 36px",
        maxWidth: "400px",
        width: "100%",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        animation: "fadeInUp 0.3s ease",
        position: "relative",
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "18px",
          background: "none", border: "none", color: "var(--white-muted)",
          fontSize: "1.3rem", cursor: "pointer", padding: "4px",
        }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "rgba(230,57,70,0.1)",
            border: "2px solid rgba(230,57,70,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2rem", margin: "0 auto 18px",
          }}>🔐</div>

          <h2 style={{ fontSize: "1.3rem", fontWeight: 900, margin: "0 0 8px" }}>
            Security Verification
          </h2>
          <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0, lineHeight: 1.7 }}>
            {sending
              ? "Sending a 6-digit security code to your email…"
              : <>To protect your booking, enter the code sent to<br /><strong style={{ color: "var(--white-soft)" }}>{userEmail}</strong></>
            }
          </p>
        </div>

        {sending ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div className="spinner" style={{ margin: "0 auto", width: "32px", height: "32px" }} />
          </div>
        ) : (
          <>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: "16px", fontSize: "0.83rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Large OTP input */}
              <div>
                <label className="form-label" style={{ textAlign: "center", display: "block", marginBottom: "10px" }}>
                  Enter 6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                  style={{
                    textAlign: "center",
                    fontSize: "2rem",
                    fontWeight: 900,
                    letterSpacing: "0.4em",
                    padding: "16px 12px",
                    borderColor: code.length === 6 ? "rgba(52,211,153,0.4)" : undefined,
                  }}
                />
                <p style={{ textAlign: "center", color: "var(--white-muted)", fontSize: "0.73rem", margin: "6px 0 0" }}>
                  Code expires in 10 minutes
                </p>
              </div>

              {/* Verify button */}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                style={{ width: "100%", padding: "14px", fontWeight: 700, fontSize: "0.95rem" }}
              >
                {loading ? "Verifying…" : "Verify & Continue to Payment →"}
              </button>
            </form>

            {/* Resend */}
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              {canResend ? (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "0.83rem", fontWeight: 600 }}
                >
                  {resending ? "Sending…" : "📧 Resend code"}
                </button>
              ) : (
                <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: 0 }}>
                  Resend code in <strong style={{ color: "var(--white-soft)" }}>{countdown}s</strong>
                </p>
              )}
            </div>

            {/* Security note */}
            <div style={{
              marginTop: "20px",
              background: "var(--navy)",
              borderRadius: "10px",
              padding: "12px 14px",
              display: "flex", alignItems: "flex-start", gap: "10px",
            }}>
              <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>🛡️</span>
              <p style={{ color: "var(--white-muted)", fontSize: "0.75rem", margin: 0, lineHeight: 1.6 }}>
                This code verifies your identity before any payment is processed. Your booking details and personal information are securely encrypted.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
