"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { emailVerificationCode } from "@/lib/email";

// ── Helpers ─────────────────────────────────────────────────
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function LoginPage() {
  const router = useRouter();

  // ── Step state ──────────────────────────────────────────────
  const [step, setStep] = useState<"credentials" | "otp">("credentials");

  // ── Step 1 state ────────────────────────────────────────────
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [errorType, setErrorType]   = useState<"general" | "unconfirmed" | "invalid" | "">("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // ── Step 2 (OTP) state ──────────────────────────────────────
  const [otpCode, setOtpCode]           = useState("");             // the code user types
  const [generatedCode, setGeneratedCode] = useState("");           // the code we generated
  const [otpUserName, setOtpUserName]   = useState("");
  const [devFallback, setDevFallback]   = useState(false);          // EmailJS not configured
  const [devCode, setDevCode]           = useState("");             // code shown in dev banner
  const [otpError, setOtpError]         = useState("");
  const [otpLoading, setOtpLoading]     = useState(false);
  const [resending, setResending]       = useState(false);
  const [secondsLeft, setSecondsLeft]   = useState(600);            // 10-minute expiry
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<any>(null);                             // holds the supabase session

  // ── Redirect already-logged-in users ────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: prof } = await supabase
          .from("profiles").select("role").eq("id", session.user.id).single();
        router.replace(prof?.role === "admin" || prof?.role === "owner" ? "/admin" : "/");
      }
    });
  }, [router]);

  // ── OTP countdown timer ─────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(600);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Step 1: verify password ──────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setErrorType(""); setSuccessMsg(""); setResendSent(false);

    if (!email.trim()) { setError("Please enter your email address."); setErrorType("general"); return; }
    if (!password)     { setError("Please enter your password.");      setErrorType("general"); return; }

    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setLoading(false);
        const msg = signInError.message?.toLowerCase() || "";
        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          setErrorType("unconfirmed");
          setError("Your email hasn't been confirmed yet. Check your inbox for the confirmation link.");
        } else if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password") || msg.includes("user not found") || msg.includes("no user found")) {
          setErrorType("invalid");
          setError("Incorrect email or password. Please try again.");
        } else if (msg.includes("rate limit") || msg.includes("too many")) {
          setErrorType("general");
          setError("Too many login attempts. Please wait a few minutes and try again.");
        } else {
          setErrorType("general");
          setError(signInError.message || "Login failed. Please try again.");
        }
        return;
      }

      if (!data?.user) {
        setLoading(false);
        setError("Something went wrong. Please try again.");
        setErrorType("general");
        return;
      }

      // ✅ Password verified — save session reference, sign out temporarily,
      //    then send OTP before granting full access.
      sessionRef.current = data.session;
      const userName = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "User";
      setOtpUserName(userName);

      // Sign out so they don't have a session until OTP is verified
      await supabase.auth.signOut();

      await triggerOTP(email.trim().toLowerCase(), userName);
      setLoading(false);

    } catch {
      setLoading(false);
      setError("An unexpected error occurred. Please try again.");
      setErrorType("general");
    }
  };

  // ── Send/Resend OTP ─────────────────────────────────────────
  const triggerOTP = async (userEmail: string, userName: string) => {
    const code = generateCode();
    setGeneratedCode(code);
    setOtpCode("");
    setOtpError("");
    startTimer();

    const sent = await emailVerificationCode({ userEmail, userName, code });

    if (!sent) {
      // EmailJS not configured — dev fallback
      setDevFallback(true);
      setDevCode(code);
    } else {
      setDevFallback(false);
      setDevCode("");
    }

    setStep("otp");
  };

  const handleResendOTP = async () => {
    setResending(true);
    await triggerOTP(email.trim().toLowerCase(), otpUserName);
    setResending(false);
  };

  // ── Step 2: verify OTP code ─────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");

    if (secondsLeft === 0) {
      setOtpError("This code has expired. Please request a new one.");
      return;
    }
    if (otpCode.trim() !== generatedCode) {
      setOtpError("Incorrect code. Please check your email and try again.");
      return;
    }

    setOtpLoading(true);

    // Re-sign in to restore the session now that OTP is verified
    const { data, error: reSignInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (reSignInError || !data?.user) {
      setOtpLoading(false);
      setOtpError("Could not complete sign-in. Please go back and try again.");
      return;
    }

    // Redirect based on role
    const { data: prof } = await supabase
      .from("profiles").select("role").eq("id", data.user.id).single();

    if (prof?.role === "admin" || prof?.role === "owner") {
      router.replace("/admin");
    } else {
      router.replace("/");
    }
  };

  // ── Cancel OTP — go back to credentials ─────────────────────
  const handleCancelOTP = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep("credentials");
    setOtpCode("");
    setOtpError("");
    setGeneratedCode("");
    setDevFallback(false);
    setDevCode("");
    setPassword(""); // clear password for security
  };

  // ── Google OAuth ─────────────────────────────────────────────
  const handleOAuth = async (provider: "google") => {
    setOauthLoading(provider);
    setError(""); setErrorType("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) { setError(error.message); setErrorType("general"); setOauthLoading(null); }
  };

  // ── Resend email confirmation ────────────────────────────────
  const handleResendConfirmation = async () => {
    if (!email.trim()) { setError("Please enter your email address above first."); return; }
    setResendLoading(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    });
    setResendLoading(false);
    if (resendError) {
      setError("Could not resend confirmation email: " + resendError.message);
    } else {
      setResendSent(true);
      setError("");
      setSuccessMsg("✅ Confirmation email resent! Check your inbox (and spam folder).");
    }
  };

  // ════════════════════════════════════════════════════════════
  // OTP SCREEN
  // ════════════════════════════════════════════════════════════
  if (step === "otp") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo"><span>Drive</span>Easy</div>

          {/* Icon */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: "rgba(96,165,250,0.1)", border: "2px solid rgba(96,165,250,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem", margin: "0 auto 16px",
              boxShadow: "0 0 24px rgba(96,165,250,0.15)",
            }}>🔐</div>
            <h1 className="auth-title" style={{ marginBottom: "6px" }}>Two-Step Verification</h1>
            <p className="auth-subtitle">
              {devFallback
                ? "Configure EmailJS to receive codes by email. For now, use the code below."
                : <>We sent a 6-digit code to <strong style={{ color: "var(--white-soft)" }}>{email}</strong></>
              }
            </p>
          </div>

          {/* ── Developer Fallback Banner ── */}
          {devFallback && (
            <div style={{
              background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)",
              borderRadius: "14px", padding: "16px 18px", marginBottom: "20px",
            }}>
              <p style={{ fontWeight: 700, color: "#fbbf24", margin: "0 0 6px", fontSize: "0.85rem" }}>
                ⚠️ Developer Mode — EmailJS not configured
              </p>
              <p style={{ color: "var(--white-muted)", margin: "0 0 10px", fontSize: "0.8rem" }}>
                Configure <code>NEXT_PUBLIC_EMAILJS_*</code> keys in <code>.env.local</code> to send real emails. Your test code is:
              </p>
              <div style={{
                background: "rgba(251,191,36,0.12)", borderRadius: "10px",
                padding: "12px 16px", textAlign: "center",
                fontFamily: "monospace", fontSize: "2rem", fontWeight: 900,
                letterSpacing: "0.3em", color: "#fbbf24",
              }}>{devCode}</div>
            </div>
          )}

          {/* ── Error ── */}
          {otpError && (
            <div className="alert alert-error" style={{ marginBottom: "16px" }}>{otpError}</div>
          )}

          {/* ── OTP Input Form ── */}
          <form onSubmit={handleVerifyOTP} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ textAlign: "center", display: "block" }}>
                Enter your 6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                maxLength={6}
                style={{
                  textAlign: "center", fontSize: "2.2rem", fontWeight: 900,
                  letterSpacing: "0.45em", padding: "18px 16px",
                  borderColor: otpCode.length === 6 ? "rgba(96,165,250,0.5)" : undefined,
                }}
              />
            </div>

            {/* Timer */}
            <div style={{ textAlign: "center" }}>
              {secondsLeft > 0 ? (
                <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>
                  Code expires in{" "}
                  <span style={{ color: secondsLeft < 60 ? "var(--red)" : "#60a5fa", fontWeight: 700 }}>
                    {fmtTime(secondsLeft)}
                  </span>
                </p>
              ) : (
                <p style={{ color: "var(--red)", fontSize: "0.82rem", fontWeight: 600, margin: 0 }}>
                  ⏰ Code expired — request a new one below
                </p>
              )}
            </div>

            <button
              type="submit"
              id="verify-otp-btn"
              className="btn-full"
              disabled={otpLoading || otpCode.length !== 6 || secondsLeft === 0}
            >
              {otpLoading ? (
                <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Verifying…</>
              ) : "✅ Verify & Sign In"}
            </button>
          </form>

          {/* ── Resend + Cancel ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", flexWrap: "wrap", gap: "10px" }}>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resending}
              style={{
                background: "none", border: "none", color: "var(--red)",
                cursor: resending ? "not-allowed" : "pointer",
                fontSize: "0.83rem", fontWeight: 600, padding: 0,
              }}
            >
              {resending ? "Sending…" : "📨 Resend code"}
            </button>
            <button
              type="button"
              onClick={handleCancelOTP}
              style={{
                background: "none", border: "none", color: "var(--white-muted)",
                cursor: "pointer", fontSize: "0.83rem", padding: 0,
              }}
            >
              ← Back to login
            </button>
          </div>

          <p style={{ textAlign: "center", color: "var(--white-muted)", fontSize: "0.73rem", marginTop: "24px", lineHeight: 1.7 }}>
            This extra step keeps your account safe. Even if someone knows your password, they cannot sign in without access to your email.
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // CREDENTIALS SCREEN (Step 1)
  // ════════════════════════════════════════════════════════════
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><span>Drive</span>Easy</div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to access your account</p>

        {/* Success message */}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: "16px" }}>{successMsg}</div>
        )}

        {/* General error */}
        {error && errorType !== "unconfirmed" && (
          <div className="alert alert-error" style={{ marginBottom: "16px" }}>
            {error}
            {errorType === "invalid" && (
              <div style={{ marginTop: "8px" }}>
                <Link href="/auth/forgot-password" style={{ color: "#fbbf24", fontWeight: 600, fontSize: "0.85rem" }}>
                  Forgot your password? →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Email not confirmed banner */}
        {errorType === "unconfirmed" && (
          <div className="auth-unconfirmed-banner" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>📧</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#fbbf24", margin: "0 0 4px", fontSize: "0.92rem" }}>
                  Email not confirmed
                </p>
                <p style={{ color: "var(--white-muted)", margin: "0 0 12px", fontSize: "0.83rem", lineHeight: 1.5 }}>
                  You need to confirm your email before signing in. Check your inbox for the confirmation link.
                </p>
                {resendSent ? (
                  <p style={{ color: "#34d399", fontSize: "0.82rem", fontWeight: 600, margin: 0 }}>
                    ✅ Confirmation email sent! Check your inbox.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    style={{
                      background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)",
                      color: "#fbbf24", padding: "8px 16px", fontSize: "0.83rem", fontWeight: 700,
                      borderRadius: "8px", cursor: resendLoading ? "not-allowed" : "pointer", minHeight: "unset",
                    }}
                  >
                    {resendLoading ? "Sending…" : "📨 Resend confirmation email"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Google OAuth */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          <button
            onClick={() => handleOAuth("google")}
            disabled={!!oauthLoading || loading}
            className="oauth-btn"
            id="google-login-btn"
          >
            {oauthLoading === "google" ? (
              <div className="spinner" style={{ width: "18px", height: "18px" }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {oauthLoading === "google" ? "Connecting…" : "Continue with Google"}
          </button>
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">OR</span>
          <div className="auth-divider-line" />
        </div>

        {/* Email/Password form */}
        <form className="auth-form" onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="form-label" style={{ margin: 0 }} htmlFor="login-password">Password</label>
              <Link href="/auth/forgot-password" style={{ color: "var(--red)", fontSize: "0.78rem", fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: "44px" }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: "12px", top: "50%",
                  transform: "translateY(-50%)", background: "none", border: "none",
                  color: "var(--white-muted)", cursor: "pointer", fontSize: "1rem",
                  padding: 0, minHeight: "unset",
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="email-signin-btn"
            className="btn-full"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Signing in…</>
            ) : "Sign In with Email →"}
          </button>
        </form>

        {/* 2FA notice */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)",
          borderRadius: "10px", padding: "10px 14px", marginTop: "16px",
        }}>
          <span style={{ fontSize: "1rem" }}>🔐</span>
          <p style={{ color: "var(--white-muted)", fontSize: "0.75rem", margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: "#60a5fa" }}>Two-step verification is enabled.</strong>{" "}
            After entering your password, you&apos;ll receive a 6-digit code to confirm it&apos;s really you.
          </p>
        </div>

        <div className="auth-footer" style={{ marginTop: "20px" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register">Create one free</Link>
        </div>

        <div style={{ textAlign: "center", marginTop: "14px" }}>
          <Link href="/auth/otp" style={{ color: "var(--white-muted)", fontSize: "0.82rem" }}>
            Sign in with a one-time code instead →
          </Link>
        </div>

        <p style={{ textAlign: "center", color: "var(--white-muted)", fontSize: "0.72rem", marginTop: "20px", lineHeight: 1.7 }}>
          By signing in, you agree to DriveEasy&apos;s{" "}
          <Link href="/terms" style={{ color: "var(--white-soft)" }}>Terms of Service</Link> and{" "}
          <Link href="/privacy" style={{ color: "var(--white-soft)" }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}