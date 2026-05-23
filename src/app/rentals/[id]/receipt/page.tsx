"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";

function ReceiptInner() {
  const params = useParams();
  const router = useRouter();
  const rentalId = params.id as string;
  const [rental, setRental] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("rentals").select("*, vehicles(make, model, year, color, fuel_type, transmission, daily_rate, location)").eq("id", rentalId).eq("user_id", session.user.id).single(),
        supabase.from("profiles").select("full_name, phone").eq("id", session.user.id).single(),
      ]);

      if (!r) { router.push("/rentals"); return; }
      setRental(r);
      setProfile(p);
      setLoading(false);
    };
    load();
  }, [rentalId, router]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const days = rental ? Math.max(1, Math.ceil((new Date(rental.end_date).getTime() - new Date(rental.start_date).getTime()) / 86400000)) : 0;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" style={{ width: "36px", height: "36px" }} />
    </div>
  );

  const refNo = `DE-${rentalId.slice(0, 8).toUpperCase()}`;

  return (
    <>
      {/* Print button (hidden on print) */}
      <div className="no-print" style={{ background: "var(--navy)", padding: "16px 24px", display: "flex", gap: "12px", alignItems: "center", borderBottom: "1px solid var(--navy-border)" }}>
        <button onClick={() => router.back()} style={{ background: "transparent", border: "1px solid var(--navy-border)", color: "var(--white-muted)", padding: "8px 16px", fontSize: "0.85rem" }}>← Back</button>
        <button onClick={() => window.print()} style={{ padding: "8px 20px", fontSize: "0.85rem", fontWeight: 700 }}>🖨️ Print / Save as PDF</button>
        <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>Tip: In the print dialog, choose &quot;Save as PDF&quot; to download</p>
      </div>

      {/* Receipt */}
      <div id="receipt" style={{ maxWidth: "680px", margin: "32px auto", padding: "0 20px 60px" }}>
        <div style={{ background: "#fff", color: "#111", borderRadius: "16px", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}>

          {/* Header */}
          <div style={{ background: "#0d1b2a", padding: "36px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", marginBottom: "6px", letterSpacing: "-0.02em" }}>
              <span style={{ color: "#e63946" }}>Drive</span>Easy
            </div>
            <p style={{ color: "#9aabbd", margin: "0 0 16px", fontSize: "0.85rem" }}>Car Rental & Sales · Buea, Cameroon</p>
            <div style={{ background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: "10px", padding: "10px 20px", display: "inline-block" }}>
              <p style={{ color: "#e63946", fontWeight: 800, margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em" }}>RENTAL RECEIPT</p>
            </div>
          </div>

          <div style={{ padding: "36px 40px" }}>
            {/* Ref & Date */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <p style={{ color: "#888", fontSize: "0.72rem", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reference</p>
                <p style={{ fontWeight: 900, fontSize: "1.1rem", margin: 0, color: "#e63946" }}>{refNo}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#888", fontSize: "0.72rem", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Issued</p>
                <p style={{ fontWeight: 700, margin: 0, fontSize: "0.9rem" }}>{formatDate(rental.created_at)}</p>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e5e5e5", margin: "0 0 24px" }} />

            {/* Customer Info */}
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "0 0 10px" }}>Customer Details</p>
              <div style={{ background: "#f8f8f8", borderRadius: "10px", padding: "16px 20px" }}>
                <p style={{ fontWeight: 700, margin: "0 0 4px" }}>{profile?.full_name || "DriveEasy Customer"}</p>
                {profile?.phone && <p style={{ color: "#555", margin: "0 0 2px", fontSize: "0.88rem" }}>📞 {profile.phone}</p>}
              </div>
            </div>

            {/* Vehicle Info */}
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "0 0 10px" }}>Vehicle Details</p>
              <div style={{ background: "#f8f8f8", borderRadius: "10px", padding: "16px 20px" }}>
                <p style={{ fontWeight: 800, fontSize: "1.05rem", margin: "0 0 6px" }}>
                  {rental.vehicles ? `${rental.vehicles.make} ${rental.vehicles.model}` : "Vehicle"}
                </p>
                {rental.vehicles && (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {[rental.vehicles.year, rental.vehicles.color, rental.vehicles.fuel_type, rental.vehicles.transmission].filter(Boolean).map((s: string) => (
                      <span key={s} style={{ background: "#e8e8e8", color: "#444", padding: "3px 10px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600 }}>{s}</span>
                    ))}
                  </div>
                )}
                {rental.vehicles?.location && <p style={{ color: "#666", fontSize: "0.83rem", margin: "8px 0 0" }}>📍 {rental.vehicles.location}</p>}
              </div>
            </div>

            {/* Rental Period */}
            <div style={{ marginBottom: "28px" }}>
              <p style={{ fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "0 0 10px" }}>Rental Period</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { label: "Start Date", value: formatDate(rental.start_date) },
                  { label: "End Date", value: formatDate(rental.end_date) },
                  { label: "Duration", value: `${days} day${days !== 1 ? "s" : ""}` },
                ].map(item => (
                  <div key={item.label} style={{ background: "#f8f8f8", borderRadius: "8px", padding: "12px 14px" }}>
                    <p style={{ color: "#888", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 3px" }}>{item.label}</p>
                    <p style={{ fontWeight: 700, margin: 0, fontSize: "0.88rem" }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div style={{ background: "#0d1b2a", borderRadius: "12px", padding: "20px 24px", color: "#fff", marginBottom: "24px" }}>
              <p style={{ fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9aabbd", margin: "0 0 14px" }}>Payment Summary</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#9aabbd", fontSize: "0.88rem" }}>Daily rate</span>
                <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{rental.vehicles?.daily_rate ? formatFCFA(rental.vehicles.daily_rate) : "—"}/day</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#9aabbd", fontSize: "0.88rem" }}>Duration</span>
                <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{days} day{days !== 1 ? "s" : ""}</span>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid #1e3a5f", margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "1rem" }}>Total Paid</span>
                <span style={{ fontWeight: 900, fontSize: "1.4rem", color: "#e63946" }}>{formatFCFA(rental.total_price)}</span>
              </div>
              <p style={{ color: "#4a6580", fontSize: "0.72rem", margin: "8px 0 0", textAlign: "right" }}>
                Status: <span style={{ color: rental.status === "completed" ? "#34d399" : "#fbbf24", fontWeight: 700 }}>{rental.status.toUpperCase()}</span>
              </p>
            </div>

            {/* Footer note */}
            <div style={{ textAlign: "center", color: "#888", fontSize: "0.78rem", lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 4px" }}>Thank you for choosing DriveEasy!</p>
              <p style={{ margin: 0 }}>support@driveeasy.cm · Buea, South West, Cameroon</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.68rem" }}>Ref: {refNo} · This is an official payment receipt.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #receipt { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
        }
      `}</style>
    </>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" style={{ width: "36px", height: "36px" }} /></div>}>
      <ReceiptInner />
    </Suspense>
  );
}
