"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<"general" | "unconfirmed" | "invalid" | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const loginTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect already-logged-in users
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (prof?.role === "admin" || prof?.role === "owner") {
          router.replace("/admin");
        } else {
          router.replace("/");
        }
      }
    });
  }, [router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType("");
    setSuccessMsg("");
    setResendSent(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      setErrorType("general");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      setErrorType("general");
      return;
    }

    setLoading(true);

    // 10-second timeout guard — prevents infinite loading
    loginTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError("Login is taking too long. Please check your internet connection and try again.");
      setErrorType("general");
    }, 10000);

    try {
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);

      if (signInError) {
        setLoading(false);
        const msg = signInError.message?.toLowerCase() || "";

        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          setErrorType("unconfirmed");
          setError("Your email hasn't been confirmed yet. Check your inbox for the confirmation link.");
        } else if (
          msg.includes("invalid login") ||
          msg.includes("invalid credentials") ||
          msg.includes("wrong password") ||
          msg.includes("user not found") ||
          msg.includes("no user found")
        ) {
          setErrorType("invalid");
          setError("Incorrect email or password. Please try again.");
        } else if (msg.includes("rate limit") || msg.includes("too many")) {
          setErrorType("general");
          setError("Too many login attempts. Please wait a few minutes and try again.");
        } else if (msg.includes("network") || msg.includes("fetch")) {
          setErrorType("general");
          setError("Network error. Please check your connection and try again.");
        } else {
          setErrorType("general");
          setError(signInError.message || "Login failed. Please try again.");
        }
        return;
      }

      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (prof?.role === "admin" || prof?.role === "owner") {
          router.replace("/admin");
        } else {
          router.replace("/");
        }
      } else {
        setLoading(false);
        setError("Something went wrong. Please try again.");
        setErrorType("general");
      }
    } catch (err: any) {
      if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
      setLoading(false);
      setError("An unexpected error occurred. Please try again.");
      setErrorType("general");
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError("Please enter your email address above first.");
      return;
    }
    setResendLoading(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      },
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

  const handleOAuth = async (provider: "google") => {
    setOauthLoading(provider);
    setError("");
    setErrorType("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setError(error.message);
      setErrorType("general");
      setOauthLoading(null);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><span>Drive</span>Easy</div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to access your account</p>

        {/* Success message */}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: "16px" }}>
            {successMsg}
          </div>
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

        {/* Email not confirmed banner — prominent and actionable */}
        {errorType === "unconfirmed" && (
          <div className="auth-unconfirmed-banner" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>📧</span>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontWeight: 700, color: "#fbbf24", margin: "0 0 4px", fontSize: "0.92rem"
                }}>
                  Email not confirmed
                </p>
                <p style={{ color: "var(--white-muted)", margin: "0 0 12px", fontSize: "0.83rem", lineHeight: 1.5 }}>
                  You need to confirm your email before you can sign in. Check your inbox for a confirmation link from DriveEasy.
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
                      background: "rgba(251,191,36,0.15)",
                      border: "1px solid rgba(251,191,36,0.4)",
                      color: "#fbbf24",
                      padding: "8px 16px",
                      fontSize: "0.83rem",
                      fontWeight: 700,
                      borderRadius: "8px",
                      cursor: resendLoading ? "not-allowed" : "pointer",
                      minHeight: "unset",
                    }}
                  >
                    {resendLoading ? "Sending…" : "📨 Resend confirmation email"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* OAuth buttons */}
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
              <>
                <div className="spinner" style={{ width: "16px", height: "16px" }} />
                Signing in…
              </>
            ) : "Sign In with Email"}
          </button>
        </form>

        <div className="auth-footer">
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