"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ResetPasswordInner() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { setError(error.message); }
    else {
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 3000);
    }
  };

  const pwStrength = newPassword.length === 0 ? 0 : newPassword.length < 8 ? 1 : newPassword.length < 12 ? 2 : 3;
  const pwColors = ["transparent", "#ef4444", "#fbbf24", "#34d399"];
  const pwLabels = ["", "Weak", "Good", "Strong"];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)", padding: "20px" }}>
      <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "24px", padding: "48px 36px", maxWidth: "420px", width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", animation: "fadeInUp 0.35s ease" }}>

        <div style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: 900, marginBottom: "28px" }}>
          <span style={{ color: "var(--red)" }}>Drive</span>Easy
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(52,211,153,0.1)", border: "2px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 24px" }}>✅</div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#34d399", margin: "0 0 10px" }}>Password Updated!</h1>
            <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", margin: "0 0 24px", lineHeight: 1.7 }}>Your password has been changed. Redirecting to login in 3 seconds…</p>
            <div className="spinner" style={{ margin: "0 auto", width: "28px", height: "28px" }} />
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 20px", width: "36px", height: "36px" }} />
            <p style={{ color: "var(--white-muted)", fontSize: "0.9rem", marginBottom: "12px" }}>Verifying your reset link…</p>
            <p style={{ color: "var(--white-muted)", fontSize: "0.78rem" }}>
              Link expired?{" "}<a href="/auth/forgot-password" style={{ color: "var(--red)" }}>Request a new one</a>
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(230,57,70,0.1)", border: "2px solid rgba(230,57,70,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", margin: "0 auto 16px" }}>🔒</div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 900, margin: "0 0 6px" }}>Set New Password</h1>
              <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0 }}>Choose a strong password for your account</p>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}
            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" required autoFocus style={{ paddingRight: "44px" }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--white-muted)", cursor: "pointer", padding: 0, fontSize: "1rem" }}>
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div style={{ marginTop: "6px" }}>
                    <div style={{ display: "flex", gap: "4px", marginBottom: "3px" }}>
                      {[1, 2, 3].map(i => <div key={i} style={{ flex: 1, height: "3px", borderRadius: "100px", background: i <= pwStrength ? pwColors[pwStrength] : "var(--navy-border)", transition: "background 0.3s" }} />)}
                    </div>
                    <p style={{ fontSize: "0.72rem", color: pwColors[pwStrength], margin: 0 }}>{pwLabels[pwStrength]}</p>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required style={{ borderColor: confirmPassword && confirmPassword !== newPassword ? "var(--red)" : undefined }} />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p style={{ color: "var(--red)", fontSize: "0.75rem", margin: "4px 0 0" }}>Passwords do not match</p>
                )}
              </div>
              <button type="submit" disabled={loading || !newPassword || newPassword !== confirmPassword} style={{ width: "100%", padding: "13px", fontWeight: 700 }}>
                {loading ? "Updating password…" : "Update Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)" }}>
        <div className="spinner" style={{ width: "40px", height: "40px" }} />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}
