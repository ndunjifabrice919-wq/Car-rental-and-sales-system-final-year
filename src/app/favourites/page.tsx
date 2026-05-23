"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import FavouriteButton from "@/components/ui/FavouriteButton";

export default function FavouritesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data } = await supabase
        .from("favourites")
        .select("vehicle_id, vehicles(*)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setVehicles((data || []).map((f: any) => f.vehicles).filter(Boolean));
      setLoading(false);
    };
    load();
  }, [router]);

  return (
    <div className="page">
      <div style={{ marginBottom: "28px" }}>
        <h1 className="section-title">❤️ My Favourites</h1>
        <p className="section-subtitle">Vehicles you&apos;ve saved — rent or buy when you&apos;re ready</p>
      </div>

      {loading ? (
        <div className="grid-3">
          {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: "260px", borderRadius: "16px" }} />)}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🤍</div>
          <h3>No saved vehicles yet</h3>
          <p style={{ marginBottom: "24px" }}>Tap the heart ❤️ on any vehicle to save it here for later.</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/rent")}>Browse Rentals</button>
            <button onClick={() => router.push("/sales")} style={{ background: "transparent", border: "1.5px solid var(--navy-border)", color: "var(--white-muted)" }}>Browse for Sale</button>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {vehicles.map(v => (
            <div key={v.id} className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              {/* Heart button */}
              <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 2 }}>
                <FavouriteButton vehicleId={v.id} />
              </div>

              {/* Type badge */}
              <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 2 }}>
                <span style={{ background: v.type === "sale" || v.type === "both" ? "rgba(52,211,153,0.9)" : "rgba(230,57,70,0.9)", color: "#fff", fontSize: "0.7rem", fontWeight: 800, padding: "3px 10px", borderRadius: "100px", backdropFilter: "blur(4px)" }}>
                  {v.type === "sale" ? "FOR SALE" : v.type === "both" ? "RENT / BUY" : "RENTAL"}
                </span>
              </div>

              {/* Image */}
              <div style={{ height: "180px", overflow: "hidden", position: "relative" }}>
                {v.image_url ? (
                  <img src={v.image_url} alt={`${v.make} ${v.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--navy-light), var(--navy))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", opacity: 0.5 }}>🚗</div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "18px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>{v.make} {v.model}</h3>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {[v.year, v.transmission, v.fuel_type].filter(Boolean).map((s: string) => (
                    <span key={s} className="spec-pill">{s}</span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    {v.daily_rate && <p style={{ color: "var(--red)", fontWeight: 800, fontSize: "0.95rem", margin: 0 }}>{formatFCFA(v.daily_rate)}<span style={{ color: "var(--white-muted)", fontWeight: 400, fontSize: "0.75rem" }}>/day</span></p>}
                    {v.sale_price && <p style={{ color: "#34d399", fontWeight: 800, fontSize: "0.95rem", margin: 0 }}>{formatFCFA(v.sale_price)}</p>}
                  </div>
                  <span style={{ color: "var(--white-muted)", fontSize: "0.78rem" }}>📍 {v.location || "Cameroon"}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(v.type === "rental" || v.type === "both") && (
                    <button onClick={() => router.push("/rent")} style={{ flex: 1, padding: "9px", fontSize: "0.82rem" }}>Rent</button>
                  )}
                  {(v.type === "sale" || v.type === "both") && (
                    <button onClick={() => router.push("/sales")} style={{ flex: 1, padding: "9px", fontSize: "0.82rem", background: "transparent", border: "1.5px solid #34d399", color: "#34d399" }}>Buy</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
