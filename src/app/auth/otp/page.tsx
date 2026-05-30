"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function OTPInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);


  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setStep("code");
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) setError("Invalid or expired code. Please try again.");
    else router.push("/");
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    setResending(false);
    setCode("");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)", padding: "20px" }}>
      <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "24px", padding: "48px 36px", maxWidth: "420px", width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", animation: "fadeInUp 0.35s ease" }}>

        <div style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: 900, marginBottom: "28px" }}>
          <span style={{ color: "var(--red)" }}>Drive</span>Easy
        </div>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: "rgba(96,165,250,0.1)", border: "2px solid rgba(96,165,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.9rem", margin: "0 auto 18px" }}>✉️</div>
          {step === "email" ? (
            <>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 900, margin: "0 0 8px" }}>Sign in with OTP</h1>
              <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0, lineHeight: 1.7 }}>We&apos;ll email you a 6-digit code. No password needed.</p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 900, margin: "0 0 8px" }}>Enter your code</h1>
              <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0, lineHeight: 1.7 }}>
                We sent a 6-digit code to<br /><strong style={{ color: "var(--white-soft)" }}>{email}</strong>
              </p>
            </>
          )}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

        {step === "email" ? (
          <form onSubmit={handleSendOTP} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", fontWeight: 700 }}>
              {loading ? "Sending code…" : "Send One-Time Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">6-Digit Code</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                maxLength={6}
                style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "0.35em", padding: "16px" }}
              />
              <p style={{ color: "var(--white-muted)", fontSize: "0.75rem", margin: "5px 0 0", textAlign: "center" }}>Code expires in 10 minutes</p>
            </div>
            <button type="submit" disabled={loading || code.length !== 6} style={{ width: "100%", padding: "13px", fontWeight: 700 }}>
              {loading ? "Verifying…" : "Verify & Sign In"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} style={{ background: "none", border: "none", color: "var(--white-muted)", cursor: "pointer", fontSize: "0.83rem", padding: 0 }}>
                ← Change email
              </button>
              <button type="button" onClick={handleResend} disabled={resending} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "0.83rem", fontWeight: 600, padding: 0 }}>
                {resending ? "Sending…" : "Resend code"}
              </button>
            </div>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "24px", borderTop: "1px solid var(--navy-border)", paddingTop: "18px" }}>
          <Link href="/login" style={{ color: "var(--white-muted)", fontSize: "0.83rem" }}>Sign in with password instead</Link>
        </div>
      </div>
    </div>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)" }}>
        <div className="spinner" style={{ width: "40px", height: "40px" }} />
      </div>
    }>
      <OTPInner />
    </Suspense>
  );
}

