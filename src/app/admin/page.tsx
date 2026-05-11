"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { CITIES_BY_REGION } from "@/lib/locations";
import { useAuth } from "@/context/AuthContext";
import { uploadVehicleImage } from "@/lib/storage";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

type Tab = "overview" | "vehicles" | "rentals" | "sales" | "users" | "logs";

const BLANK = {
  make: "", model: "", year: new Date().getFullYear(), type: "rental",
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
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ vehicles: 0, rentals: 0, sales: 0, revenue: 0, pending: 0 });
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
    setStats({ vehicles: v.data?.length || 0, rentals: rentalsWithProfiles.length, sales: salesWithProfiles.length, revenue, pending });
    setLoading(false);
  };

  const saveVehicle = async () => {
    if (!form.make || !form.model) { setFormMsg("Make and model are required."); return; }
    setSaving(true); setFormMsg("");

    // Upload image if a file was selected
    let imageUrl = form.image_url;
    if (imageFile) {
      setUploading(true);
      const res = await uploadVehicleImage(imageFile);
      setUploading(false);
      
      if (res.error) {
        setFormMsg(`Upload failed: ${res.error}. Did you create the 'vehicle-images' bucket?`);
        setSaving(false);
        return;
      } else if (res.url) {
        imageUrl = res.url;
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
    setImageFile(null); setImagePreview(null);
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
    await supabase.from("profiles").update({ role }).eq("id", id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-CM", { day: "2-digit", month: "short", year: "numeric" });
  const fc = (v: any) => ({ field: v, val: (form as any)[v], onChange: (val: any) => setForm(f => ({ ...f, [v]: val })) });

  const isOwner = profile?.role === "owner";
  const isAdminOrOwner = profile?.role === "admin" || profile?.role === "owner";

  if (authLoading || loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user || !isAdminOrOwner) return null;

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 68px)" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ ...sidebar, display: sidebarOpen ? "flex" : undefined }}>
        <div style={{ padding: "20px 16px 12px" }}>
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
      <main style={{ flex: 1, padding: "32px 28px", overflowY: "auto" }}>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: "none", background: "var(--navy-light)", border: "none", color: "var(--white)", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }} className="mob-menu-btn">☰</button>
            <div>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>{NAV_ITEMS.find(n => n.key === tab)?.icon} {NAV_ITEMS.find(n => n.key === tab)?.label}</h1>
              <p style={{ color: "var(--white-muted)", margin: 0, fontSize: "0.82rem" }}>DriveEasy {isOwner ? "Owner" : "Admin"} · {new Date().toLocaleDateString("fr-CM", { weekday: "long", day: "numeric", month: "long" })}</p>
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
            <div className="form-group" style={{ marginTop: "14px" }}>
              <label className="form-label">Vehicle Image</label>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px", background: "var(--navy)", border: "2px dashed var(--navy-border)", borderRadius: "10px", cursor: "pointer", fontSize: "0.88rem", color: "var(--white-muted)", transition: "border-color 0.2s" }}>
                  📷 {imageFile ? "Change Photo" : "Upload from Device"}
                  <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setImageFile(f);
                      setImagePreview(URL.createObjectURL(f));
                    }
                  }} />
                </label>
                {(imagePreview || form.image_url) && (
                  <div style={{ position: "relative" }}>
                    <img src={imagePreview || form.image_url} alt="Preview" style={{ width: "80px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--navy-border)" }} />
                    {imageFile && <span style={{ position: "absolute", top: "-6px", right: "-6px", background: "#34d399", color: "#000", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800 }}>✓</span>}
                  </div>
                )}
                {imageFile && <span style={{ fontSize: "0.78rem", color: "var(--white-muted)", alignSelf: "center" }}>{imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)</span>}
              </div>
              {uploading && <p style={{ color: "#fbbf24", fontSize: "0.82rem", marginTop: "6px" }}>⏳ Uploading image...</p>}
            </div>
            <button onClick={saveVehicle} disabled={saving || uploading} style={{ marginTop: "18px" }}>
              {uploading ? "Uploading Image..." : saving ? "Saving..." : editId ? "Update Vehicle" : "Add Vehicle"}
            </button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px", marginBottom: "28px" }}>
              {[
                { label: "Total Vehicles", value: stats.vehicles, color: "var(--white)", icon: "🚗" },
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
                    <Tooltip contentStyle={{ background: "var(--navy)", border: "1px solid var(--navy-border)", borderRadius: "8px" }} formatter={(value: number) => formatFCFA(value)} />
                    <Line type="monotone" dataKey="amount" stroke="var(--red)" strokeWidth={3} dot={{ r: 4, fill: "var(--red)" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--white-muted)", fontSize: "0.85rem" }}>No revenue data yet</div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
              <div key={v.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {v.image_url ? (
                    <img src={v.image_url} alt="Vehicle" style={{ width: "60px", height: "45px", objectFit: "cover", borderRadius: "6px" }} />
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
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
              <div key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "0.92rem", marginBottom: "3px" }}>{r.vehicles?.make} {r.vehicles?.model}</h3>
                  <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>
                    {r.profiles?.full_name || "Customer"} · {fmtDate(r.start_date)} → {fmtDate(r.end_date)} · {formatFCFA(r.total_price)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
            {users
              .filter(u => isOwner || u.role === "customer") // admins only see customers
              .map(u => {
                const isProtected = !isOwner && (u.role === "admin" || u.role === "owner");
                return (
                  <div key={u.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                        <h3 style={{ fontSize: "0.92rem", margin: 0 }}>{u.full_name || "Unnamed User"}</h3>
                        {u.role === "owner" && <span style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: "100px" }}>OWNER</span>}
                      </div>
                      <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{u.phone || "No phone"} · Joined {fmtDate(u.created_at)}</p>
                    </div>
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
