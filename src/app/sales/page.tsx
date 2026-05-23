"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { calculateSalePrice, type SalePriceResult } from "@/lib/pricing";
import PaymentModal from "@/components/ui/PaymentModal";
import ReauthModal from "@/components/ui/ReauthModal";
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
        <div className="shimmer" style={{ height: "80px", borderRadius: "8px", marginTop: "4px" }} />
        <div className="shimmer" style={{ height: "42px", borderRadius: "8px" }} />
      </div>
    </div>
  );
}

export default function SalesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [transFilter, setTransFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [payData, setPayData] = useState<{ vehicle: any; adjustedPrice: number; userId: string; userEmail: string; userName: string } | null>(null);
  const [pendingPayData, setPendingPayData] = useState<typeof payData>(null);
  const [verGate, setVerGate] = useState<{ missing: string[] } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      loadVehicles();
    });

    const channel = supabase.channel("realtime:vehicles_sales")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => loadVehicles())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const loadVehicles = async () => {
    setLoading(true);
    const { data } = await supabase.from("vehicles").select("*").in("type", ["sale", "both"]).eq("status", "available").order("created_at", { ascending: false });
    setVehicles(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = vehicles.filter(v => {
      const pricing = calculateSalePrice(v.sale_price, v.mileage, v.year);
      const matchSearch = !search || `${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase());
      const matchTrans = !transFilter || v.transmission === transFilter;
      const matchPrice = !maxPrice || pricing.adjustedPrice <= Number(maxPrice);
      const matchCity = !cityFilter || v.location === cityFilter;
      return matchSearch && matchTrans && matchPrice && matchCity;
    });

    if (sortBy === "price-asc") list = [...list].sort((a, b) => (a.sale_price || 0) - (b.sale_price || 0));
    else if (sortBy === "price-desc") list = [...list].sort((a, b) => (b.sale_price || 0) - (a.sale_price || 0));

    return list;
  }, [vehicles, search, transFilter, maxPrice, cityFilter, sortBy]);

  const handleBuyClick = async (v: any, adjustedPrice: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    // KYC gate — stricter for purchases
    const { data: prof } = await supabase.from("profiles").select("full_name, phone, id_number, id_document_url").eq("id", session.user.id).single();
    const missing: string[] = [];
    if (!prof?.full_name?.trim()) missing.push("Full name (Profile → Edit Profile)");
    if (!prof?.phone?.trim()) missing.push("Phone number (Profile → Edit Profile)");
    if (!prof?.id_number?.trim()) missing.push("ID number (Profile → Verification)");
    if (!prof?.id_document_url) missing.push("ID document photo (Profile → Verification)");

    if (missing.length > 0) { setVerGate({ missing }); return; }

    // All checks passed — show Reauth OTP modal first
    setPendingPayData({ vehicle: v, adjustedPrice, userId: session.user.id, userEmail: session.user.email || "", userName: prof?.full_name || session.user.email || "Customer" });
  };

  const handlePaymentSuccess = async () => {
    if (!payData) return;
    const v = payData.vehicle;
    await supabase.from("sales").insert({ vehicle_id: v.id, user_id: payData.userId, sale_price: payData.adjustedPrice });
    await supabase.from("vehicles").update({ status: "sold" }).eq("id", v.id);
    setPayData(null);
    setVehicles(prev => prev.filter(x => x.id !== v.id));
    router.push("/sales/history");
  };

  const hasActiveFilters = !!(search || transFilter || maxPrice || cityFilter);
  const clearFilters = () => { setSearch(""); setTransFilter(""); setMaxPrice(""); setCityFilter(""); };

  return (
    <div className="page">
      <div style={{ marginBottom: "24px" }}>
        <h1 className="section-title">Vehicles for Sale</h1>
        <p className="section-subtitle" style={{ marginBottom: "16px" }}>Own your dream car — competitive FCFA pricing with dynamic market adjustments</p>

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
          {!loading && <span style={{ color: "var(--white-muted)", fontSize: "0.84rem" }}>{filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} for sale</span>}
        </div>
      </div>

      {filtersOpen && (
        <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "14px", padding: "20px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px", animation: "fadeInUp 0.2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
            <input placeholder="Search make or model…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: "0.87rem" }} />
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{ fontSize: "0.87rem" }}>
              <option value="">All Cities</option>
              {CITIES_BY_REGION.map(({ region, cities }) => (
                <optgroup key={region} label={region}>{cities.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
              ))}
            </select>
            <select value={transFilter} onChange={e => setTransFilter(e.target.value)} style={{ fontSize: "0.87rem" }}>
              <option value="">All Transmissions</option>
              <option>Automatic</option><option>Manual</option>
            </select>
            <input type="number" placeholder="Max price (FCFA)" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ fontSize: "0.87rem" }} />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ alignSelf: "flex-start", background: "transparent", border: "1px solid var(--navy-border)", color: "var(--white-muted)", padding: "8px 16px", fontSize: "0.82rem" }}>
              ✕ Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div style={{ background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.15)", borderRadius: "12px", padding: "12px 18px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.83rem", color: "var(--white-muted)" }}>
        <span>💡</span>
        <span><strong style={{ color: "var(--white-soft)" }}>Dynamic Pricing Active</strong> — Sale prices adjust based on vehicle age, mileage and market demand.</span>
      </div>

      {/* Security notice */}
      <div style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "12px", padding: "12px 18px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.83rem", color: "var(--white-muted)" }}>
        <span>🛡️</span>
        <span><strong style={{ color: "#34d399" }}>KYC Verified Purchases</strong> — All vehicle purchases require identity verification. Your details are encrypted and protected.</span>
      </div>

      {loading ? (
        <div className="grid-3">
          {[1, 2, 3, 4, 5, 6].map(i => <VehicleShimmer key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🏷️</div>
          <h3>No vehicles for sale</h3>
          <p style={{ marginBottom: "20px" }}>{hasActiveFilters ? "Try adjusting your filters" : "Check back soon or browse our rental fleet"}</p>
          {hasActiveFilters ? <button onClick={clearFilters}>Clear Filters</button> : <button onClick={() => router.push("/rent")}>Browse Rentals Instead</button>}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(v => {
            const pricing = calculateSalePrice(v.sale_price, v.mileage, v.year);
            return <SaleCard key={v.id} vehicle={v} pricing={pricing} onBuy={() => handleBuyClick(v, pricing.adjustedPrice)} />;
          })}
        </div>
      )}

      {pendingPayData && (
        <ReauthModal
          userEmail={pendingPayData.userEmail}
          onSuccess={() => { setPayData(pendingPayData); setPendingPayData(null); }}
          onClose={() => setPendingPayData(null)}
        />
      )}
      {payData && (
        <PaymentModal
          amount={payData.adjustedPrice}
          description={`${payData.vehicle.make} ${payData.vehicle.model} (${payData.vehicle.year}) — Purchase`}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPayData(null)}
        />
      )}
      {verGate && <VerificationGate missing={verGate.missing} context="purchase" onClose={() => setVerGate(null)} />}
    </div>
  );
}

function SaleCard({ vehicle: v, pricing, onBuy }: { vehicle: any; pricing: SalePriceResult; onBuy: () => void }) {
  const hasPriceChange = pricing.adjustedPrice !== pricing.basePrice;
  const isDiscount = pricing.adjustedPrice < pricing.basePrice;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
      {/* Image */}
      {v.image_url ? (
        <div className="vehicle-card-image">
          <img src={v.image_url} alt={`${v.make} ${v.model}`} loading="lazy" decoding="async" />
          <div className="vehicle-card-image-overlay" />
          <span className="vehicle-card-price-badge">{formatFCFA(pricing.adjustedPrice)}</span>
          {v.location && <span style={{ position: "absolute", top: 12, right: 12, background: "rgba(13,27,42,0.8)", backdropFilter: "blur(4px)", color: "var(--white-muted)", padding: "3px 10px", borderRadius: "100px", fontSize: "0.68rem", fontWeight: 600 }}>📍 {v.location}</span>}
        </div>
      ) : (
        <div className="vehicle-card-placeholder">🚗</div>
      )}

      <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "3px" }}>{v.make} {v.model}</h3>
            <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{v.year} · {v.transmission} · {v.fuel_type}</p>
          </div>
          {pricing.demandBadge && (
            <span style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap",
              background: pricing.demandBadge === "Great Value" ? "rgba(52,211,153,0.12)" : pricing.demandBadge === "High Demand" ? "rgba(251,191,36,0.12)" : "rgba(96,165,250,0.12)",
              color: pricing.demandBadge === "Great Value" ? "#34d399" : pricing.demandBadge === "High Demand" ? "#fbbf24" : "#60a5fa",
            }}>
              {pricing.demandBadge}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[v.color && `🎨 ${v.color}`, v.seats && `💺 ${v.seats} seats`, v.mileage && `📍 ${v.mileage.toLocaleString()} km`].filter(Boolean).map(s => (
            <span key={s!} className="spec-pill">{s}</span>
          ))}
        </div>

        {v.description && <p style={{ color: "var(--white-muted)", fontSize: "0.83rem", margin: 0, lineHeight: 1.6 }}>{v.description}</p>}

        {/* Price breakdown */}
        <div style={{ background: "var(--navy)", borderRadius: "10px", padding: "14px", marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--white-muted)", marginBottom: "6px" }}>
            <span>Listed Price</span>
            <span style={{ textDecoration: hasPriceChange ? "line-through" : "none" }}>{formatFCFA(pricing.basePrice)}</span>
          </div>
          {pricing.factors.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.79rem", marginBottom: "4px" }}>
              <span style={{ color: f.type === "discount" ? "#34d399" : "#60a5fa" }}>
                {f.type === "discount" ? "↓" : "↑"} {f.label} ({f.type === "discount" ? "-" : "+"}{f.percent}%)
              </span>
              <span style={{ color: f.type === "discount" ? "#34d399" : "#60a5fa" }}>
                {f.type === "discount" ? "-" : "+"}{formatFCFA(f.amount)}
              </span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--navy-border)", paddingTop: "10px", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "0.72rem", color: "var(--white-muted)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Price</p>
              <p style={{ fontSize: "1.3rem", fontWeight: 800, color: isDiscount ? "#34d399" : hasPriceChange ? "#60a5fa" : "var(--red)", margin: 0 }}>
                {formatFCFA(pricing.adjustedPrice)}
              </p>
            </div>
            {isDiscount && pricing.savings > 0 && (
              <span style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", padding: "4px 10px", borderRadius: "100px", fontSize: "0.73rem", fontWeight: 700 }}>
                Save {formatFCFA(pricing.savings)}
              </span>
            )}
          </div>
        </div>

        <button onClick={onBuy} style={{ fontWeight: 700, fontSize: "0.95rem" }}>
          🛡️ Buy Now — Orange / MoMo / Card
        </button>
      </div>
    </div>
  );
}