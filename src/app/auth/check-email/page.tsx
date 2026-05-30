"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function CheckEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [resending, setResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendMsg, setResendMsg] = useState("");
  const [resendError, setResendError] = useState("");

  const handleResend = async () => {
    if (resendCount >= 3) {
      setResendError("Maximum resend attempts reached. Please wait a few minutes before trying again.");
      return;
    }
    setResending(true);
    setResendMsg("");
    setResendError("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email || "",
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    });

    setResending(false);
    if (error) {
      setResendError(error.message || "Could not resend. Please try again later.");
    } else {
      setResendCount(c => c + 1);
      setResendMsg(`✅ Confirmation email resent! (Attempt ${resendCount + 1}/3)`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)", padding: "20px" }}>
      <div style={{
        background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
        borderRadius: "24px", padding: "52px 40px", maxWidth: "500px", width: "100%",
        textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", animation: "scaleIn 0.35s ease",
      }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "28px" }}>
          <span style={{ color: "var(--red)" }}>Drive</span>Easy
        </div>

        {/* Icon */}
        <div style={{
          width: "88px", height: "88px", borderRadius: "50%",
          background: "rgba(96,165,250,0.1)", border: "2px solid rgba(96,165,250,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.4rem", margin: "0 auto 24px",
        }}>
          📬
        </div>

        <h1 style={{ fontSize: "1.55rem", fontWeight: 900, margin: "0 0 12px", color: "#60a5fa" }}>
          Check your inbox!
        </h1>
        <p style={{ color: "var(--white-muted)", fontSize: "0.92rem", lineHeight: 1.8, margin: "0 0 6px" }}>
          We sent a confirmation email to:
        </p>
        <p style={{ color: "var(--white)", fontWeight: 700, fontSize: "1rem", margin: "0 0 8px", wordBreak: "break-all" }}>
          {email || "your email address"}
        </p>
        <p style={{ color: "var(--white-muted)", fontSize: "0.83rem", lineHeight: 1.7, margin: "0 0 28px" }}>
          Click the <strong style={{ color: "var(--white-soft)" }}>Confirm My Account</strong> link in the email to activate your account. After confirming, you can sign in.
        </p>

        {/* Steps */}
        <div style={{
          background: "var(--navy)", borderRadius: "14px", padding: "18px 22px",
          marginBottom: "24px", textAlign: "left",
        }}>
          <p style={{ fontWeight: 700, margin: "0 0 12px", fontSize: "0.85rem", color: "var(--white-soft)" }}>What to do:</p>
          {[
            { n: "1", text: "Open your email app (check Spam/Junk too)" },
            { n: "2", text: "Find the email from DriveEasy" },
            { n: "3", text: "Click \"Confirm My Account\"" },
            { n: "4", text: "You'll be redirected back to sign in" },
          ].map(s => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{
                width: "22px", height: "22px", borderRadius: "50%", background: "var(--red)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.7rem", fontWeight: 800, flexShrink: 0, color: "#fff",
              }}>{s.n}</div>
              <span style={{ color: "var(--white-muted)", fontSize: "0.83rem" }}>{s.text}</span>
            </div>
          ))}
        </div>

        {/* Resend section */}
        <div style={{
          background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)",
          borderRadius: "12px", padding: "16px", marginBottom: "20px",
        }}>
          <p style={{ color: "var(--white-muted)", fontSize: "0.83rem", margin: "0 0 10px" }}>
            Didn&apos;t receive it? Check your <strong style={{ color: "var(--white-soft)" }}>spam folder</strong> first, then resend:
          </p>
          {resendMsg && <p style={{ color: "#34d399", fontSize: "0.83rem", margin: "0 0 8px", fontWeight: 600 }}>{resendMsg}</p>}
          {resendError && <p style={{ color: "#ff8080", fontSize: "0.83rem", margin: "0 0 8px" }}>{resendError}</p>}
          <button
            onClick={handleResend}
            disabled={resending || resendCount >= 3}
            style={{
              background: resendCount >= 3 ? "var(--navy-border)" : "rgba(251,191,36,0.15)",
              border: `1px solid ${resendCount >= 3 ? "transparent" : "rgba(251,191,36,0.4)"}`,
              color: resendCount >= 3 ? "var(--white-muted)" : "#fbbf24",
              padding: "9px 18px", fontSize: "0.84rem", fontWeight: 700, borderRadius: "8px",
              cursor: resendCount >= 3 ? "not-allowed" : "pointer", minHeight: "unset",
              width: "100%",
            }}
          >
            {resending ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <div className="spinner" style={{ width: "14px", height: "14px" }} /> Sending…
              </span>
            ) : resendCount >= 3 ? "Maximum attempts reached" : "📨 Resend confirmation email"}
          </button>
        </div>

        {/* OTP fallback */}
        <div style={{
          background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)",
          borderRadius: "12px", padding: "14px 16px", marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "12px", textAlign: "left",
        }}>
          <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>⚡</span>
          <div>
            <p style={{ fontSize: "0.83rem", fontWeight: 700, color: "#34d399", margin: "0 0 3px" }}>
              Skip confirmation — use OTP
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--white-muted)", margin: "0 0 6px", lineHeight: 1.5 }}>
              Already have your account? Sign in instantly with a one-time code.
            </p>
            <Link href={`/auth/otp${email ? "?email=" + encodeURIComponent(email) : ""}`}
              style={{ color: "#34d399", fontWeight: 700, fontSize: "0.8rem", textDecoration: "underline" }}>
              Sign in with OTP →
            </Link>
          </div>
        </div>

        <button
          onClick={() => router.push("/login")}
          style={{ width: "100%", padding: "13px", fontWeight: 700, marginBottom: "10px" }}
        >
          Back to Login
        </button>

        <p style={{ color: "var(--white-muted)", fontSize: "0.75rem" }}>
          Wrong email?{" "}
          <Link href="/register" style={{ color: "var(--red)", fontWeight: 600 }}>Register again</Link>
        </p>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)" }}>
        <div className="spinner" style={{ width: "40px", height: "40px" }} />
      </div>
    }>
      <CheckEmailInner />
    </Suspense>
  );
}
