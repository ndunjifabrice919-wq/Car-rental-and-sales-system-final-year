"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { uploadIdDocument } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";

type TabType = "profile" | "verification" | "security";

const ID_TYPES = ["National ID Card", "Passport", "Driver's License", "Residence Permit"];

function VerificationStep({ number, label, done }: { number: number; label: string; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.82rem", background: done ? "rgba(52,211,153,0.15)" : "var(--navy-light)", border: `1.5px solid ${done ? "#34d399" : "var(--navy-border)"}`, color: done ? "#34d399" : "var(--white-muted)" }}>
        {done ? "✓" : number}
      </div>
      <span style={{ fontSize: "0.88rem", color: done ? "var(--white-soft)" : "var(--white-muted)", fontWeight: done ? 600 : 400 }}>{label}</span>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [stats, setStats] = useState({ rentals: 0, purchases: 0, totalSpent: 0 });
  const [tab, setTab] = useState<TabType>("profile");

  // Verification fields
  const [idType, setIdType] = useState("National ID Card");
  const [idNumber, setIdNumber] = useState("");
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<string | null>(null);
  const [idDocUrl, setIdDocUrl] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const [verSaving, setVerSaving] = useState(false);
  const [verMsg, setVerMsg] = useState("");
  const [uploadingId, setUploadingId] = useState(false);
  const [dragOverId, setDragOverId] = useState(false);

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    // Read tab from URL query
    const urlTab = searchParams.get("tab") as TabType | null;
    if (urlTab && ["profile", "verification", "security"].includes(urlTab)) {
      setTab(urlTab);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(prof);
      setFullName(prof?.full_name || "");
      setPhone(prof?.phone || "");
      setIdType(prof?.id_type || "National ID Card");
      setIdNumber(prof?.id_number || "");
      setIdDocUrl(prof?.id_document_url || "");
      setVerificationStatus(prof?.verification_status || "unverified");

      const [{ data: rentals }, { data: purchases }] = await Promise.all([
        supabase.from("rentals").select("total_price").eq("user_id", session.user.id),
        supabase.from("sales").select("sale_price").eq("user_id", session.user.id),
      ]);

      const rentalTotal = (rentals || []).reduce((s: number, r: any) => s + (r.total_price || 0), 0);
      const saleTotal = (purchases || []).reduce((s: number, p: any) => s + (p.sale_price || 0), 0);
      setStats({ rentals: rentals?.length || 0, purchases: purchases?.length || 0, totalSpent: rentalTotal + saleTotal });
    });
  }, [router, searchParams]);

  const handleSave = async () => {
    if (!fullName.trim()) { setSaveMsg("Full name is required."); return; }
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, full_name: fullName.trim(), phone: phone.trim(), role: profile?.role || "customer"
    });
    setSaving(false);
    if (!error) await refreshProfile();
    setSaveMsg(error ? "Failed to save. Try again." : "✅ Profile updated successfully!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleVerificationSave = async () => {
    if (!idNumber.trim()) { setVerMsg("ID number is required."); return; }
    setVerSaving(true); setVerMsg("");

    let finalDocUrl = idDocUrl;

    if (idDocFile) {
      setUploadingId(true);
      const res = await uploadIdDocument(idDocFile, user.id);
      setUploadingId(false);
      if (res.error) {
        setVerMsg(`Document upload failed: ${res.error}. Please create the 'id-documents' bucket in Supabase.`);
        setVerSaving(false);
        return;
      }
      finalDocUrl = res.url!;
      setIdDocUrl(finalDocUrl);
    }

    const newStatus = finalDocUrl && idNumber.trim() ? "pending" : "unverified";

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName || profile?.full_name,
      phone: phone || profile?.phone,
      role: profile?.role || "customer",
      id_type: idType,
      id_number: idNumber.trim(),
      id_document_url: finalDocUrl,
      verification_status: newStatus,
    });

    setVerSaving(false);
    if (error) {
      // Columns might not exist yet — guide the user
      setVerMsg("⚠️ Could not save verification data. Ask your admin to add id_type, id_number, id_document_url, verification_status columns to the profiles table in Supabase.");
    } else {
      await refreshProfile();
      setVerificationStatus(newStatus);
      setVerMsg(newStatus === "pending" ? "✅ Verification submitted! Admin will review your document." : "✅ ID information saved.");
    }
    setTimeout(() => setVerMsg(""), 6000);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword !== confirmPassword) { setPwMsg("Passwords do not match."); return; }
    if (newPassword.length < 8) { setPwMsg("Password must be at least 8 characters."); return; }
    setPwLoading(true); setPwMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    setPwMsg(error ? error.message : "✅ Password updated successfully!");
    setNewPassword(""); setConfirmPassword("");
    setTimeout(() => setPwMsg(""), 4000);
  };

  // Verification completeness
  const hasName = !!fullName.trim();
  const hasPhone = !!phone.trim();
  const hasIdNumber = !!idNumber.trim();
  const hasIdDoc = !!idDocUrl;
  const verificationComplete = hasName && hasPhone && hasIdNumber && hasIdDoc;
  const profileComplete = hasName && hasPhone;

  const statusColor = verificationStatus === "verified" ? "#34d399" : verificationStatus === "pending" ? "#fbbf24" : "var(--white-muted)";
  const statusBg = verificationStatus === "verified" ? "rgba(52,211,153,0.1)" : verificationStatus === "pending" ? "rgba(251,191,36,0.1)" : "rgba(154,170,191,0.1)";
  const statusLabel = verificationStatus === "verified" ? "✓ Verified" : verificationStatus === "pending" ? "⏳ Pending Review" : "Unverified";

  const initials = (fullName || user?.email || "?").charAt(0).toUpperCase();

  if (!user) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page animate-in" style={{ maxWidth: "860px" }}>

      {/* ── Profile Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px", flexWrap: "wrap" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, var(--red), #c1121f)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem", fontWeight: 900, flexShrink: 0, boxShadow: "0 0 0 3px rgba(230,57,70,0.25)" }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 900 }}>{fullName || "Your Profile"}</h1>
          <p style={{ color: "var(--white-muted)", margin: "0 0 8px", fontSize: "0.88rem" }}>{user.email}</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {profile?.role === "admin" && <span className="badge" style={{ background: "rgba(230,57,70,0.15)", color: "var(--red)" }}>Admin</span>}
            {profile?.role === "owner" && <span className="badge" style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>Owner</span>}
            <span style={{ padding: "4px 12px", borderRadius: "100px", fontSize: "0.72rem", fontWeight: 700, background: statusBg, color: statusColor, border: `1px solid ${statusColor}44` }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "14px", marginBottom: "28px" }}>
        {[
          { icon: "🚗", label: "Total Rentals", value: stats.rentals, href: "/rentals" },
          { icon: "🏷️", label: "Purchases", value: stats.purchases, href: "/sales/history" },
          { icon: "💰", label: "Total Spent", value: formatFCFA(stats.totalSpent), href: "#" },
        ].map(s => (
          <div key={s.label} onClick={() => s.href !== "#" && router.push(s.href)} className="card"
            style={{ textAlign: "center", cursor: s.href !== "#" ? "pointer" : "default", padding: "18px" }}>
            <p style={{ fontSize: "1.3rem", margin: "0 0 2px" }}>{s.icon}</p>
            <p style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 4px", color: "var(--white)" }}>{s.value}</p>
            <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "32px" }}>
        {[
          { label: "🚗 Rent Vehicle", href: "/rent", primary: false },
          { label: "🏷️ Buy Vehicle", href: "/sales", primary: false },
          { label: "📋 My Rentals", href: "/rentals", primary: false },
          { label: "🧾 My Purchases", href: "/sales/history", primary: false },
          ...(profile?.role === "admin" || profile?.role === "owner" ? [{ label: "🛡️ Admin Dashboard", href: "/admin", primary: true }] : []),
        ].map(a => (
          <button key={a.label} onClick={() => router.push(a.href)}
            style={{ background: a.primary ? "var(--red)" : "var(--navy-light)", color: a.primary ? "var(--white)" : "var(--white-muted)", fontSize: "0.84rem", padding: "9px 16px", border: a.primary ? "none" : "1px solid var(--navy-border)" }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", background: "var(--navy-mid)", borderRadius: "12px", padding: "5px", border: "1px solid var(--navy-border)", overflowX: "auto" }}>
        {([
          { key: "profile", label: "👤 Profile" },
          { key: "verification", label: "🛡️ Verification" },
          { key: "security", label: "🔒 Security" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, background: tab === t.key ? "var(--red)" : "transparent", color: tab === t.key ? "var(--white)" : "var(--white-muted)", padding: "9px 16px", fontSize: "0.87rem", fontWeight: tab === t.key ? 700 : 500, borderRadius: "8px", border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {tab === "profile" && (
        <div className="card animate-in">
          <h3 style={{ marginBottom: "6px", fontSize: "1.05rem" }}>Profile Information</h3>
          <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", marginBottom: "24px" }}>Your name and phone are required for bookings and delivery coordination.</p>
          {saveMsg && <div className={`alert ${saveMsg.includes("✅") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "16px" }}>{saveMsg}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Full Name <span style={{ color: "var(--red)" }}>*</span></label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Fokou Emmanuel" />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input value={user.email} disabled style={{ opacity: 0.5, cursor: "not-allowed" }} />
              <p style={{ fontSize: "0.75rem", color: "var(--white-muted)", margin: "4px 0 0" }}>Email cannot be changed here. Contact support if needed.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number <span style={{ color: "var(--red)" }}>*</span></label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" />
            </div>
            {!profileComplete && (
              <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "10px", padding: "12px 16px", fontSize: "0.83rem", color: "#fbbf24" }}>
                ⚠️ Complete your name and phone number to unlock rentals and purchases.
              </div>
            )}
            <button onClick={handleSave} disabled={saving} style={{ alignSelf: "flex-start", padding: "11px 28px" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ── Verification Tab ── */}
      {tab === "verification" && (
        <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Status card */}
          <div style={{ background: "var(--navy-mid)", border: `1px solid ${statusColor}44`, borderRadius: "16px", padding: "24px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: statusBg, border: `1.5px solid ${statusColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
              {verificationStatus === "verified" ? "✅" : verificationStatus === "pending" ? "⏳" : "🔓"}
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1rem", color: statusColor }}>{statusLabel}</h3>
              <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0 }}>
                {verificationStatus === "verified" && "Your identity is verified. You can rent and purchase vehicles without restriction."}
                {verificationStatus === "pending" && "Your documents have been submitted. Our team will verify them within 24 hours."}
                {verificationStatus === "unverified" && "Complete the steps below to verify your identity. Required before renting or purchasing a vehicle."}
              </p>
            </div>
          </div>

          {/* Steps overview */}
          <div className="card">
            <h3 style={{ marginBottom: "16px", fontSize: "0.95rem" }}>Verification Steps</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <VerificationStep number={1} label="Add your full name" done={hasName} />
              <VerificationStep number={2} label="Add your phone number" done={hasPhone} />
              <VerificationStep number={3} label="Enter your ID number" done={hasIdNumber} />
              <VerificationStep number={4} label="Upload ID document photo" done={hasIdDoc} />
            </div>
            {verificationComplete && verificationStatus === "unverified" && (
              <div style={{ marginTop: "16px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: "10px", padding: "12px 16px", fontSize: "0.83rem", color: "#34d399" }}>
                ✓ All information complete — click "Submit Verification" below to send for review.
              </div>
            )}
          </div>

          {/* Verification form */}
          <div className="card">
            <h3 style={{ marginBottom: "20px", fontSize: "1.05rem" }}>Identity Document</h3>
            {verMsg && <div className={`alert ${verMsg.includes("✅") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "16px" }}>{verMsg}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">ID Document Type</label>
                <select value={idType} onChange={e => setIdType(e.target.value)}>
                  {ID_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ID / Document Number <span style={{ color: "var(--red)" }}>*</span></label>
                <input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="e.g. 123456789" />
                <p style={{ fontSize: "0.75rem", color: "var(--white-muted)", margin: "4px 0 0" }}>Enter the number exactly as it appears on your document.</p>
              </div>

              {/* ID Document Upload */}
              <div className="form-group">
                <label className="form-label">ID Document Photo <span style={{ color: "var(--red)" }}>*</span></label>
                <p style={{ fontSize: "0.78rem", color: "var(--white-muted)", margin: "0 0 10px" }}>Upload a clear photo of the front of your ID card, passport data page, or driver's license.</p>

                <label
                  onDragOver={e => { e.preventDefault(); setDragOverId(true); }}
                  onDragLeave={() => setDragOverId(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragOverId(false);
                    const f = e.dataTransfer.files[0];
                    if (f?.type.startsWith("image/")) { setIdDocFile(f); setIdDocPreview(URL.createObjectURL(f)); }
                  }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", padding: "24px", background: dragOverId ? "rgba(230,57,70,0.06)" : "var(--navy)", border: `2px dashed ${dragOverId ? "var(--red)" : "var(--navy-border)"}`, borderRadius: "12px", cursor: "pointer", transition: "all 0.2s" }}
                >
                  {idDocPreview || idDocUrl ? (
                    <img src={idDocPreview || idDocUrl} alt="ID preview" style={{ maxHeight: "160px", maxWidth: "100%", objectFit: "contain", borderRadius: "8px" }} />
                  ) : (
                    <>
                      <span style={{ fontSize: "2rem" }}>🪪</span>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ margin: 0, fontWeight: 600, color: "var(--white-soft)", fontSize: "0.88rem" }}>Drag & drop your ID photo here</p>
                        <p style={{ margin: "4px 0 0", color: "var(--white-muted)", fontSize: "0.76rem" }}>or click to browse · JPG, PNG · Max 5MB</p>
                      </div>
                    </>
                  )}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setIdDocFile(f); setIdDocPreview(URL.createObjectURL(f)); }
                  }} />
                </label>

                {idDocFile && (
                  <p style={{ fontSize: "0.76rem", color: "var(--white-muted)", marginTop: "6px" }}>
                    Selected: {idDocFile.name} ({(idDocFile.size / 1024).toFixed(0)} KB)
                    <button onClick={() => { setIdDocFile(null); setIdDocPreview(null); }} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "0.76rem", marginLeft: "8px", padding: 0 }}>Remove</button>
                  </p>
                )}
                {uploadingId && <p style={{ fontSize: "0.78rem", color: "#fbbf24", marginTop: "6px" }}>⏳ Uploading ID document…</p>}
              </div>

              {/* Privacy notice */}
              <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "10px", padding: "14px 16px", fontSize: "0.8rem", color: "var(--white-muted)", lineHeight: 1.7 }}>
                🔒 <strong style={{ color: "var(--white-soft)" }}>Your privacy is protected.</strong> Your ID document is stored securely and is only accessible to authorised DriveEasy staff for verification purposes. It is never shared with third parties.
              </div>

              <button onClick={handleVerificationSave} disabled={verSaving || uploadingId} style={{ alignSelf: "flex-start", padding: "11px 28px" }}>
                {uploadingId ? "Uploading…" : verSaving ? "Submitting…" : verificationStatus === "unverified" ? "Submit Verification" : "Update Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security Tab ── */}
      {tab === "security" && (
        <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <h3 style={{ marginBottom: "6px", fontSize: "1.05rem" }}>Change Password</h3>
            <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", marginBottom: "24px" }}>Use a strong password of at least 8 characters including numbers and symbols.</p>
            {pwMsg && <div className={`alert ${pwMsg.includes("✅") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "16px" }}>{pwMsg}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p style={{ color: "var(--red)", fontSize: "0.78rem", margin: "4px 0 0" }}>Passwords do not match</p>
                )}
              </div>
              <button onClick={handlePasswordChange} disabled={pwLoading || !newPassword || newPassword !== confirmPassword} style={{ alignSelf: "flex-start", padding: "11px 28px" }}>
                {pwLoading ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>

          {/* Account danger zone */}
          <div className="card" style={{ border: "1px solid rgba(230,57,70,0.25)" }}>
            <h3 style={{ marginBottom: "6px", fontSize: "1.05rem", color: "var(--red)" }}>⚠️ Account Actions</h3>
            <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>Manage your account session below.</p>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
              style={{ background: "transparent", border: "1.5px solid rgba(230,57,70,0.4)", color: "var(--red)", padding: "10px 24px", fontSize: "0.88rem" }}>
              Sign Out of All Devices
            </button>
          </div>
        </div>
      )}
    </div>
  );
}