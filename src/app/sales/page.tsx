"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { calculateSalePrice, type SalePriceResult } from "@/lib/pricing";
import PaymentModal from "@/components/ui/PaymentModal";
import { CITIES_BY_REGION } from "@/lib/locations";
import { useLang } from "@/context/LangContext";

export default function SalesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [transFilter, setTransFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [payData, setPayData] = useState<{ vehicle: any; adjustedPrice: number; userId: string; userEmail: string; userName: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      loadVehicles();
    });

    // Realtime sync for vehicles
    const channel = supabase.channel("realtime:vehicles_sales")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => {
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
    const { data } = await supabase.from("vehicles").select("*").in("type", ["sale", "both"]).eq("status", "available").order("created_at", { ascending: false });
    setVehicles(data || []);
    setLoading(false);
  };

  const filtered = vehicles.filter((v) => {
    const matchSearch = !search || `${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase());
    const matchTrans = !transFilter || v.transmission === transFilter;
    const pricing = calculateSalePrice(v.sale_price, v.mileage, v.year);
    const matchPrice = !maxPrice || pricing.adjustedPrice <= Number(maxPrice);
    const matchCity = !cityFilter || v.location === cityFilter;
    return matchSearch && matchTrans && matchPrice && matchCity;
  });

  const handleBuyClick = async (v: any, adjustedPrice: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
    setPayData({ vehicle: v, adjustedPrice, userId: session.user.id, userEmail: session.user.email || "", userName: prof?.full_name || session.user.email || "Customer" });
  };

  const handlePaymentSuccess = async () => {
    if (!payData) return;
    const v = payData.vehicle;
    await supabase.from("sales").insert({ vehicle_id: v.id, user_id: payData.userId, sale_price: payData.adjustedPrice });
    await supabase.from("vehicles").update({ status: "sold" }).eq("id", v.id);
    setPayData(null);
    setVehicles((prev) => prev.filter((x) => x.id !== v.id));
    router.push("/sales/history");
  };

  return (
    <div className="page">
      <h1 className="section-title">Vehicles for Sale</h1>
      <p className="section-subtitle">Own your dream car — dynamic FCFA pricing based on condition & demand</p>

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
        <select value={transFilter} onChange={(e) => setTransFilter(e.target.value)}>
          <option value="">All Transmissions</option>
          <option>Automatic</option><option>Manual</option>
        </select>
        <input type="number" placeholder="Max price (FCFA)" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        <button style={{ background: "var(--navy-light)", color: "var(--white-muted)", padding: "10px 16px" }}
          onClick={() => { setSearch(""); setTransFilter(""); setMaxPrice(""); setCityFilter(""); }}>Clear</button>
      </div>

      {/* Info Banner */}
      <div style={{ background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.18)", borderRadius: "12px", padding: "12px 18px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem", color: "var(--white-muted)" }}>
        <span style={{ fontSize: "1.1rem" }}>💡</span>
        <span><strong style={{ color: "var(--white-soft)" }}>Dynamic Pricing Active</strong> — Sale prices are automatically adjusted based on vehicle age, mileage and market demand.</span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /><span>Loading vehicles...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><h3>No vehicles for sale</h3><p>Check back soon or browse rentals</p></div>
      ) : (
        <>
          <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", marginBottom: "24px" }}>{filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} for sale</p>
          <div className="grid-3">
            {filtered.map((v) => {
              const pricing = calculateSalePrice(v.sale_price, v.mileage, v.year);
              return <SaleCard key={v.id} vehicle={v} pricing={pricing} onBuy={() => handleBuyClick(v, pricing.adjustedPrice)} />;
            })}
          </div>
        </>
      )}

      {payData && (
        <PaymentModal
          amount={payData.adjustedPrice}
          description={`${payData.vehicle.make} ${payData.vehicle.model} (${payData.vehicle.year}) — Purchase`}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPayData(null)}
        />
      )}
    </div>
  );
}

function SaleCard({ vehicle: v, pricing, onBuy }: { vehicle: any; pricing: SalePriceResult; onBuy: () => void }) {
  const { t } = useLang();
  const hasPriceChange = pricing.adjustedPrice !== pricing.basePrice;
  const isDiscount = pricing.adjustedPrice < pricing.basePrice;

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
          {pricing.demandBadge && (
            <span style={{
              padding: "3px 10px", borderRadius: "100px", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap",
              background: pricing.demandBadge === "Great Value" ? "rgba(52,211,153,0.12)" : pricing.demandBadge === "High Demand" ? "rgba(251,191,36,0.12)" : "rgba(96,165,250,0.12)",
              color: pricing.demandBadge === "Great Value" ? "#34d399" : pricing.demandBadge === "High Demand" ? "#fbbf24" : "#60a5fa",
            }}>
              {pricing.demandBadge}
            </span>
          )}
        </div>

      {/* Specs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {[`🎨 ${v.color}`, `💺 ${v.seats} seats`, v.mileage ? `📍 ${v.mileage.toLocaleString()} km` : null].filter(Boolean).map(s => (
          <span key={s!} style={{ background: "var(--navy)", padding: "3px 9px", borderRadius: "6px", fontSize: "0.75rem", color: "var(--white-muted)" }}>{s}</span>
        ))}
      </div>

      {v.description && <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>{v.description}</p>}

      {/* Price breakdown */}
      <div style={{ background: "var(--navy)", borderRadius: "10px", padding: "14px", marginTop: "auto" }}>
        {/* Listed price */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem", color: "var(--white-muted)", marginBottom: "6px" }}>
          <span>Listed Price</span>
          <span style={{ textDecoration: hasPriceChange ? "line-through" : "none" }}>{formatFCFA(pricing.basePrice)}</span>
        </div>

        {/* Factors */}
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

        {/* Final price */}
        <div style={{ borderTop: "1px solid var(--navy-border)", paddingTop: "10px", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "0.73rem", color: "var(--white-muted)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Price</p>
            <p style={{ fontSize: "1.3rem", fontWeight: 800, color: isDiscount ? "#34d399" : hasPriceChange ? "#60a5fa" : "var(--red)", margin: 0 }}>
              {formatFCFA(pricing.adjustedPrice)}
            </p>
          </div>
          {isDiscount && pricing.savings > 0 && (
            <span style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", padding: "4px 10px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700 }}>
              Save {formatFCFA(pricing.savings)}
            </span>
          )}
        </div>
      </div>

      <button onClick={onBuy} style={{ marginTop: "auto", padding: "12px", background: "var(--red)", color: "var(--white)", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "background 0.2s" }}>
        Buy Now — Pay with Orange / MOMO / Card
      </button>
      </div>
    </div>
  );
}

const filterBar: React.CSSProperties = {
  display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px",
  background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "16px",
};