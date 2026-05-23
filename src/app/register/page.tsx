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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      },
    });

    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, full_name: fullName.trim(), phone: phone.trim() || null, role: "customer" });
    }

    setLoading(false);
    // Show email confirmation prompt instead of auto-login
    setError("");
    // Redirect to a page that tells them to check email
    router.push("/auth/check-email?email=" + encodeURIComponent(email));
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

  const pwStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const pwColors = ["transparent", "#ef4444", "#fbbf24", "#34d399"];
  const pwLabels = ["", "Weak", "Good", "Strong"];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><span>Drive</span>Easy</div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join DriveEasy — rent or buy your dream car</p>

        {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

        {/* OAuth */}
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
            {oauthLoading === "google" ? "Connecting…" : "Sign up with Google"}
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
            {oauthLoading === "apple" ? "Connecting…" : "Sign up with Apple"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--navy-border)" }} />
          <span style={{ color: "var(--white-muted)", fontSize: "0.78rem", fontWeight: 500 }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "var(--navy-border)" }} />
        </div>

        <form className="auth-form" onSubmit={handleRegister}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Full Name *</label>
              <input type="text" placeholder="e.g. Fokou Emmanuel" value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone <span style={{ color: "var(--white-muted)", fontWeight: 400 }}>(optional)</span></label>
              <input type="tel" placeholder="+237 6XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" style={{ paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--white-muted)", cursor: "pointer", fontSize: "1rem", padding: 0 }}>
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
            <label className="form-label">Confirm Password *</label>
            <div style={{ position: "relative" }}>
              <input type={showConfirm ? "text" : "password"} placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ paddingRight: "44px", borderColor: confirm && confirm !== password ? "var(--red)" : undefined }} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--white-muted)", cursor: "pointer", fontSize: "1rem", padding: 0 }}>
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-full" disabled={loading} style={{ marginTop: "8px" }}>
            {loading ? "Creating Account…" : "Create Free Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>

        <p style={{ textAlign: "center", color: "var(--white-muted)", fontSize: "0.72rem", marginTop: "20px", lineHeight: 1.7 }}>
          By creating an account, you agree to DriveEasy&apos;s{" "}
          <span style={{ color: "var(--white-soft)", cursor: "pointer" }}>Terms of Service</span> and{" "}
          <span style={{ color: "var(--white-soft)", cursor: "pointer" }}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}