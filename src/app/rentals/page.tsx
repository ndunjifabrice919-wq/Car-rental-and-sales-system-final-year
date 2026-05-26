"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { emailRentalCancelled } from "@/lib/email";
import RatingModal from "@/components/ui/RatingModal";
import { useLang } from "@/context/LangContext";

const STATUS_ORDER = ["pending", "active", "completed"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Booked",
  active: "Active",
  completed: "Done",
  cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "#fbbf24",
  active: "#34d399",
  completed: "#9AAABF",
  cancelled: "var(--red)",
};

function StatusTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: "8px" }}>
        <span style={{ color: "var(--red)", fontSize: "0.8rem", fontWeight: 700 }}>✕ CANCELLED</span>
      </div>
    );
  }
  const currentIdx = STATUS_ORDER.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%", maxWidth: "340px" }}>
      {STATUS_ORDER.map((step, i) => {
        const isDone = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STATUS_ORDER.length - 1 ? 1 : "unset" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div style={{
                width: "14px", height: "14px", borderRadius: "50%",
                background: isDone ? (isCurrent ? STATUS_COLORS[status] : "#34d399") : "var(--navy-border)",
                boxShadow: isCurrent ? `0 0 0 3px ${STATUS_COLORS[status]}33` : "none",
                transition: "all 0.3s",
                position: "relative", zIndex: 1,
              }} />
              <span style={{ fontSize: "0.62rem", color: isDone ? "var(--white-soft)" : "var(--navy-border)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                {STATUS_LABELS[step]}
              </span>
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div style={{ flex: 1, height: "2px", background: i < currentIdx ? "#34d399" : "var(--navy-border)", margin: "0 4px", marginBottom: "16px", transition: "background 0.3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RentalsPage() {
  const router = useRouter();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const { lang } = useLang();
  const [ratingTarget, setRatingTarget] = useState<{ rentalId: string; vehicleId: string; vehicleName: string } | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      loadRentals(session.user.id);
    });
  }, [router]);

  const loadRentals = async (userId: string) => {
    const { data } = await supabase
      .from("rentals").select("*, vehicles(make, model, year, color, fuel_type, transmission, image_url, seats)")
      .eq("user_id", userId).order("created_at", { ascending: false });
    setRentals(data || []);
    // Load which rentals have already been reviewed
    if (data && data.length > 0) {
      const ids = data.map((r: any) => r.id);
      const { data: revs } = await supabase.from("reviews").select("rental_id").in("rental_id", ids).eq("user_id", userId);
      setReviewed(new Set((revs || []).map((rv: any) => rv.rental_id)));
    }
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

  const formatDate = (d: string) => new Date(d).toLocaleDateString(lang === "fr" ? "fr-CM" : "en-CM", { day: "2-digit", month: "short", year: "numeric" });

  const activeCount = rentals.filter(r => r.status === "active").length;
  const pendingCount = rentals.filter(r => r.status === "pending").length;

  return (
    <div className="page animate-in">
      {/* Page header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 className="section-title">My Rentals</h1>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>Track all your vehicle rentals and their current status</p>
          </div>
          <button onClick={() => router.push("/rent")} style={{ padding: "10px 22px", fontSize: "0.88rem" }}>
            + New Rental
          </button>
        </div>

        {/* Summary chips */}
        {!loading && rentals.length > 0 && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}>
            {[
              { label: `${rentals.length} Total`, color: "var(--white-muted)", bg: "var(--navy-mid)" },
              ...(activeCount > 0 ? [{ label: `${activeCount} Active`, color: "#34d399", bg: "rgba(52,211,153,0.1)" }] : []),
              ...(pendingCount > 0 ? [{ label: `${pendingCount} Pending Approval`, color: "#fbbf24", bg: "rgba(251,191,36,0.1)" }] : []),
            ].map(chip => (
              <span key={chip.label} style={{ padding: "5px 14px", borderRadius: "100px", background: chip.bg, color: chip.color, fontSize: "0.8rem", fontWeight: 700, border: `1px solid ${chip.color}33` }}>
                {chip.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: "160px", borderRadius: "16px" }} />)}
        </div>
      ) : rentals.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🚗</div>
          <h3>No rentals yet</h3>
          <p style={{ marginBottom: "24px" }}>You haven&apos;t rented any vehicles. Browse our fleet and book your first ride!</p>
          <button onClick={() => router.push("/rent")}>Browse Vehicles</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {rentals.map((r) => {
            const v = r.vehicles;
            const start = new Date(r.start_date);
            const end = new Date(r.end_date);
            const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
            const now = new Date();
            const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / 86400000);
            const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);

            return (
              <div key={r.id} className="card animate-in" style={{ padding: 0, overflow: "hidden" }}>
                <div className="rental-card-inner">
                  {/* Vehicle image column */}
                  <div className="rental-img-col">
                    {v?.image_url ? (
                      <img src={v.image_url} alt={v ? `${v.make} ${v.model}` : "Vehicle"} style={{ width: "100%", height: "100%", minHeight: "160px", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", minHeight: "160px", background: "linear-gradient(135deg, var(--navy-light), var(--navy))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", opacity: 0.6 }}>🚗</div>
                    )}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, var(--navy-mid) 100%)" }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* Top row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <h3 style={{ marginBottom: "3px", fontSize: "1.05rem" }}>{v ? `${v.make} ${v.model}` : "Vehicle"}</h3>
                        {v && (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "5px" }}>
                            {[v.year, v.transmission, v.fuel_type, v.color].filter(Boolean).map(spec => (
                              <span key={spec} className="spec-pill">{spec}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span style={{ padding: "5px 14px", borderRadius: "100px", fontSize: "0.73rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: `${STATUS_COLORS[r.status]}22`, color: STATUS_COLORS[r.status], border: `1px solid ${STATUS_COLORS[r.status]}44`, flexShrink: 0 }}>
                        {r.status}
                      </span>
                    </div>

                    {/* Status timeline */}
                    <StatusTimeline status={r.status} />

                    {/* Details grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
                      {[
                        { label: "Start", value: formatDate(r.start_date), icon: "📅" },
                        { label: "End", value: formatDate(r.end_date), icon: "🏁" },
                        { label: "Duration", value: `${days} day${days !== 1 ? "s" : ""}`, icon: "⏱️" },
                        { label: "Total", value: formatFCFA(r.total_price), icon: "💰" },
                      ].map((item) => (
                        <div key={item.label} style={{ background: "var(--navy)", borderRadius: "8px", padding: "10px 14px" }}>
                          <p style={{ color: "var(--white-muted)", fontSize: "0.72rem", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.icon} {item.label}</p>
                          <p style={{ fontWeight: 700, margin: 0, fontSize: "0.88rem", color: "var(--white)" }}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Contextual message */}
                    {r.status === "pending" && daysUntilStart > 0 && (
                      <p style={{ fontSize: "0.8rem", color: "#fbbf24", margin: 0 }}>⏳ Awaiting admin approval · Trip starts in {daysUntilStart} day{daysUntilStart !== 1 ? "s" : ""}</p>
                    )}
                    {r.status === "active" && daysLeft > 0 && (
                      <p style={{ fontSize: "0.8rem", color: "#34d399", margin: 0 }}>🟢 Rental active · {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</p>
                    )}
                    {r.status === "completed" && (
                      <p style={{ fontSize: "0.8rem", color: "var(--white-muted)", margin: 0 }}>✅ Rental completed successfully. Thank you for using DriveEasy!</p>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {(r.status === "pending" || r.status === "active") && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={cancelling === r.id}
                          style={{ background: "transparent", border: "1.5px solid var(--red)", color: "var(--red)", padding: "8px 20px", fontSize: "0.84rem", borderRadius: "8px" }}>
                          {cancelling === r.id ? "Cancelling..." : "Cancel Rental"}
                        </button>
                      )}
                      {r.status === "completed" && !reviewed.has(r.id) && (
                        <button
                          onClick={() => setRatingTarget({ rentalId: r.id, vehicleId: r.vehicle_id, vehicleName: r.vehicles ? `${r.vehicles.make} ${r.vehicles.model}` : "Vehicle" })}
                          style={{ background: "rgba(251,191,36,0.12)", border: "1.5px solid rgba(251,191,36,0.4)", color: "#fbbf24", padding: "8px 18px", fontSize: "0.84rem", borderRadius: "8px", fontWeight: 700 }}>
                          ⭐ Rate this Rental
                        </button>
                      )}
                      {r.status === "completed" && reviewed.has(r.id) && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 14px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "8px", color: "#34d399", fontSize: "0.8rem", fontWeight: 700 }}>✓ Reviewed</span>
                      )}
                      {(r.status === "completed" || r.status === "active") && (
                        <button
                          onClick={() => router.push(`/rentals/${r.id}/receipt`)}
                          style={{ background: "transparent", border: "1.5px solid var(--navy-border)", color: "var(--white-muted)", padding: "8px 18px", fontSize: "0.84rem", borderRadius: "8px" }}>
                          🧾 Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ratingTarget && (
        <RatingModal
          rentalId={ratingTarget.rentalId}
          vehicleId={ratingTarget.vehicleId}
          vehicleName={ratingTarget.vehicleName}
          onClose={() => setRatingTarget(null)}
          onSuccess={() => {
            setReviewed(prev => new Set([...prev, ratingTarget.rentalId]));
            setRatingTarget(null);
          }}
        />
      )}
    </div>
  );
}