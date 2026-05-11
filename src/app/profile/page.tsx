"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [stats, setStats] = useState({ rentals: 0, purchases: 0, totalSpent: 0 });
  const [tab, setTab] = useState<"profile" | "security">("profile");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(prof);
      setFullName(prof?.full_name || "");
      setPhone(prof?.phone || "");

      const [{ data: rentals }, { data: purchases }] = await Promise.all([
        supabase.from("rentals").select("total_price").eq("user_id", session.user.id),
        supabase.from("sales").select("sale_price").eq("user_id", session.user.id),
      ]);

      const rentalTotal = (rentals || []).reduce((s: number, r: any) => s + (r.total_price || 0), 0);
      const saleTotal = (purchases || []).reduce((s: number, p: any) => s + (p.sale_price || 0), 0);
      setStats({ rentals: rentals?.length || 0, purchases: purchases?.length || 0, totalSpent: rentalTotal + saleTotal });
    });
  }, [router]);

  const handleSave = async () => {
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, phone, role: profile?.role || "customer" });
    setSaving(false);
    setSaveMsg(error ? "Failed to save. Try again." : "Profile updated successfully!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword !== confirmPassword) { setPwMsg("Passwords do not match."); return; }
    if (newPassword.length < 6) { setPwMsg("Password must be at least 6 characters."); return; }
    setPwLoading(true); setPwMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    setPwMsg(error ? error.message : "Password updated successfully!");
    setNewPassword(""); setConfirmPassword("");
  };

  if (!user) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700, flexShrink: 0 }}>
          {(fullName || user.email || "?")[0].toUpperCase()}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{fullName || "Your Profile"}</h1>
          <p style={{ color: "var(--white-muted)", margin: 0, fontSize: "0.88rem" }}>{user.email}</p>
          {profile?.role === "admin" && (
            <span className="badge" style={{ background: "rgba(230,57,70,0.15)", color: "var(--red)", marginTop: "6px" }}>Admin</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Total Rentals", value: stats.rentals },
          { label: "Vehicles Purchased", value: stats.purchases },
          { label: "Total Spent", value: formatFCFA(stats.totalSpent) },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 4px", color: "var(--white)" }}>{s.value}</p>
            <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
        {[
          { label: "Rent Vehicle", href: "/rent" },
          { label: "Buy Vehicle", href: "/sales" },
          { label: "My Rentals", href: "/rentals" },
          { label: "My Purchases", href: "/sales/history" },
          ...(profile?.role === "admin" ? [{ label: "Admin Dashboard", href: "/admin" }] : []),
        ].map((a) => (
          <button key={a.label} onClick={() => router.push(a.href)}
            style={{ background: a.label === "Admin Dashboard" ? "var(--red)" : "var(--navy-light)", color: "var(--white)", fontSize: "0.85rem", padding: "10px 18px" }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", background: "var(--navy-mid)", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {(["profile", "security"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: tab === t ? "var(--navy-light)" : "transparent", color: tab === t ? "var(--white)" : "var(--white-muted)", padding: "8px 20px", fontSize: "0.88rem", fontWeight: 500, textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "16px", padding: "28px" }}>
          <h3 style={{ marginBottom: "20px" }}>Profile Information</h3>
          {saveMsg && <div className={`alert ${saveMsg.includes("success") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "16px" }}>{saveMsg}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input value={user.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" />
            </div>
            <button onClick={handleSave} disabled={saving} style={{ alignSelf: "flex-start", padding: "10px 28px" }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {tab === "security" && (
        <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "16px", padding: "28px" }}>
          <h3 style={{ marginBottom: "20px" }}>Change Password</h3>
          {pwMsg && <div className={`alert ${pwMsg.includes("success") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "16px" }}>{pwMsg}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
            </div>
            <button onClick={handlePasswordChange} disabled={pwLoading} style={{ alignSelf: "flex-start", padding: "10px 28px" }}>
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}