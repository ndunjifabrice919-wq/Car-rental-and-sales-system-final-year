"use client";

import { useState, useEffect } from "react";
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
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/");
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else router.push("/");
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) { setError(error.message); setOauthLoading(null); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><span>Drive</span>Easy</div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to access your account</p>

        {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

        {/* OAuth buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          <button
            onClick={() => handleOAuth("google")}
            disabled={!!oauthLoading || loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", width: "100%", padding: "12px", background: "var(--navy-light)", border: "1.5px solid var(--navy-border)", color: "var(--white)", borderRadius: "10px", cursor: "pointer", fontSize: "0.92rem", fontWeight: 600, transition: "border-color 0.2s, background 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#4285f4"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(66,133,244,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--navy-border)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--navy-light)"; }}
          >
            {oauthLoading === "google" ? <div className="spinner" style={{ width: "18px", height: "18px" }} /> : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {oauthLoading === "google" ? "Connecting…" : "Continue with Google"}
          </button>

          <button
            onClick={() => handleOAuth("apple")}
            disabled={!!oauthLoading || loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", width: "100%", padding: "12px", background: "var(--navy-light)", border: "1.5px solid var(--navy-border)", color: "var(--white)", borderRadius: "10px", cursor: "pointer", fontSize: "0.92rem", fontWeight: 600, transition: "border-color 0.2s, background 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#fff"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--navy-border)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--navy-light)"; }}
          >
            {oauthLoading === "apple" ? <div className="spinner" style={{ width: "18px", height: "18px" }} /> : (
              <svg width="18" height="18" viewBox="0 0 814 1000" fill="white">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-43.4-150.3-107.1C67.3 742.5 .4 562.4 .4 390.7c0-283.7 182.2-430 360.5-430 96.3 0 176.4 63.8 236.7 63.8 58.8 0 151-67.8 260.5-67.8 42.4 0 182.6 4.4 244.8 174.5zM534.6 45.8C555 21.5 571.7-10.9 571.7-43.2c0-4.5-.4-9.1-.7-13.8-33.2 1.3-73.3 21.8-97.7 47.6-20.5 22.2-40.8 57.5-40.8 89.8 0 4.5.7 9.1 1 13.8 3.2.4 6.5.4 9.7.4 29.9.1 67.3-19.3 91.4-48.8z"/>
              </svg>
            )}
            {oauthLoading === "apple" ? "Connecting…" : "Continue with Apple"}
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--navy-border)" }} />
          <span style={{ color: "var(--white-muted)", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.05em" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "var(--navy-border)" }} />
        </div>

        {/* Email form */}
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <Link href="/auth/forgot-password" style={{ color: "var(--red)", fontSize: "0.78rem", fontWeight: 600 }}>Forgot password?</Link>
            </div>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" style={{ paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--white-muted)", cursor: "pointer", fontSize: "1rem", padding: 0 }}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-full" disabled={loading} style={{ marginTop: "8px" }}>
            {loading ? "Signing in…" : "Sign In with Email"}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/register">Create one free</Link>
        </div>

        <div style={{ textAlign: "center", marginTop: "14px" }}>
          <Link href="/auth/otp" style={{ color: "var(--white-muted)", fontSize: "0.82rem" }}>Sign in with a one-time code instead →</Link>
        </div>

        <p style={{ textAlign: "center", color: "var(--white-muted)", fontSize: "0.72rem", marginTop: "20px", lineHeight: 1.7 }}>
          By signing in, you agree to DriveEasy&apos;s{" "}
          <span style={{ color: "var(--white-soft)", cursor: "pointer" }}>Terms of Service</span> and{" "}
          <span style={{ color: "var(--white-soft)", cursor: "pointer" }}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}