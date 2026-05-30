"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<"duplicate" | "general" | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType("");

    // Client-side validation
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);

    // ─────────────────────────────────────────────────────────────────
    // DUPLICATE EMAIL CHECK — Supabase's signUp with an existing email
    // (when email confirmation is OFF) returns identities: [] — empty.
    // We detect this and show a clear "email already in use" message.
    // ─────────────────────────────────────────────────────────────────
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim() },
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      },
    });

    if (signUpError) {
      setLoading(false);
      const msg = signUpError.message?.toLowerCase() || "";

      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user already registered") ||
        msg.includes("duplicate") ||
        msg.includes("email address is already")
      ) {
        setErrorType("duplicate");
        setError(email.trim().toLowerCase());
      } else if (msg.includes("password") && msg.includes("weak")) {
        setError("Your password is too weak. Use a mix of letters, numbers and symbols.");
      } else if (msg.includes("valid email") || msg.includes("invalid email")) {
        setError("Please enter a valid email address.");
      } else {
        setErrorType("general");
        setError(signUpError.message);
      }
      return;
    }

    // ── Duplicate detection via empty identities (Supabase behaviour when
    //    email confirmation is disabled and email already exists) ─────────
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      setLoading(false);
      setErrorType("duplicate");
      setError(email.trim().toLowerCase());
      return;
    }

    // ── Session exists → email confirmation is DISABLED in Supabase;
    //    user is already active — create profile and redirect immediately ─
    if (data.session) {
      await supabase.from("profiles").upsert(
        { id: data.user!.id, full_name: fullName.trim(), phone: phone.trim() || "", role: "customer" },
        { onConflict: "id" }
      );
      // No need to redirect — AuthContext will pick up the session and
      // the useEffect above will redirect to "/"
      return;
    }

    // ── No session → email confirmation IS enabled.
    //    Create profile row so it exists when they confirm. ────────────────
    if (data.user) {
      await supabase.from("profiles").upsert(
        { id: data.user.id, full_name: fullName.trim(), phone: phone.trim() || "", role: "customer" },
        { onConflict: "id" }
      );
    }

    setLoading(false);
    router.push("/auth/check-email?email=" + encodeURIComponent(email.trim().toLowerCase()));
  };

  const handleOAuth = async (provider: "google") => {
    setOauthLoading(provider);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) { setError(error.message); setOauthLoading(null); }
  };

  const pwStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const pwColors = ["transparent", "#ef4444", "#fbbf24", "#34d399"];
  const pwLabels = ["", "Weak", "Good", "Strong"];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><span>Drive</span>Easy</div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join DriveEasy — rent or buy your dream car</p>

        {/* Duplicate email error */}
        {errorType === "duplicate" && (
          <div className="auth-unconfirmed-banner" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>📧</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#fbbf24", margin: "0 0 4px", fontSize: "0.92rem" }}>
                  Email already registered
                </p>
                <p style={{ color: "var(--white-muted)", margin: "0 0 10px", fontSize: "0.83rem", lineHeight: 1.5 }}>
                  <strong style={{ color: "var(--white-soft)" }}>{error}</strong> is already linked to a DriveEasy account.
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Link href="/login"
                    style={{ background: "var(--red)", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}>
                    Sign In Instead →
                  </Link>
                  <Link href="/auth/forgot-password"
                    style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24", padding: "8px 14px", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none" }}>
                    Forgot Password?
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General error */}
        {errorType === "general" && error && (
          <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>
        )}
        {errorType === "" && error && (
          <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>
        )}

        {/* OAuth */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          <button
            onClick={() => handleOAuth("google")}
            disabled={!!oauthLoading || loading}
            className="oauth-btn"
            id="google-register-btn"
          >
            {oauthLoading === "google" ? <div className="spinner" style={{ width: "18px", height: "18px" }} /> : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {oauthLoading === "google" ? "Connecting…" : "Sign up with Google"}
          </button>
        </div>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">OR</span>
          <div className="auth-divider-line" />
        </div>

        <form className="auth-form" onSubmit={handleRegister} noValidate>
          <div className="register-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label" htmlFor="reg-name">Full Name *</label>
              <input id="reg-name" type="text" placeholder="e.g. Fokou Emmanuel" value={fullName}
                onChange={e => setFullName(e.target.value)} required autoComplete="name" disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Phone <span style={{ color: "var(--white-muted)", fontWeight: 400 }}>(optional)</span></label>
              <input id="reg-phone" type="tel" placeholder="+237 6XX XXX XXX" value={phone}
                onChange={e => setPhone(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email *</label>
              <input id="reg-email" type="email" placeholder="you@example.com" value={email}
                onChange={e => { setEmail(e.target.value); if (errorType === "duplicate") { setError(""); setErrorType(""); } }}
                required autoComplete="email" autoCapitalize="none" disabled={loading}
                style={{ borderColor: errorType === "duplicate" ? "#fbbf24" : undefined }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password *</label>
            <div style={{ position: "relative" }}>
              <input id="reg-password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters"
                value={password} onChange={e => setPassword(e.target.value)} required
                autoComplete="new-password" style={{ paddingRight: "44px" }} disabled={loading} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--white-muted)", cursor: "pointer", fontSize: "1rem", padding: 0, minHeight: "unset" }}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ marginTop: "6px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "3px" }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ flex: 1, height: "3px", borderRadius: "100px", background: i <= pwStrength ? pwColors[pwStrength] : "var(--navy-border)", transition: "background 0.3s" }} />
                  ))}
                </div>
                <p style={{ fontSize: "0.72rem", color: pwColors[pwStrength], margin: 0 }}>{pwLabels[pwStrength]}</p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password *</label>
            <div style={{ position: "relative" }}>
              <input id="reg-confirm" type={showConfirm ? "text" : "password"} placeholder="Repeat password"
                value={confirm} onChange={e => setConfirm(e.target.value)} required
                style={{ paddingRight: "44px", borderColor: confirm && confirm !== password ? "var(--red)" : undefined }}
                disabled={loading} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--white-muted)", cursor: "pointer", fontSize: "1rem", padding: 0, minHeight: "unset" }}>
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {confirm && confirm !== password && (
              <p style={{ color: "var(--red)", fontSize: "0.75rem", margin: "4px 0 0" }}>Passwords do not match</p>
            )}
          </div>

          <button type="submit" id="create-account-btn" className="btn-full" disabled={loading} style={{ marginTop: "8px" }}>
            {loading ? (
              <><div className="spinner" style={{ width: "16px", height: "16px" }} />Creating Account…</>
            ) : "Create Free Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>

        <p style={{ textAlign: "center", color: "var(--white-muted)", fontSize: "0.72rem", marginTop: "20px", lineHeight: 1.7 }}>
          By creating an account, you agree to DriveEasy&apos;s{" "}
          <Link href="/terms" style={{ color: "var(--white-soft)" }}>Terms of Service</Link> and{" "}
          <Link href="/privacy" style={{ color: "var(--white-soft)" }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}