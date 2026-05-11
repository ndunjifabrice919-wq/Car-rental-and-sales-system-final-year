"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";

export default function PurchaseHistoryPage() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      supabase.from("sales")
        .select("*, vehicles(make, model, year, color, fuel_type, transmission, mileage)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => { setSales(data || []); setLoading(false); });
    });
  }, [router]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-CM", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="page">
      <h1 className="section-title">My Purchases</h1>
      <p className="section-subtitle">All vehicles you have purchased through DriveEasy</p>

      {loading ? (
        <div className="loading"><div className="spinner" /><span>Loading purchases...</span></div>
      ) : sales.length === 0 ? (
        <div className="empty-state">
          <h3>No purchases yet</h3>
          <p>Browse our vehicles for sale and own your dream car</p>
          <button onClick={() => router.push("/sales")} style={{ marginTop: "16px" }}>Browse for Sale</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {sales.map((s) => {
            const v = s.vehicles;
            return (
              <div key={s.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <h3 style={{ marginBottom: "4px" }}>{v ? `${v.make} ${v.model}` : "Vehicle"}</h3>
                    {v && <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: "0 0 12px" }}>{v.year} · {v.transmission} · {v.fuel_type} · {v.color}</p>}
                    <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: 0 }}>Purchased on {formatDate(s.created_at)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.75rem", margin: "0 0 4px" }}>Purchase Price</p>
                    <p style={{ color: "var(--red)", fontWeight: 800, fontSize: "1.4rem", margin: 0 }}>{formatFCFA(s.sale_price)}</p>
                  </div>
                </div>
                {v?.mileage && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--navy-border)" }}>
                    <span style={{ background: "var(--navy)", padding: "4px 10px", borderRadius: "6px", fontSize: "0.78rem", color: "var(--white-muted)" }}>
                      📍 {v.mileage.toLocaleString()} km at time of sale
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}