"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { calculateRentalPrice, type RentalPriceResult } from "@/lib/pricing";
import PaymentModal from "@/components/ui/PaymentModal";
import VerificationGate from "@/components/ui/VerificationGate";
import { CITIES_BY_REGION } from "@/lib/locations";
import { useLang } from "@/context/LangContext";

function VehicleShimmer() {
  return (
    <div style={{ borderRadius: "16px", overflow: "hidden", background: "var(--navy-mid)", border: "1px solid var(--navy-border)" }}>
      <div className="shimmer" style={{ height: "200px" }} />
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div className="shimmer" style={{ height: "18px", width: "60%", borderRadius: "6px" }} />
        <div className="shimmer" style={{ height: "14px", width: "80%", borderRadius: "6px" }} />
        <div style={{ display: "flex", gap: "6px" }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: "24px", width: "60px", borderRadius: "6px" }} />)}
        </div>
        <div className="shimmer" style={{ height: "42px", borderRadius: "8px", marginTop: "8px" }} />
      </div>
    </div>
  );
}

export default function RentPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [transFilter, setTransFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [payData, setPayData] = useState<{ vehicleId: string; vehicleName: string; userId: string; userEmail: string; userName: string; startDate: string; endDate: string; total: number } | null>(null);
  const [verGate, setVerGate] = useState<{ missing: string[] } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      loadVehicles();
    });

    const channel = supabase.channel("realtime:vehicles")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => loadVehicles())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const loadVehicles = async () => {
    setLoading(true);
    const { data } = await supabase.from("vehicles").select("*").in("type", ["rental", "both"]).eq("status", "available").order("created_at", { ascending: false });
    setVehicles(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = vehicles.filter(v => {
      const matchSearch = !search || `${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase());
      const matchFuel = !fuelFilter || v.fuel_type === fuelFilter;
      const matchTrans = !transFilter || v.transmission === transFilter;
      const matchPrice = !maxPrice || v.daily_rate <= Number(maxPrice);
      const matchCity = !cityFilter || v.location === cityFilter;
      return matchSearch && matchFuel && matchTrans && matchPrice && matchCity;
    });

    if (sortBy === "price-asc") list = [...list].sort((a, b) => (a.daily_rate || 0) - (b.daily_rate || 0));
    else if (sortBy === "price-desc") list = [...list].sort((a, b) => (b.daily_rate || 0) - (a.daily_rate || 0));
    // newest is default DB order

    return list;
  }, [vehicles, search, fuelFilter, transFilter, maxPrice, cityFilter, sortBy]);

  const handlePaymentSuccess = async () => {
    if (!payData) return;
    await supabase.from("rentals").insert({
      vehicle_id: payData.vehicleId, user_id: payData.userId,
      start_date: payData.startDate, end_date: payData.endDate,
      total_price: payData.total, status: "pending",
    });
    await supabase.from("vehicles").update({ status: "rented" }).eq("id", payData.vehicleId);
    setPayData(null);
    router.push("/rentals");
  };

  const handleCheckout = async (v: any, startDate: string, endDate: string, total: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    // KYC gate check
    const { data: prof } = await supabase.from("profiles").select("full_name, phone, id_number, id_document_url").eq("id", session.user.id).single();
    const missing: string[] = [];
    if (!prof?.full_name?.trim()) missing.push("Full name (Profile → Edit Profile)");
    if (!prof?.phone?.trim()) missing.push("Phone number (Profile → Edit Profile)");
    if (!prof?.id_number?.trim()) missing.push("ID number (Profile → Verification)");
    if (!prof?.id_document_url) missing.push("ID document photo (Profile → Verification)");

    if (missing.length > 0) { setVerGate({ missing }); return; }

    // Conflict check
    const { data: conflict } = await supabase.from("rentals").select("id").eq("vehicle_id", v.id).in("status", ["pending", "active"]).lte("start_date", endDate).gte("end_date", startDate);
    if (conflict && conflict.length > 0) { alert("This vehicle is not available for the selected dates. Please choose different dates."); return; }

    setPayData({ vehicleId: v.id, vehicleName: `${v.make} ${v.model}`, userId: session.user.id, userEmail: session.user.email || "", userName: prof?.full_name || session.user.email || "Customer", startDate, endDate, total });
  };

  const hasActiveFilters = !!(search || fuelFilter || transFilter || maxPrice || cityFilter);
  const clearFilters = () => { setSearch(""); setFuelFilter(""); setTransFilter(""); setMaxPrice(""); setCityFilter(""); };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 className="section-title">Rent a Vehicle</h1>
        <p className="section-subtitle" style={{ marginBottom: "16px" }}>Browse our fleet — FCFA pricing, dynamic rates by date and season</p>

        {/* Mobile filter toggle */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setFiltersOpen(!filtersOpen)}
            style={{ background: filtersOpen ? "var(--red)" : "var(--navy-light)", border: "1px solid var(--navy-border)", color: filtersOpen ? "var(--white)" : "var(--white-muted)", padding: "9px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
            {filtersOpen ? "✕ Hide Filters" : "⚙️ Filters"}
            {hasActiveFilters && <span style={{ background: "var(--red)", color: "#fff", borderRadius: "100px", padding: "1px 7px", fontSize: "0.7rem", fontWeight: 800 }}>ON</span>}
          </button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "9px 14px", fontSize: "0.85rem", width: "auto" }}>
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
          {!loading && <span style={{ color: "var(--white-muted)", fontSize: "0.84rem" }}>{filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} available</span>}
        </div>
      </div>

      {/* Filter Panel */}
      {filtersOpen && (
        <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "14px", padding: "20px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px", animation: "fadeInUp 0.2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
            <input placeholder="Search make or model…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: "0.87rem" }} />
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{ fontSize: "0.87rem" }}>
              <option value="">All Cities</option>
              {CITIES_BY_REGION.map(({ region, cities }) => (
                <optgroup key={region} label={region}>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              ))}
            </select>
            <select value={fuelFilter} onChange={e => setFuelFilter(e.target.value)} style={{ fontSize: "0.87rem" }}>
              <option value="">All Fuel Types</option>
              <option>Petrol</option><option>Diesel</option><option>Electric</option><option>Hybrid</option>
            </select>
            <select value={transFilter} onChange={e => setTransFilter(e.target.value)} style={{ fontSize: "0.87rem" }}>
              <option value="">All Transmissions</option>
              <option>Automatic</option><option>Manual</option>
            </select>
            <input type="number" placeholder="Max FCFA/day" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ fontSize: "0.87rem" }} />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ alignSelf: "flex-start", background: "transparent", border: "1px solid var(--navy-border)", color: "var(--white-muted)", padding: "8px 16px", fontSize: "0.82rem" }}>
              ✕ Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Dynamic Pricing Info Banner */}
      <div style={{ background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.15)", borderRadius: "12px", padding: "12px 18px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.83rem", color: "var(--white-muted)" }}>
        <span style={{ fontSize: "1rem" }}>💡</span>
        <span><strong style={{ color: "var(--white-soft)" }}>Dynamic Pricing Active</strong> — Rates adjust based on duration, weekends, season and booking time. Select dates to see your exact price.</span>
      </div>

      {/* Vehicle Grid */}
      {loading ? (
        <div className="grid-3">
          {[1, 2, 3, 4, 5, 6].map(i => <VehicleShimmer key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🚗</div>
          <h3>No vehicles found</h3>
          <p style={{ marginBottom: "20px" }}>{hasActiveFilters ? "Try adjusting your filters" : "Check back soon — new vehicles are added regularly"}</p>
          {hasActiveFilters && <button onClick={clearFilters} style={{ padding: "10px 24px" }}>Clear Filters</button>}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(v => (
            <RentalCard key={v.id} vehicle={v} onCheckout={(startDate, endDate, total) => handleCheckout(v, startDate, endDate, total)} />
          ))}
        </div>
      )}

      {payData && <PaymentModal amount={payData.total} description={`Rental: ${payData.vehicleName}`} onClose={() => setPayData(null)} onSuccess={handlePaymentSuccess} />}
      {verGate && <VerificationGate missing={verGate.missing} context="rental" onClose={() => setVerGate(null)} />}
    </div>
  );
}

function RentalCard({ vehicle: v, onCheckout }: { vehicle: any; onCheckout: (start: string, end: string, total: number) => void }) {
  const { t } = useLang();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pricing, setPricing] = useState<RentalPriceResult | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (startDate && endDate && v.daily_rate) {
      const result = calculateRentalPrice(v.daily_rate, startDate, endDate);
      setPricing(result.days > 0 ? result : null);
    } else {
      setPricing(null);
    }
  }, [startDate, endDate, v.daily_rate]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="card" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: 0, transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s" }}>

      {/* Image */}
      {v.image_url ? (
        <div className="vehicle-card-image">
          <img src={v.image_url} alt={`${v.make} ${v.model}`} loading="lazy" decoding="async" />
          <div className="vehicle-card-image-overlay" />
          <span className="vehicle-card-price-badge">{formatFCFA(v.daily_rate)}/day</span>
          {v.location && <span style={{ position: "absolute", top: 12, right: 12, background: "rgba(13,27,42,0.8)", backdropFilter: "blur(4px)", color: "var(--white-muted)", padding: "3px 10px", borderRadius: "100px", fontSize: "0.68rem", fontWeight: 600 }}>📍 {v.location}</span>}
        </div>
      ) : (
        <div className="vehicle-card-placeholder">🚗</div>
      )}

      <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "3px" }}>{v.make} {v.model}</h3>
            <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{v.year} · {v.transmission} · {v.fuel_type}</p>
          </div>
          <span className="badge badge-available">{t("rent.available")}</span>
        </div>

        {/* Spec pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            v.color && `🎨 ${v.color}`,
            v.seats && `💺 ${v.seats} seats`,
            v.mileage && `📍 ${v.mileage.toLocaleString()} km`,
          ].filter(Boolean).map(s => (
            <span key={s!} className="spec-pill">{s}</span>
          ))}
        </div>

        {/* Base rate */}
        <div style={{ background: "var(--navy)", borderRadius: "8px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--white-muted)", fontSize: "0.8rem" }}>Base rate</span>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{formatFCFA(v.daily_rate)}<span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--white-muted)" }}>/day</span></span>
        </div>

        {/* Date pickers */}
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.68rem", color: "var(--white-muted)", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>Start</label>
            <input type="date" value={startDate} min={today} onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); }} style={{ padding: "9px 10px", fontSize: "0.85rem" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.68rem", color: "var(--white-muted)", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>End</label>
            <input type="date" value={endDate} min={startDate || today} onChange={e => setEndDate(e.target.value)} style={{ padding: "9px 10px", fontSize: "0.85rem" }} />
          </div>
        </div>

        {/* Dynamic Price Breakdown */}
        {pricing && pricing.days > 0 && (
          <div style={{ background: "var(--navy)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--white-muted)" }}>
              <span>{formatFCFA(v.daily_rate)} × {pricing.days} day{pricing.days > 1 ? "s" : ""}</span>
              <span>{formatFCFA(pricing.originalTotal)}</span>
            </div>
            {pricing.factors.map((f, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.79rem" }}>
                <span style={{ color: f.type === "discount" ? "#34d399" : "#fbbf24" }}>
                  {f.type === "discount" ? "↓" : "↑"} {f.label} ({f.type === "discount" ? "-" : "+"}{f.percent}%)
                </span>
                <span style={{ color: f.type === "discount" ? "#34d399" : "#fbbf24" }}>
                  {f.type === "discount" ? "-" : "+"}{formatFCFA(f.amount)}
                </span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--navy-border)", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--white-muted)", margin: "0 0 2px" }}>Total ({pricing.days} days)</p>
                <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--red)", margin: 0 }}>{formatFCFA(pricing.total)}</p>
              </div>
              {pricing.savings > 0 && (
                <span style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", padding: "4px 10px", borderRadius: "100px", fontSize: "0.73rem", fontWeight: 700 }}>
                  Save {formatFCFA(pricing.savings)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => pricing && onCheckout(startDate, endDate, pricing.total)}
          disabled={!pricing || pricing.days <= 0}
          style={{ marginTop: "auto", fontWeight: 700 }}
        >
          {pricing && pricing.days > 0 ? `Book for ${formatFCFA(pricing.total)}` : "Select Dates to Book"}
        </button>
      </div>
    </div>
  );
}