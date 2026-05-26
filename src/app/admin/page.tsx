"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { CITIES_BY_REGION } from "@/lib/locations";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { uploadMultipleVehicleImages } from "@/lib/storage";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

type Tab = "overview" | "vehicles" | "rentals" | "sales" | "users" | "logs";

const BLANK = {
  make: "", model: "", year: new Date().getFullYear(), type: "both",
  daily_rate: "", sale_price: "", fuel_type: "Petrol", transmission: "Automatic",
  color: "", seats: 5, mileage: "", description: "", image_url: "", status: "available", location: "Buea",
};

const NAV_ITEMS: { key: Tab; icon: string; label: string }[] = [
  { key: "overview",  icon: "📊", label: "Overview"  },
  { key: "vehicles",  icon: "🚗", label: "Vehicles"  },
  { key: "rentals",   icon: "📅", label: "Rentals"   },
  { key: "sales",     icon: "💰", label: "Sales"     },
  { key: "users",     icon: "👥", label: "Users"     },
  { key: "logs",      icon: "📜", label: "Activity Logs" },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { lang } = useLang();
  const [tab, setTab] = useState<Tab>("overview");
  const [userFilter, setUserFilter] = useState<"all" | "pending">("all");
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ vehicles: 0, rentals: 0, sales: 0, revenue: 0, pending: 0, users: 0 });
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [primaryIdx, setPrimaryIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    const allTransactions = [
      ...rentals.map(r => ({ date: r.created_at?.split("T")[0], amount: r.total_price || 0 })),
      ...sales.map(s => ({ date: s.created_at?.split("T")[0], amount: s.sale_price || 0 }))
    ];
    allTransactions.forEach(t => {
      if (!t.date) return;
      if (!data[t.date]) data[t.date] = 0;
      data[t.date] += t.amount;
    });
    return Object.entries(data).sort((a,b) => a[0].localeCompare(b[0])).slice(-14).map(([date, amount]) => ({
      date: format(parseISO(date), "MMM dd"),
      amount
    }));
  }, [rentals, sales]);

  const activityLogs = useMemo(() => {
    const logs: any[] = [];
    rentals.forEach(r => logs.push({ id: `r-${r.id}`, type: "rental", text: `${r.profiles?.full_name || "Customer"} booked ${r.vehicles?.make} ${r.vehicles?.model}`, date: r.created_at, color: "#34d399" }));
    sales.forEach(s => logs.push({ id: `s-${s.id}`, type: "sale", text: `${s.profiles?.full_name || "Customer"} bought ${s.vehicles?.make} ${s.vehicles?.model}`, date: s.created_at, color: "#60a5fa" }));
    vehicles.forEach(v => logs.push({ id: `v-${v.id}`, type: "vehicle", text: `Vehicle added: ${v.make} ${v.model}`, date: v.created_at, color: "var(--white)" }));
    return logs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
  }, [rentals, sales, vehicles]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (profile?.role !== "admin" && profile?.role !== "owner") { router.push("/"); return; }
    loadAll();

    // Realtime sync for admin
    const channel = supabase.channel("realtime:admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "rentals" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, authLoading, router]);

  const loadAll = async () => {
    setLoading(true);
    const [v, r, s, u] = await Promise.all([
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("rentals").select("*, vehicles(make,model)").order("created_at", { ascending: false }),
      supabase.from("sales").select("*, vehicles(make,model)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    
    const usersList = u.data || [];
    setUsers(usersList);
    setVehicles(v.data || []);
    
    // Manually join profiles since the foreign key points to auth.users instead of profiles table
    const rentalsWithProfiles = (r.data || []).map(rental => ({
      ...rental,
      profiles: { full_name: usersList.find(user => user.id === rental.user_id)?.full_name || "Unknown User" }
    }));
    
    const salesWithProfiles = (s.data || []).map(sale => ({
      ...sale,
      profiles: { full_name: usersList.find(user => user.id === sale.user_id)?.full_name || "Unknown User" }
    }));
    
    setRentals(rentalsWithProfiles);
    setSales(salesWithProfiles);
    
    const revenue = [...(r.data || []).map((x: any) => x.total_price || 0), ...(s.data || []).map((x: any) => x.sale_price || 0)].reduce((a, b) => a + b, 0);
    const pending = rentalsWithProfiles.filter((x: any) => x.status === "pending").length;
    setStats({ vehicles: v.data?.length || 0, rentals: rentalsWithProfiles.length, sales: salesWithProfiles.length, revenue, pending, users: usersList.length });
    setLoading(false);
  };

  const addImageFiles = (files: File[]) => {
    const valid = files.filter(f => f.type.startsWith("image/")).slice(0, 10);
    if (valid.length === 0) return;
    setImageFiles(prev => {
      const combined = [...prev, ...valid].slice(0, 10);
      setImagePreviews(combined.map(f => URL.createObjectURL(f)));
      return combined;
    });
  };

  const removeImage = (idx: number) => {
    setImageFiles(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setImagePreviews(next.map(f => URL.createObjectURL(f)));
      if (primaryIdx >= next.length) setPrimaryIdx(Math.max(0, next.length - 1));
      return next;
    });
  };

  const saveVehicle = async () => {
    if (!form.make || !form.model) { setFormMsg("Make and model are required."); return; }
    setSaving(true); setFormMsg(""); setUploadProgress(0);

    let imageUrl = form.image_url;

    if (imageFiles.length > 0) {
      setUploading(true);
      const { urls, errors } = await uploadMultipleVehicleImages(
        imageFiles,
        (done, total) => setUploadProgress(Math.round((done / total) * 100))
      );
      setUploading(false);

      if (errors.length > 0 && urls.length === 0) {
        setFormMsg(`Upload failed: ${errors[0]}. Check the 'vehicle-images' bucket exists.`);
        setSaving(false);
        return;
      }
      // Primary image = the one the admin starred; remaining stored as JSON in description prefix
      if (urls.length > 0) {
        const orderedUrls = [
          urls[primaryIdx] ?? urls[0],
          ...urls.filter((_, i) => i !== primaryIdx),
        ];
        imageUrl = orderedUrls.join(",");
        if (errors.length > 0) setFormMsg(`⚠️ ${errors.length} image(s) failed to upload but continuing.`);
      }
    }

    const payload = {
      make: form.make, model: form.model, year: Number(form.year), type: form.type, status: form.status,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      fuel_type: form.fuel_type, transmission: form.transmission,
      color: form.color, seats: Number(form.seats),
      mileage: form.mileage ? Number(form.mileage) : null,
      description: form.description, image_url: imageUrl, location: form.location || null,
    };
    const { error } = editId
      ? await supabase.from("vehicles").update(payload).eq("id", editId)
      : await supabase.from("vehicles").insert(payload);
    setSaving(false);
    if (error) { setFormMsg("Error: " + error.message); return; }
    setFormMsg(editId ? "✅ Vehicle updated!" : "✅ Vehicle added!");
    setForm({ ...BLANK }); setEditId(null); setShowForm(false);
    setImageFiles([]); setImagePreviews([]); setPrimaryIdx(0);
    await loadAll();
  };

  const editVehicle = (v: any) => {
    setForm({ make: v.make, model: v.model, year: v.year, type: v.type, daily_rate: v.daily_rate || "", sale_price: v.sale_price || "", fuel_type: v.fuel_type, transmission: v.transmission, color: v.color, seats: v.seats, mileage: v.mileage || "", description: v.description || "", image_url: v.image_url || "", status: v.status, location: v.location || "Buea" });
    setEditId(v.id); setShowForm(true); setFormMsg(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm("Delete this vehicle? This cannot be undone.")) return;
    await supabase.from("vehicles").delete().eq("id", id);
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const updateRentalStatus = async (id: string, status: string) => {
    await supabase.from("rentals").update({ status }).eq("id", id);
    setRentals(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const updateUserRole = async (id: string, role: string) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) {
      console.error("Error updating user role:", error);
      alert("❌ Error: " + error.message);
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const updateVerificationStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ verification_status: status }).eq("id", id);
    if (error) {
      console.error("Error updating verification status:", error);
      alert("❌ Error: " + error.message);
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, verification_status: status } : u));
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(lang === "fr" ? "fr-CM" : "en-CM", { day: "2-digit", month: "short", year: "numeric" });
  const fc = (v: any) => ({ field: v, val: (form as any)[v], onChange: (val: any) => setForm(f => ({ ...f, [v]: val })) });

  const isOwner = profile?.role === "owner";
  const isAdminOrOwner = profile?.role === "admin" || profile?.role === "owner";

  if (authLoading || loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user || !isAdminOrOwner) return null;

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 68px)" }}>

      {/* ── MOBILE BACKDROP OVERLAY ── */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: "68px",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(13,27,42,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 999
          }}
          className="sidebar-overlay-mobile"
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`} style={sidebar}>
        <div style={{ padding: "20px 16px 12px" }}>
          {/* Mobile-only Minimize Button */}
          <div className="mob-menu-btn" style={{ display: "none", justifyContent: "flex-end", marginBottom: "12px" }}>
            <button 
              onClick={() => setSidebarOpen(false)}
              style={{
                background: "rgba(230,57,70,0.12)",
                color: "var(--red)",
                border: "1px solid rgba(230,57,70,0.3)",
                padding: "6px 12px",
                fontSize: "0.78rem",
                borderRadius: "8px"
              }}
            >
              ✕ Hide Sidebar
            </button>
          </div>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--white-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
            Admin Panel
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {NAV_ITEMS.map(n => (
              <button key={n.key} onClick={() => { setTab(n.key); setSidebarOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", border: "none", cursor: "pointer", textAlign: "left", fontWeight: tab === n.key ? 700 : 500, fontSize: "0.9rem", background: tab === n.key ? "var(--red)" : "transparent", color: tab === n.key ? "#fff" : "var(--white-muted)", transition: "all 0.15s" }}>
                <span>{n.icon}</span> {n.label}
                {n.key === "rentals" && stats.pending > 0 && (
                  <span style={{ marginLeft: "auto", background: "#fbbf24", color: "#000", borderRadius: "100px", fontSize: "0.68rem", fontWeight: 800, padding: "2px 7px" }}>{stats.pending}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer Quick Links */}
        <div style={{ marginTop: "auto", padding: "16px", borderTop: "1px solid var(--navy-border)" }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--navy-border)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Quick Links</p>
          {[
            { label: "➕ Add Vehicle",     action: () => { setForm({ ...BLANK }); setEditId(null); setShowForm(true); setTab("vehicles"); } },
            { label: "🏠 Customer Site",  action: () => router.push("/") },
            { label: "👤 My Profile",     action: () => router.push("/profile") },
            { label: "🚗 Browse Rentals", action: () => router.push("/rent") },
            { label: "🏷️ Browse Sales",   action: () => router.push("/sales") },
          ].map(l => (
            <button key={l.label} onClick={l.action}
              style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", color: "var(--white-muted)", fontSize: "0.83rem", padding: "7px 4px", cursor: "pointer", borderRadius: "6px" }}>
              {l.label}
            </button>
          ))}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="admin-main-content">

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: "none", background: "var(--navy-light)", border: "none", color: "var(--white)", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }} className="mob-menu-btn">☰</button>
            <div>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>{NAV_ITEMS.find(n => n.key === tab)?.icon} {NAV_ITEMS.find(n => n.key === tab)?.label}</h1>
              <p style={{ color: "var(--white-muted)", margin: 0, fontSize: "0.82rem" }}>DriveEasy {isOwner ? "Owner" : "Admin"} · {new Date().toLocaleDateString(lang === "fr" ? "fr-CM" : "en-CM", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
          </div>
          {tab === "vehicles" && (
            <button onClick={() => { setForm({ ...BLANK }); setEditId(null); setShowForm(!showForm); setFormMsg(""); }}>
              {showForm ? "Cancel" : "+ Add Vehicle"}
            </button>
          )}
        </div>

        {/* ── VEHICLE FORM ── */}
        {tab === "vehicles" && showForm && (
          <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "16px", padding: "24px", marginBottom: "28px" }}>
            <h3 style={{ marginBottom: "20px", fontSize: "1rem" }}>{editId ? "Edit Vehicle" : "Add New Vehicle"}</h3>
            {formMsg && <div className={`alert ${formMsg.includes("Error") ? "alert-error" : "alert-success"}`} style={{ marginBottom: "16px" }}>{formMsg}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px" }}>
              {[
                { label: "Make *", f: "make", ph: "e.g. Toyota" },
                { label: "Model *", f: "model", ph: "e.g. Land Cruiser" },
                { label: "Year *", f: "year", ph: "2024", t: "number" },
                { label: "Color", f: "color", ph: "e.g. White" },
                { label: "Seats", f: "seats", ph: "5", t: "number" },
                { label: "Mileage (km)", f: "mileage", ph: "10000", t: "number" },
                { label: "Daily Rate (FCFA)", f: "daily_rate", ph: "25000", t: "number" },
                { label: "Sale Price (FCFA)", f: "sale_price", ph: "9500000", t: "number" },
              ].map(({ label, f, ph, t }) => (
                <div key={f} className="form-group">
                  <label className="form-label">{label}</label>
                  <input type={t || "text"} placeholder={ph} value={(form as any)[f]} onChange={e => setForm(fm => ({ ...fm, [f]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="rental">Rental Only</option>
                  <option value="sale">Sale Only</option>
                  <option value="both">Rental &amp; Sale</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fuel Type</label>
                <select value={form.fuel_type} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))}>
                  <option>Petrol</option><option>Diesel</option><option>Electric</option><option>Hybrid</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Transmission</label>
                <select value={form.transmission} onChange={e => setForm(f => ({ ...f, transmission: e.target.value }))}>
                  <option>Automatic</option><option>Manual</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                  {CITIES_BY_REGION.map(({ region, cities }) => (
                    <optgroup key={region} label={region}>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: "14px" }}>
              <label className="form-label">Description</label>
              <textarea placeholder="Vehicle description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {/* ── MULTI-PHOTO UPLOAD ── */}
            <div className="form-group" style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label className="form-label" style={{ margin: 0 }}>Vehicle Photos</label>
                <span style={{ fontSize: "0.75rem", color: "var(--white-muted)" }}>
                  {imageFiles.length > 0 ? `${imageFiles.length} photo${imageFiles.length > 1 ? "s" : ""} selected` : "Up to 10 photos"}
                </span>
              </div>

              {/* Drop zone */}
              <label
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addImageFiles(Array.from(e.dataTransfer.files)); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: "10px", padding: "28px 20px",
                  background: dragOver ? "rgba(230,57,70,0.08)" : "var(--navy)",
                  border: `2px dashed ${dragOver ? "var(--red)" : "var(--navy-border)"}`,
                  borderRadius: "12px", cursor: "pointer",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                <span style={{ fontSize: "2rem" }}>📷</span>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontWeight: 600, color: "var(--white-soft)", fontSize: "0.9rem" }}>Drag &amp; drop photos here</p>
                  <p style={{ margin: "4px 0 0", color: "var(--white-muted)", fontSize: "0.78rem" }}>or click to browse · JPG, PNG, WEBP · Auto-compressed</p>
                </div>
                <input
                  type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={e => addImageFiles(Array.from(e.target.files || []))}
                />
              </label>

              {/* Preview grid */}
              {(imagePreviews.length > 0 || form.image_url) && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px", marginTop: "14px" }}>
                  {/* Existing image from DB when editing */}
                  {form.image_url && imageFiles.length === 0 && (
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      <img src={form.image_url.split(',')[0]} alt="Current" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(230,57,70,0.9)", padding: "3px", textAlign: "center", fontSize: "0.65rem", fontWeight: 800, color: "#fff" }}>CURRENT</div>
                    </div>
                  )}

                  {/* Newly selected images */}
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: `2px solid ${idx === primaryIdx ? "var(--red)" : "var(--navy-border)"}`, aspectRatio: "4/3", cursor: "pointer", transition: "border-color 0.2s" }}
                      onClick={() => setPrimaryIdx(idx)}
                      title={idx === primaryIdx ? "Primary (shown on cards)" : "Click to set as primary"}
                    >
                      <img src={src} alt={`Photo ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

                      {/* Primary star badge */}
                      {idx === primaryIdx && (
                        <div style={{ position: "absolute", top: 4, left: 4, background: "var(--red)", color: "#fff", borderRadius: "100px", padding: "2px 7px", fontSize: "0.62rem", fontWeight: 800 }}>★ MAIN</div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={e => { e.stopPropagation(); removeImage(idx); }}
                        style={{ position: "absolute", top: 4, right: 4, width: "22px", height: "22px", padding: 0, background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: "50%", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                        title="Remove"
                      >✕</button>

                      {/* File size */}
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(13,27,42,0.75)", padding: "2px 4px", fontSize: "0.6rem", color: "var(--white-muted)", textAlign: "center" }}>
                        {(imageFiles[idx].size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  ))}

                  {/* Add more button */}
                  {imageFiles.length < 10 && imageFiles.length > 0 && (
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", border: "2px dashed var(--navy-border)", borderRadius: "10px", aspectRatio: "4/3", cursor: "pointer", color: "var(--white-muted)", fontSize: "0.78rem", transition: "border-color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--red)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--navy-border)")}>
                      <span style={{ fontSize: "1.4rem" }}>+</span>
                      Add more
                      <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => addImageFiles(Array.from(e.target.files || []))} />
                    </label>
                  )}
                </div>
              )}

              {imagePreviews.length > 1 && (
                <p style={{ fontSize: "0.75rem", color: "var(--white-muted)", marginTop: "8px" }}>
                  💡 Click a photo to set it as the <strong>main</strong> image shown on listings. Others are uploaded too.
                </p>
              )}

              {/* Upload progress bar */}
              {uploading && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.78rem", color: "#fbbf24" }}>⏳ Compressing &amp; uploading…</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--white-muted)" }}>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--navy-border)", borderRadius: "100px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${uploadProgress}%`, background: "var(--red)", borderRadius: "100px", transition: "width 0.3s ease" }} />
                  </div>
                </div>
              )}
            </div>

            <button onClick={saveVehicle} disabled={saving || uploading} style={{ marginTop: "18px" }}>
              {uploading ? `Uploading ${uploadProgress}%…` : saving ? "Saving…" : editId ? "Update Vehicle" : "Add Vehicle"}
            </button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <div className="admin-stats-grid">
              {[
                { label: "Total Vehicles", value: stats.vehicles, color: "var(--white)", icon: "🚗" },
                { label: "Total Users", value: stats.users, color: "#a855f7", icon: "👥" },
                { label: "Total Rentals", value: stats.rentals, color: "#34d399", icon: "📅" },
                { label: "Pending Rentals", value: stats.pending, color: "#fbbf24", icon: "⏳" },
                { label: "Total Sales", value: stats.sales, color: "#60a5fa", icon: "🏷️" },
                { label: "Total Revenue", value: formatFCFA(stats.revenue), color: "var(--red)", icon: "💰" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "1.2rem" }}>{s.icon}</span>
                  </div>
                  <p style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 4px", color: s.color }}>{s.value}</p>
                  <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* REVENUE GRAPH */}
            <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "20px", marginBottom: "28px", height: "300px" }}>
              <h3 style={{ marginBottom: "14px", fontSize: "0.95rem" }}>Revenue Trend (Last 14 Days)</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--navy-border)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--white-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--white-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `FCFA ${val / 1000}k`} />
                    <Tooltip contentStyle={{ background: "var(--navy)", border: "1px solid var(--navy-border)", borderRadius: "8px" }} formatter={(value: any) => formatFCFA(Number(value))} />
                    <Line type="monotone" dataKey="amount" stroke="var(--red)" strokeWidth={3} dot={{ r: 4, fill: "var(--red)" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--white-muted)", fontSize: "0.85rem" }}>No revenue data yet</div>
              )}
            </div>

            <div className="admin-overview-bottom">
              {[
                { title: "Recent Rentals", items: rentals.slice(0, 5), render: (r: any) => (<><span>{r.vehicles?.make} {r.vehicles?.model}</span><span style={{ color: "var(--white-muted)", fontSize: "0.8rem" }}>{formatFCFA(r.total_price)}</span></>) },
                { title: "Recent Sales", items: sales.slice(0, 5), render: (s: any) => (<><span>{s.vehicles?.make} {s.vehicles?.model}</span><span style={{ color: "var(--red)", fontWeight: 700, fontSize: "0.9rem" }}>{formatFCFA(s.sale_price)}</span></>) },
              ].map(({ title, items, render }) => (
                <div key={title} style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "20px" }}>
                  <h3 style={{ marginBottom: "14px", fontSize: "0.95rem" }}>{title}</h3>
                  {items.length === 0 ? <p style={{ color: "var(--white-muted)", fontSize: "0.85rem" }}>No records yet</p> : items.map((item: any) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--navy-border)", fontSize: "0.85rem" }}>
                      {render(item)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VEHICLES ── */}
        {tab === "vehicles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {vehicles.length === 0 && <div className="empty-state"><h3>No vehicles yet</h3><p>Click "+ Add Vehicle" to get started</p></div>}
            {vehicles.map(v => (
              <div key={v.id} className="card admin-vehicle-row">
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {v.image_url ? (
                    <img src={v.image_url.split(',')[0]} alt="Vehicle" style={{ width: "60px", height: "45px", objectFit: "cover", borderRadius: "6px" }} />
                  ) : (
                    <div style={{ width: "60px", height: "45px", background: "var(--navy-light)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🚗</div>
                  )}
                  <div>
                    <h3 style={{ fontSize: "0.95rem", marginBottom: "3px" }}>{v.make} {v.model} ({v.year})</h3>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>
                      {v.type} · {v.fuel_type} · {v.transmission} · {v.location || "—"}
                      {v.daily_rate ? ` · ${formatFCFA(v.daily_rate)}/day` : ""}
                      {v.sale_price ? ` · ${formatFCFA(v.sale_price)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="admin-vehicle-actions">
                  <span className={`badge badge-${v.status}`}>{v.status}</span>
                  <button onClick={() => editVehicle(v)} style={{ background: "var(--navy-light)", color: "var(--white)", padding: "7px 14px", fontSize: "0.82rem" }}>Edit</button>
                  <button onClick={() => deleteVehicle(v.id)} style={{ background: "rgba(230,57,70,0.12)", color: "var(--red)", border: "1px solid rgba(230,57,70,0.3)", padding: "7px 14px", fontSize: "0.82rem" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RENTALS ── */}
        {tab === "rentals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {rentals.length === 0 && <div className="empty-state"><h3>No rentals yet</h3></div>}
            {rentals.map(r => (
              <div key={r.id} className="card admin-rental-row">
                <div>
                  <h3 style={{ fontSize: "0.92rem", marginBottom: "3px" }}>{r.vehicles?.make} {r.vehicles?.model}</h3>
                  <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>
                    {r.profiles?.full_name || "Customer"} · {fmtDate(r.start_date)} → {fmtDate(r.end_date)} · {formatFCFA(r.total_price)}
                  </p>
                </div>
                <div className="admin-rental-actions">
                  <span className={`badge badge-${r.status}`}>{r.status}</span>
                  {r.status === "pending" && (
                    <>
                      <button onClick={() => updateRentalStatus(r.id, "active")} style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", padding: "7px 14px", fontSize: "0.82rem" }}>Approve</button>
                      <button onClick={() => updateRentalStatus(r.id, "cancelled")} style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", padding: "7px 14px", fontSize: "0.82rem" }}>Decline</button>
                    </>
                  )}
                  {r.status === "active" && (
                    <button onClick={() => updateRentalStatus(r.id, "completed")} style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)", padding: "7px 14px", fontSize: "0.82rem" }}>Mark Completed</button>
                  )}
                  {r.status !== "pending" && r.status !== "active" && (
                    <span style={{ fontSize: "0.82rem", color: "var(--white-muted)", padding: "7px 14px" }}>No actions</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SALES ── */}
        {tab === "sales" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {sales.length === 0 && <div className="empty-state"><h3>No sales yet</h3></div>}
            {sales.map(s => (
              <div key={s.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "0.92rem", marginBottom: "3px" }}>{s.vehicles?.make} {s.vehicles?.model}</h3>
                  <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{s.profiles?.full_name || "Customer"} · {fmtDate(s.created_at)}</p>
                </div>
                <span style={{ color: "var(--red)", fontWeight: 800, fontSize: "1rem" }}>{formatFCFA(s.sale_price)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Owner sees everyone; Admin only sees customers */}
            {!isOwner && (
              <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "10px", padding: "10px 16px", fontSize: "0.83rem", color: "#fbbf24", marginBottom: "8px" }}>
                ⚠️ As an Admin, you can only manage customer accounts. Only the Owner can promote or demote admins.
              </div>
            )}

            {/* Premium segmented filter controls */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
              <button 
                onClick={() => setUserFilter("all")} 
                style={{ 
                  background: userFilter === "all" ? "var(--red)" : "var(--navy-mid)",
                  border: `1.5px solid ${userFilter === "all" ? "var(--red)" : "var(--navy-border)"}`,
                  color: "#fff",
                  fontSize: "0.82rem",
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                All Users ({users.filter(u => isOwner || u.role === "customer").length})
              </button>
              <button 
                onClick={() => setUserFilter("pending")} 
                style={{ 
                  background: userFilter === "pending" ? "var(--red)" : "var(--navy-mid)",
                  border: `1.5px solid ${userFilter === "pending" ? "var(--red)" : "var(--navy-border)"}`,
                  color: "#fff",
                  fontSize: "0.82rem",
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                ⌛ Pending Verification ({users.filter(u => (isOwner || u.role === "customer") && u.verification_status === "pending").length})
              </button>
            </div>

            {users
              .filter(u => isOwner || u.role === "customer") // admins only see customers
              .filter(u => userFilter === "all" || u.verification_status === "pending")
              .map(u => {
                const isProtected = !isOwner && (u.role === "admin" || u.role === "owner");
                return (
                  <div key={u.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                    
                    {/* Header Details Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", width: "100%" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                          <h3 style={{ fontSize: "0.92rem", margin: 0 }}>{u.full_name || "Unnamed User"}</h3>
                          
                          {/* Role Badge */}
                          {u.role === "owner" && <span style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: "100px" }}>OWNER</span>}
                          
                          {/* Verification Status Badge */}
                          <span className={`badge ${
                            u.verification_status === "verified" 
                              ? "badge-completed" 
                              : u.verification_status === "pending" 
                                ? "badge-pending" 
                                : "badge-sold"
                          }`} style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "100px", textTransform: "capitalize" }}>
                            {u.verification_status === "verified" 
                              ? "✓ Verified" 
                              : u.verification_status === "pending" 
                                ? "⌛ Pending" 
                                : "Unverified"}
                          </span>
                        </div>
                        <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{u.phone || "No phone"} · Joined {fmtDate(u.created_at)}</p>
                      </div>
                      
                      {/* Role dropdown and status info */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span className={`badge ${u.role === "owner" ? "badge-pending" : u.role === "admin" ? "badge-rented" : "badge-available"}`}>{u.role}</span>
                        {/* Only owner can change roles, and cannot demote themselves */}
                        {isOwner && u.id !== user?.id ? (
                          <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value)}
                            style={{ padding: "7px 10px", fontSize: "0.82rem", borderRadius: "8px" }}>
                            <option value="customer">Customer</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        ) : isOwner && u.id === user?.id ? (
                          <span style={{ color: "var(--white-muted)", fontSize: "0.8rem" }}>You (Owner)</span>
                        ) : (
                          <span style={{ color: "var(--white-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>View only</span>
                        )}
                      </div>
                    </div>

                    {/* ID Document Details & Verification Actions Panel */}
                    {(u.id_document_url || u.id_number || u.verification_status === "pending") && (
                      <div style={{
                        marginTop: "4px",
                        padding: "16px",
                        background: "var(--navy)",
                        border: "1px solid var(--navy-border)",
                        borderRadius: "10px",
                        width: "100%"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                          <div>
                            <p style={{ margin: "0 0 6px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--white-muted)", fontWeight: 700 }}>
                              Identification Details
                            </p>
                            <p style={{ margin: "0 0 6px", fontSize: "0.85rem", color: "var(--white-soft)" }}>
                              ID Number: <strong style={{ color: "var(--white)" }}>{u.id_number || "Not provided"}</strong>
                            </p>
                            {u.id_document_url ? (
                              <a 
                                href={u.id_document_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ 
                                  color: "#60a5fa", 
                                  fontSize: "0.82rem", 
                                  fontWeight: 600,
                                  textDecoration: "underline",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                              >
                                📄 View Submitted ID Document →
                              </a>
                            ) : (
                              <span style={{ fontSize: "0.82rem", color: "var(--white-muted)", fontStyle: "italic" }}>
                                No document photo uploaded
                              </span>
                            )}
                          </div>

                          {/* Approval / Rejection Controls */}
                          {u.verification_status === "pending" && (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => updateVerificationStatus(u.id, "verified")}
                                style={{
                                  background: "rgba(52,211,153,0.15)",
                                  color: "#34d399",
                                  border: "1px solid rgba(52,211,153,0.3)",
                                  padding: "8px 16px",
                                  fontSize: "0.8rem",
                                  borderRadius: "8px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                  display: "inline-flex"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(52,211,153,0.25)";
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(52,211,153,0.15)";
                                  e.currentTarget.style.transform = "none";
                                }}
                              >
                                ✓ Approve &amp; Verify
                              </button>
                              <button
                                onClick={() => updateVerificationStatus(u.id, "unverified")}
                                style={{
                                  background: "rgba(230,57,70,0.12)",
                                  color: "var(--red)",
                                  border: "1px solid rgba(230,57,70,0.3)",
                                  padding: "8px 16px",
                                  fontSize: "0.8rem",
                                  borderRadius: "8px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                  display: "inline-flex"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(230,57,70,0.2)";
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(230,57,70,0.12)";
                                  e.currentTarget.style.transform = "none";
                                }}
                              >
                                ✕ Reject Document
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* ── ACTIVITY LOGS ── */}
        {tab === "logs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ marginBottom: "16px", fontSize: "1rem" }}>Platform Timeline</h3>
              {activityLogs.length === 0 ? <p style={{ color: "var(--white-muted)" }}>No activity recorded yet.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {activityLogs.map((log, i) => (
                    <div key={log.id} style={{ display: "flex", gap: "14px", position: "relative", paddingBottom: i !== activityLogs.length - 1 ? "14px" : "0" }}>
                      {i !== activityLogs.length - 1 && <div style={{ position: "absolute", left: "6px", top: "24px", bottom: 0, width: "2px", background: "var(--navy-border)" }} />}
                      <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: log.color, marginTop: "4px", flexShrink: 0, zIndex: 2 }} />
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: "0.9rem" }}>{log.text}</p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--white-muted)" }}>
                          {format(new Date(log.date), "MMM dd, yyyy · HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FOOTER QUICK LINKS ── */}
        <footer style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid var(--navy-border)", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { label: "📊 Overview",      action: () => setTab("overview")  },
            { label: "🚗 Vehicles",      action: () => setTab("vehicles")  },
            { label: "📅 Rentals",       action: () => setTab("rentals")   },
            { label: "💰 Sales",         action: () => setTab("sales")     },
            { label: "👥 Users",         action: () => setTab("users")     },
            { label: "➕ Add Vehicle",   action: () => { setForm({ ...BLANK }); setEditId(null); setShowForm(true); setTab("vehicles"); } },
            { label: "🏠 Back to Site",  action: () => router.push("/")    },
          ].map(l => (
            <button key={l.label} onClick={l.action}
              style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", color: "var(--white-muted)", fontSize: "0.8rem", padding: "8px 14px", borderRadius: "8px", cursor: "pointer" }}>
              {l.label}
            </button>
          ))}
          <p style={{ width: "100%", textAlign: "center", color: "var(--navy-border)", fontSize: "0.75rem", marginTop: "12px" }}>
            DriveEasy Admin Dashboard · Buea, Cameroon · {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}

const sidebar: React.CSSProperties = {
  width: "220px", flexShrink: 0,
  background: "var(--navy-mid)", borderRight: "1px solid var(--navy-border)",
  display: "flex", flexDirection: "column", minHeight: "100%",
  position: "sticky", top: "68px", height: "calc(100vh - 68px)", overflowY: "auto",
};
