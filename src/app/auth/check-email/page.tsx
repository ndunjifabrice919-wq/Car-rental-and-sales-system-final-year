"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CheckEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)", padding: "20px" }}>
      <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "24px", padding: "52px 40px", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", animation: "fadeInUp 0.4s ease" }}>

        <div style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "28px" }}>
          <span style={{ color: "var(--red)" }}>Drive</span>Easy
        </div>

        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(96,165,250,0.1)", border: "2px solid rgba(96,165,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem", margin: "0 auto 24px" }}>
          📬
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0 0 12px", color: "#60a5fa" }}>
          Check your inbox!
        </h1>
        <p style={{ color: "var(--white-muted)", fontSize: "0.92rem", lineHeight: 1.8, margin: "0 0 8px" }}>
          We sent a confirmation email to
        </p>
        <p style={{ color: "var(--white-soft)", fontWeight: 700, fontSize: "1rem", margin: "0 0 24px", wordBreak: "break-all" }}>
          {email}
        </p>
        <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", lineHeight: 1.7, margin: "0 0 32px" }}>
          Click the link in the email to activate your account. After confirming, you&apos;ll be taken to the DriveEasy platform ready to use.
        </p>

        {/* Steps */}
        <div style={{ background: "var(--navy)", borderRadius: "14px", padding: "20px 24px", marginBottom: "28px", textAlign: "left" }}>
          <p style={{ fontWeight: 700, margin: "0 0 14px", fontSize: "0.88rem" }}>What to do next:</p>
          {[
            { step: "1", text: "Open your email app" },
            { step: "2", text: "Find the email from DriveEasy" },
            { step: "3", text: "Click \"Confirm My Account\"" },
            { step: "4", text: "You'll be logged in automatically" },
          ].map(s => (
            <div key={s.step} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
              <span style={{ color: "var(--white-soft)", fontSize: "0.85rem" }}>{s.text}</span>
            </div>
          ))}
        </div>

        <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: "0 0 20px" }}>
          Didn&apos;t receive it? Check your spam folder. It may take 1–2 minutes.
        </p>

        <button onClick={() => router.push("/login")} style={{ width: "100%", padding: "13px", fontWeight: 700 }}>
          Back to Login
        </button>
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
