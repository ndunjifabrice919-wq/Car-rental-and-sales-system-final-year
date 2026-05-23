"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)", padding: "20px" }}>
      <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "24px", padding: "48px 36px", maxWidth: "420px", width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", animation: "fadeInUp 0.35s ease" }}>

        <div style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: 900, marginBottom: "28px" }}>
          <span style={{ color: "var(--red)" }}>Drive</span>Easy
        </div>

        {!sent ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: "rgba(230,57,70,0.1)", border: "2px solid rgba(230,57,70,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.9rem", margin: "0 auto 18px" }}>🔑</div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 900, margin: "0 0 8px" }}>Forgot your password?</h1>
              <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", margin: 0, lineHeight: 1.7 }}>Enter the email linked to your account and we&apos;ll send you a reset link instantly.</p>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", fontWeight: 700, fontSize: "0.95rem" }}>
                {loading ? "Sending reset link…" : "Send Reset Link"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <Link href="/login" style={{ color: "var(--white-muted)", fontSize: "0.85rem" }}>← Back to Login</Link>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(52,211,153,0.1)", border: "2px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 24px" }}>📬</div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 900, margin: "0 0 10px", color: "#34d399" }}>Check your inbox!</h1>
            <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", margin: "0 0 6px", lineHeight: 1.7 }}>
              We sent a password reset link to<br /><strong style={{ color: "var(--white-soft)" }}>{email}</strong>
            </p>
            <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: "0 0 28px" }}>Didn&apos;t get it? Check spam or try again.</p>
            <button onClick={() => setSent(false)} style={{ width: "100%", background: "transparent", border: "1px solid var(--navy-border)", color: "var(--white-muted)", padding: "11px", marginBottom: "10px" }}>
              Try a different email
            </button>
            <button onClick={() => router.push("/login")} style={{ width: "100%", padding: "11px", fontWeight: 700 }}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
