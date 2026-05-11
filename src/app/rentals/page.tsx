"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { emailRentalCancelled } from "@/lib/email";

const STATUS_COLORS: Record<string, string> = {
  pending: "#fbbf24", active: "#34d399", completed: "#9AAABF", cancelled: "var(--red)",
};

export default function RentalsPage() {
  const router = useRouter();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      loadRentals(session.user.id);
    });
  }, [router]);

  const loadRentals = async (userId: string) => {
    const { data } = await supabase
      .from("rentals").select("*, vehicles(make, model, year, color, fuel_type, transmission)")
      .eq("user_id", userId).order("created_at", { ascending: false });
    setRentals(data || []);
    setLoading(false);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this rental?")) return;
    setCancelling(id);

    const rental = rentals.find((r) => r.id === id);
    const { data: { session } } = await supabase.auth.getSession();

    await supabase.from("rentals").update({ status: "cancelled" }).eq("id", id);

    if (rental && session) {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
      await emailRentalCancelled({
        userEmail: session.user.email || "",
        userName: prof?.full_name || session.user.email || "Customer",
        vehicleName: rental.vehicles ? `${rental.vehicles.make} ${rental.vehicles.model}` : "Vehicle",
        rentalId: id,
      });
    }

    setRentals((prev) => prev.map((r) => r.id === id ? { ...r, status: "cancelled" } : r));
    setCancelling(null);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-CM", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="page">
      <h1 className="section-title">My Rentals</h1>
      <p className="section-subtitle">Track all your vehicle rentals and their status</p>

      {loading ? (
        <div className="loading"><div className="spinner" /><span>Loading rentals...</span></div>
      ) : rentals.length === 0 ? (
        <div className="empty-state">
          <h3>No rentals yet</h3>
          <p>You haven&apos;t rented any vehicles</p>
          <button onClick={() => router.push("/rent")} style={{ marginTop: "16px" }}>Browse Vehicles</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {rentals.map((r) => {
            const v = r.vehicles;
            const start = new Date(r.start_date);
            const end = new Date(r.end_date);
            const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);
            return (
              <div key={r.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h3 style={{ marginBottom: "4px" }}>{v ? `${v.make} ${v.model}` : "Vehicle"}</h3>
                    {v && <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0 }}>{v.year} · {v.transmission} · {v.fuel_type} · {v.color}</p>}
                  </div>
                  <span style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: `${STATUS_COLORS[r.status]}22`, color: STATUS_COLORS[r.status] }}>
                    {r.status}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  {[
                    { label: "Start Date", value: formatDate(r.start_date) },
                    { label: "End Date", value: formatDate(r.end_date) },
                    { label: "Duration", value: `${days} day${days !== 1 ? "s" : ""}` },
                    { label: "Total Price", value: formatFCFA(r.total_price) },
                  ].map((item) => (
                    <div key={item.label} style={{ background: "var(--navy)", borderRadius: "8px", padding: "10px 14px" }}>
                      <p style={{ color: "var(--white-muted)", fontSize: "0.75rem", margin: "0 0 4px" }}>{item.label}</p>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {(r.status === "pending" || r.status === "active") && (
                  <button
                    onClick={() => handleCancel(r.id)}
                    disabled={cancelling === r.id}
                    style={{ background: "transparent", border: "1.5px solid var(--red)", color: "var(--red)", alignSelf: "flex-start", padding: "8px 20px", fontSize: "0.85rem" }}
                  >
                    {cancelling === r.id ? "Cancelling..." : "Cancel Rental"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}