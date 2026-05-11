"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { calculateRentalPrice, type RentalPriceResult } from "@/lib/pricing";
import PaymentModal from "@/components/ui/PaymentModal";
import { CITIES_BY_REGION } from "@/lib/locations";
import { useLang } from "@/context/LangContext";

export default function RentPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [transFilter, setTransFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [payData, setPayData] = useState<{ vehicleId: string; vehicleName: string; userId: string; userEmail: string; userName: string; startDate: string; endDate: string; total: number } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      loadVehicles();
    });

    // Realtime sync for vehicles
    const channel = supabase.channel("realtime:vehicles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        (payload) => {
          console.log("Realtime change received:", payload);
          // Simply reload the vehicles list to ensure everything is fresh
          loadVehicles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const loadVehicles = async () => {
    setLoading(true);
    const { data } = await supabase.from("vehicles").select("*").in("type", ["rental", "both"]).eq("status", "available").order("created_at", { ascending: false });
    setVehicles(data || []);
    setLoading(false);
  };

  const filtered = vehicles.filter((v) => {
    const matchSearch = !search || `${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase());
    const matchFuel = !fuelFilter || v.fuel_type === fuelFilter;
    const matchTrans = !transFilter || v.transmission === transFilter;
    const matchPrice = !maxPrice || v.daily_rate <= Number(maxPrice);
    const matchCity = !cityFilter || v.location === cityFilter;
    return matchSearch && matchFuel && matchTrans && matchPrice && matchCity;
  });

  const handlePaymentSuccess = async () => {
    if (!payData) return;
    await supabase.from("rentals").insert({
      vehicle_id: payData.vehicleId, user_id: payData.userId,
      start_date: payData.startDate, end_date: payData.endDate,
      total_price: payData.total, status: "pending",
    });
    
    // Also update vehicle status to rented
    await supabase.from("vehicles").update({ status: "rented" }).eq("id", payData.vehicleId);
    
    setPayData(null);
    router.push("/rentals");
  };

  return (
    <div className="page">
      <h1 className="section-title">Rent a Vehicle</h1>
      <p className="section-subtitle">Browse our fleet — all prices in FCFA, dynamic pricing applies</p>

      {/* Filters */}
      <div style={filterBar}>
        <input placeholder="Search make or model..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 2 }} />
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          <option value="">All Cities</option>
          {CITIES_BY_REGION.map(({ region, cities }) => (
            <optgroup key={region} label={region}>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          ))}
        </select>
        <select value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
          <option value="">All Fuel Types</option>
          <option>Petrol</option><option>Diesel</option><option>Electric</option><option>Hybrid</option>
        </select>
        <select value={transFilter} onChange={(e) => setTransFilter(e.target.value)}>
          <option value="">All Transmissions</option>
          <option>Automatic</option><option>Manual</option>
        </select>
        <input type="number" placeholder="Max FCFA/day" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        <button style={{ background: "var(--navy-light)", color: "var(--white-muted)", padding: "10px 16px" }}
          onClick={() => { setSearch(""); setFuelFilter(""); setTransFilter(""); setMaxPrice(""); setCityFilter(""); }}>Clear</button>
      </div>

      {/* Dynamic Pricing Info Banner */}
      <div style={{ background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.18)", borderRadius: "12px", padding: "12px 18px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem", color: "var(--white-muted)" }}>
        <span style={{ fontSize: "1.1rem" }}>💡</span>
        <span><strong style={{ color: "var(--white-soft)" }}>Dynamic Pricing Active</strong> — Prices adjust automatically based on duration, weekends, season and booking time. Pick dates to see your real price.</span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /><span>Loading vehicles...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><h3>No vehicles found</h3><p>Try adjusting your filters</p></div>
      ) : (
        <>
          <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", marginBottom: "24px" }}>{filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} available</p>
          <div className="grid-3">
            {filtered.map((v) => (
              <RentalCard key={v.id} vehicle={v} onCheckout={async (startDate, endDate, total) => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { router.push("/login"); return; }
                const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();

                // Conflict check
                const { data: conflict } = await supabase.from("rentals").select("id").eq("vehicle_id", v.id).in("status", ["pending", "active"]).lte("start_date", endDate).gte("end_date", startDate);
                if (conflict && conflict.length > 0) { alert("Vehicle not available for these dates. Please choose different dates."); return; }

                setPayData({ vehicleId: v.id, vehicleName: `${v.make} ${v.model}`, userId: session.user.id, userEmail: session.user.email || "", userName: prof?.full_name || session.user.email || "Customer", startDate, endDate, total });
              }} />
            ))}
          </div>
        </>
      )}

      {payData && <PaymentModal amount={payData.total} description={`Rental: ${payData.vehicleName}`} onClose={() => setPayData(null)} onSuccess={handlePaymentSuccess} />}
    </div>
  );
}

function RentalCard({ vehicle: v, onCheckout }: { vehicle: any; onCheckout: (start: string, end: string, total: number) => void }) {
  const { t } = useLang();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pricing, setPricing] = useState<RentalPriceResult | null>(null);

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
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden", padding: "0" }}>
      {/* Image Header */}
      {v.image_url ? (
        <div style={{ height: "180px", background: "var(--navy)", width: "100%" }}>
          <img src={v.image_url} alt={`${v.make} ${v.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : (
        <div style={{ height: "180px", background: "var(--navy)", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "3rem", opacity: 0.5 }}>🚗</span>
        </div>
      )}

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "3px" }}>{v.make} {v.model}</h3>
            <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0 }}>{v.year} · {v.transmission} · {v.fuel_type}</p>
          </div>
          <span className="badge badge-available">{t("rent.available")}</span>
        </div>

      {/* Specs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {[`🎨 ${v.color}`, `💺 ${v.seats} seats`, v.mileage ? `📍 ${v.mileage.toLocaleString()} km` : null].filter(Boolean).map(s => (
          <span key={s!} style={{ background: "var(--navy)", padding: "3px 9px", borderRadius: "6px", fontSize: "0.75rem", color: "var(--white-muted)" }}>{s}</span>
        ))}
      </div>

      {/* Base rate */}
      <div style={{ background: "var(--navy)", borderRadius: "8px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--white-muted)", fontSize: "0.8rem" }}>Base rate</span>
        <span style={{ color: "var(--white-muted)", fontWeight: 600, fontSize: "0.95rem" }}>{formatFCFA(v.daily_rate)}<span style={{ fontSize: "0.75rem", fontWeight: 400 }}>/day</span></span>
      </div>

      {/* Date pickers */}
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "0.72rem", color: "var(--white-muted)", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Start</label>
          <input type="date" value={startDate} min={today} onChange={(e) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); }} style={{ padding: "8px 10px", fontSize: "0.85rem" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "0.72rem", color: "var(--white-muted)", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>End</label>
          <input type="date" value={endDate} min={startDate || today} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "8px 10px", fontSize: "0.85rem" }} />
        </div>
      </div>

      {/* Dynamic Price Breakdown */}
      {pricing && pricing.days > 0 && (
        <div style={{ background: "var(--navy)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Base */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem", color: "var(--white-muted)" }}>
            <span>{formatFCFA(v.daily_rate)} × {pricing.days} day{pricing.days > 1 ? "s" : ""}</span>
            <span>{formatFCFA(pricing.originalTotal)}</span>
          </div>

          {/* Factors */}
          {pricing.factors.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span style={{ color: f.type === "discount" ? "#34d399" : "#fbbf24" }}>
                {f.type === "discount" ? "↓" : "↑"} {f.label} ({f.type === "discount" ? "-" : "+"}{f.percent}%)
              </span>
              <span style={{ color: f.type === "discount" ? "#34d399" : "#fbbf24" }}>
                {f.type === "discount" ? "-" : "+"}{formatFCFA(f.amount)}
              </span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--navy-border)", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--white-muted)", margin: "0 0 2px" }}>Total ({pricing.days} days)</p>
              <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--red)", margin: 0 }}>{formatFCFA(pricing.total)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              {pricing.savings > 0 && (
                <span style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", padding: "4px 10px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700 }}>
                  Save {formatFCFA(pricing.savings)}
                </span>
              )}
              {pricing.savings < 0 && (
                <span style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", padding: "4px 10px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700 }}>
                  {formatFCFA(v.daily_rate)}/day → {formatFCFA(pricing.effectiveRate)}/day
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => pricing && onCheckout(startDate, endDate, pricing.total)}
        disabled={!pricing || pricing.days <= 0}
        style={{ marginTop: "auto" }}
      >
        {pricing && pricing.days > 0 ? `Pay ${formatFCFA(pricing.total)}` : "Select Dates to Book"}
      </button>
      </div>
    </div>
  );
}

const filterBar: React.CSSProperties = {
  display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px",
  background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "16px",
};