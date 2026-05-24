"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { calculateRentalPrice, calculateSalePrice, type RentalPriceResult } from "@/lib/pricing";
import PaymentModal from "@/components/ui/PaymentModal";
import ReauthModal from "@/components/ui/ReauthModal";
import VerificationGate from "@/components/ui/VerificationGate";
import FavouriteButton from "@/components/ui/FavouriteButton";

type ActionMode = "rent" | "buy" | null;

// ─── KYC helper ─────────────────────────────────────────────────────────────
async function checkKYC(userId: string): Promise<string[]> {
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, phone, id_number, id_document_url")
    .eq("id", userId)
    .single();
  const missing: string[] = [];
  if (!prof?.full_name?.trim()) missing.push("Full name (Profile → Edit Profile)");
  if (!prof?.phone?.trim()) missing.push("Phone number (Profile → Edit Profile)");
  if (!prof?.id_number?.trim()) missing.push("ID number (Profile → Verification)");
  if (!prof?.id_document_url) missing.push("ID document photo (Profile → Verification)");
  return missing;
}

// ─── Spec Row ────────────────────────────────────────────────────────────────
function SpecRow({ icon, label, value }: { icon: string; label: string; value: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "13px 16px", borderRadius: "10px",
      background: "var(--navy)", border: "1px solid var(--navy-border)",
    }}>
      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--white-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--white)", marginTop: "1px" }}>{value}</div>
      </div>
    </div>
  );
}

// ─── Rental Panel ────────────────────────────────────────────────────────────
function RentalPanel({
  vehicle,
  onCheckout,
}: {
  vehicle: any;
  onCheckout: (startDate: string, endDate: string, total: number) => void;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pricing, setPricing] = useState<RentalPriceResult | null>(null);

  useEffect(() => {
    if (startDate && endDate && vehicle.daily_rate) {
      const result = calculateRentalPrice(vehicle.daily_rate, startDate, endDate);
      setPricing(result.days > 0 ? result : null);
    } else {
      setPricing(null);
    }
  }, [startDate, endDate, vehicle.daily_rate]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{
      background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
      borderRadius: "16px", padding: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          background: "rgba(52,211,153,0.12)", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
        }}>🔑</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1rem" }}>Rent This Vehicle</div>
          <div style={{ color: "var(--white-muted)", fontSize: "0.78rem" }}>
            From {formatFCFA(vehicle.daily_rate)}/day · Dynamic pricing applies
          </div>
        </div>
      </div>

      {/* Date pickers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        <div>
          <label style={{
            display: "block", fontSize: "0.7rem", fontWeight: 700,
            color: "var(--white-muted)", textTransform: "uppercase",
            letterSpacing: "0.07em", marginBottom: "6px",
          }}>
            Pickup Date
          </label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={e => {
              setStartDate(e.target.value);
              if (endDate && e.target.value > endDate) setEndDate("");
            }}
            style={{ padding: "10px 12px", fontSize: "0.87rem" }}
          />
        </div>
        <div>
          <label style={{
            display: "block", fontSize: "0.7rem", fontWeight: 700,
            color: "var(--white-muted)", textTransform: "uppercase",
            letterSpacing: "0.07em", marginBottom: "6px",
          }}>
            Return Date
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={e => setEndDate(e.target.value)}
            style={{ padding: "10px 12px", fontSize: "0.87rem" }}
          />
        </div>
      </div>

      {/* Smart Pricing Display */}
      {pricing && pricing.days > 0 && (
        <div style={{
          background: "var(--navy)", borderRadius: "12px", padding: "16px", marginBottom: "16px",
          border: "1px solid var(--navy-border)", display: "flex", flexDirection: "column", gap: "12px",
        }}>
          {/* Smart Rate header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--white-muted)" }}>
              {formatFCFA(vehicle.daily_rate)} × {pricing.days} day{pricing.days > 1 ? "s" : ""}
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)",
              color: "var(--red)", padding: "3px 10px", borderRadius: "100px",
              fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              <span style={{
                width: "5px", height: "5px", borderRadius: "50%", background: "var(--red)",
                display: "inline-block", animation: "pulse-red 1.5s infinite",
              }} />
              Smart Rate
            </span>
          </div>
          {/* Final price + savings */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              {pricing.savings > 0 && (
                <span style={{
                  fontSize: "0.78rem", color: "var(--white-muted)", textDecoration: "line-through",
                  display: "block", marginBottom: "2px",
                }}>
                  {formatFCFA(pricing.originalTotal)}
                </span>
              )}
              <span style={{ fontSize: "0.7rem", color: "var(--white-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
                Total · {pricing.days} day{pricing.days > 1 ? "s" : ""}
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--red)", lineHeight: 1.1, marginTop: "3px" }}>
                {formatFCFA(pricing.total)}
              </div>
            </div>
            {pricing.savings > 0 && (
              <span style={{
                background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)",
                color: "#34d399", padding: "5px 12px", borderRadius: "100px",
                fontSize: "0.75rem", fontWeight: 800,
              }}>
                🎉 Save {formatFCFA(pricing.savings)}
              </span>
            )}
          </div>
        </div>
      )}

      {!pricing && (startDate || endDate) && (
        <div style={{
          background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: "10px", padding: "12px 14px", marginBottom: "16px",
          fontSize: "0.83rem", color: "#fbbf24",
        }}>
          ⚠️ Please select both pickup and return dates.
        </div>
      )}

      <button
        onClick={() => pricing && onCheckout(startDate, endDate, pricing.total)}
        disabled={!pricing || pricing.days <= 0}
        style={{
          width: "100%", padding: "14px", fontWeight: 800, fontSize: "1rem",
          background: pricing && pricing.days > 0 ? "var(--red)" : undefined,
        }}
      >
        {pricing && pricing.days > 0
          ? `🔑 Reserve for ${formatFCFA(pricing.total)}`
          : "Select Dates to Book"}
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--white-muted)", textAlign: "center", marginTop: "10px", margin: "10px 0 0" }}>
        🛡️ KYC verified · 💳 MoMo / Orange Money / Card
      </p>
    </div>
  );
}

// ─── Buy Panel ───────────────────────────────────────────────────────────────
function BuyPanel({ vehicle, onBuy }: { vehicle: any; onBuy: (adjustedPrice: number) => void }) {
  const pricing = calculateSalePrice(vehicle.sale_price, vehicle.mileage, vehicle.year);
  const hasPriceChange = pricing.adjustedPrice !== pricing.basePrice;
  const isDiscount = pricing.adjustedPrice < pricing.basePrice;

  return (
    <div style={{
      background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
      borderRadius: "16px", padding: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          background: "rgba(96,165,250,0.12)", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
        }}>🏷️</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1rem" }}>Buy This Vehicle</div>
          <div style={{ color: "var(--white-muted)", fontSize: "0.78rem" }}>
            One-time purchase · Full ownership transfer
          </div>
        </div>
      </div>

      {/* Smart Valuation Display */}
      <div style={{
        background: "var(--navy)", borderRadius: "12px", padding: "16px", marginBottom: "16px",
        border: "1px solid var(--navy-border)", display: "flex", flexDirection: "column", gap: "12px",
      }}>
        {/* Smart badge header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--white-muted)", fontWeight: 600 }}>Listed</span>
            <span style={{
              fontSize: "0.9rem", fontWeight: 700, color: "var(--white-muted)",
              textDecoration: hasPriceChange ? "line-through" : "none",
            }}>
              {formatFCFA(pricing.basePrice)}
            </span>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)",
            color: "#60a5fa", padding: "3px 10px", borderRadius: "100px",
            fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <span style={{
              width: "5px", height: "5px", borderRadius: "50%", background: "#60a5fa",
              display: "inline-block", animation: "pulse-red 1.5s infinite",
            }} />
            Smart Valuation
          </span>
        </div>
        {/* Final price */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: "0.7rem", color: "var(--white-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
              Your Price
            </span>
            <div style={{
              fontSize: "1.7rem", fontWeight: 900, lineHeight: 1.1, marginTop: "3px",
              color: isDiscount ? "#34d399" : hasPriceChange ? "#60a5fa" : "var(--red)",
            }}>
              {formatFCFA(pricing.adjustedPrice)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            {isDiscount && pricing.savings > 0 && (
              <span style={{
                background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)",
                color: "#34d399", padding: "5px 12px", borderRadius: "100px",
                fontSize: "0.75rem", fontWeight: 800,
              }}>
                🎉 Save {formatFCFA(pricing.savings)}
              </span>
            )}
            {pricing.demandBadge && (
              <span style={{
                background: pricing.demandBadge === "Great Value" ? "rgba(52,211,153,0.1)"
                  : pricing.demandBadge === "High Demand" ? "rgba(251,191,36,0.1)"
                  : "rgba(96,165,250,0.1)",
                border: `1px solid ${pricing.demandBadge === "Great Value" ? "rgba(52,211,153,0.25)" : pricing.demandBadge === "High Demand" ? "rgba(251,191,36,0.25)" : "rgba(96,165,250,0.25)"}`,
                color: pricing.demandBadge === "Great Value" ? "#34d399"
                  : pricing.demandBadge === "High Demand" ? "#fbbf24"
                  : "#60a5fa",
                padding: "4px 10px", borderRadius: "100px", fontSize: "0.73rem", fontWeight: 700,
              }}>
                {pricing.demandBadge === "Great Value" ? "💰" : pricing.demandBadge === "High Demand" ? "🔥" : "✨"} {pricing.demandBadge}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => onBuy(pricing.adjustedPrice)}
        style={{ width: "100%", padding: "14px", fontWeight: 800, fontSize: "1rem" }}
      >
        🛡️ Buy Now — {formatFCFA(pricing.adjustedPrice)}
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--white-muted)", textAlign: "center", marginTop: "10px", margin: "10px 0 0" }}>
        🛡️ KYC verified · 💳 MoMo / Orange Money / Card
      </p>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export default function VehicleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeMode, setActiveMode] = useState<ActionMode>(null);

  // Payment flow state
  const [pendingRentPayData, setPendingRentPayData] = useState<any>(null);
  const [rentPayData, setRentPayData] = useState<any>(null);
  const [pendingBuyPayData, setPendingBuyPayData] = useState<any>(null);
  const [buyPayData, setBuyPayData] = useState<any>(null);
  const [verGate, setVerGate] = useState<{ missing: string[] } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      loadVehicle();
      loadReviews();
    });
  }, [vehicleId, router]);

  const loadVehicle = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("vehicles").select("*").eq("id", vehicleId).single();
    if (error || !data) { router.push("/vehicles"); return; }
    setVehicle(data);
    // Auto-set active mode for single-type vehicles
    setActiveMode("buy");
    setLoading(false);
  };

  const loadReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*, profiles(full_name)")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(5);
    setReviews(data || []);
  };

  // ── Rental checkout ──────────────────────────────────────────────────────
  const handleRentCheckout = async (startDate: string, endDate: string, total: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const missing = await checkKYC(session.user.id);
    if (missing.length > 0) { setVerGate({ missing }); return; }

    // Conflict check
    const { data: conflict } = await supabase.from("rentals").select("id")
      .eq("vehicle_id", vehicleId).in("status", ["pending", "active"])
      .lte("start_date", endDate).gte("end_date", startDate);
    if (conflict && conflict.length > 0) {
      alert("This vehicle is not available for the selected dates. Please choose different dates.");
      return;
    }

    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
    setPendingRentPayData({
      vehicleId,
      vehicleName: `${vehicle.make} ${vehicle.model}`,
      userId: session.user.id,
      userEmail: session.user.email || "",
      userName: prof?.full_name || session.user.email || "Customer",
      startDate, endDate, total,
    });
  };

  const handleRentPaymentSuccess = async () => {
    if (!rentPayData) return;
    await supabase.from("rentals").insert({
      vehicle_id: rentPayData.vehicleId, user_id: rentPayData.userId,
      start_date: rentPayData.startDate, end_date: rentPayData.endDate,
      total_price: rentPayData.total, status: "pending",
    });
    await supabase.from("vehicles").update({ status: "rented" }).eq("id", rentPayData.vehicleId);
    setRentPayData(null);
    router.push("/rentals");
  };

  // ── Buy checkout ─────────────────────────────────────────────────────────
  const handleBuyClick = async (adjustedPrice: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const missing = await checkKYC(session.user.id);
    if (missing.length > 0) { setVerGate({ missing }); return; }

    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
    setPendingBuyPayData({
      vehicle,
      adjustedPrice,
      userId: session.user.id,
      userEmail: session.user.email || "",
      userName: prof?.full_name || session.user.email || "Customer",
    });
  };

  const handleBuyPaymentSuccess = async () => {
    if (!buyPayData) return;
    await supabase.from("sales").insert({
      vehicle_id: buyPayData.vehicle.id,
      user_id: buyPayData.userId,
      sale_price: buyPayData.adjustedPrice,
    });
    await supabase.from("vehicles").update({ status: "sold" }).eq("id", buyPayData.vehicle.id);
    setBuyPayData(null);
    router.push("/sales/history");
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div style={{ marginBottom: "24px" }}>
          <div className="shimmer" style={{ height: "16px", width: "180px", borderRadius: "8px", marginBottom: "24px" }} />
          <div className="shimmer" style={{ height: "420px", borderRadius: "20px", marginBottom: "32px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="shimmer" style={{ height: "36px", width: "60%", borderRadius: "8px" }} />
              <div className="shimmer" style={{ height: "18px", width: "40%", borderRadius: "6px" }} />
              <div className="shimmer" style={{ height: "180px", borderRadius: "14px" }} />
            </div>
            <div className="shimmer" style={{ height: "360px", borderRadius: "16px" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) return null;

  const canRent = false;
  const canBuy = true;
  const isBoth = false;

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        <Link href="/vehicles" style={{ color: "var(--white-muted)", fontSize: "0.85rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
          ← All Vehicles
        </Link>
        <span style={{ color: "var(--navy-border)" }}>›</span>
        <span style={{ color: "var(--white-soft)", fontSize: "0.85rem", fontWeight: 600 }}>
          {vehicle.make} {vehicle.model}
        </span>
      </div>

      {/* Hero Image */}
      <div style={{
        position: "relative", borderRadius: "20px", overflow: "hidden",
        height: "420px", marginBottom: "36px", background: "var(--navy-mid)",
      }}>
        {vehicle.image_url ? (
          <img
            src={vehicle.image_url}
            alt={`${vehicle.make} ${vehicle.model}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            height: "100%", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "6rem", opacity: 0.25,
          }}>🚗</div>
        )}
        {/* Gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(13,27,42,0.95) 0%, rgba(13,27,42,0.3) 50%, transparent 100%)",
        }} />
        {/* Bottom info overlay */}
        <div style={{ position: "absolute", bottom: 24, left: 28, right: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                {canRent && canBuy ? (
                  <span style={{
                    background: "linear-gradient(135deg, rgba(230,57,70,0.8), rgba(96,165,250,0.8))",
                    backdropFilter: "blur(8px)", color: "#fff",
                    padding: "5px 14px", borderRadius: "100px",
                    fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.05em",
                  }}>⭐ Rent & Buy Available</span>
                ) : canRent ? (
                  <span style={{
                    background: "rgba(52,211,153,0.8)", backdropFilter: "blur(8px)", color: "#fff",
                    padding: "5px 14px", borderRadius: "100px",
                    fontSize: "0.75rem", fontWeight: 800,
                  }}>🔑 For Rent</span>
                ) : (
                  <span style={{
                    background: "rgba(96,165,250,0.8)", backdropFilter: "blur(8px)", color: "#fff",
                    padding: "5px 14px", borderRadius: "100px",
                    fontSize: "0.75rem", fontWeight: 800,
                  }}>🏷️ For Sale</span>
                )}
                <span style={{
                  background: "rgba(16,185,129,0.7)", backdropFilter: "blur(8px)", color: "#fff",
                  padding: "5px 14px", borderRadius: "100px",
                  fontSize: "0.75rem", fontWeight: 800,
                }}>✅ Available</span>
                {avgRating && (
                  <span style={{
                    background: "rgba(251,191,36,0.7)", backdropFilter: "blur(8px)", color: "#fff",
                    padding: "5px 14px", borderRadius: "100px",
                    fontSize: "0.75rem", fontWeight: 800,
                  }}>⭐ {avgRating} ({reviews.length} reviews)</span>
                )}
              </div>
              <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
                {vehicle.make} {vehicle.model}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "1rem", margin: 0 }}>
                {vehicle.year} · {vehicle.transmission} · {vehicle.fuel_type}
                {vehicle.location && ` · 📍 ${vehicle.location}`}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <FavouriteButton vehicleId={vehicle.id} size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout — Info + Checkout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "36px", alignItems: "start" }}>

        {/* LEFT — Vehicle Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* Quick Specs Grid */}
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--red)" }}>▌</span> Specifications
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
              <SpecRow icon="📅" label="Year" value={vehicle.year} />
              <SpecRow icon="⚡" label="Fuel Type" value={vehicle.fuel_type} />
              <SpecRow icon="⚙️" label="Transmission" value={vehicle.transmission} />
              <SpecRow icon="🎨" label="Colour" value={vehicle.color} />
              <SpecRow icon="💺" label="Seats" value={vehicle.seats ? `${vehicle.seats} seats` : null} />
              <SpecRow icon="📍" label="Mileage" value={vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : null} />
              <SpecRow icon="📌" label="Location" value={vehicle.location} />
              <SpecRow icon="🚗" label="Listing Type" value="For Sale" />
            </div>
          </div>

          {/* Pricing Summary */}
          <div style={{
            background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
            borderRadius: "16px", padding: "22px",
          }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--red)" }}>▌</span> Pricing
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
              {canRent && vehicle.daily_rate && (
                <div style={{
                  flex: 1, minWidth: "160px",
                  background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)",
                  borderRadius: "12px", padding: "16px",
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#34d399", marginBottom: "6px" }}>
                    🔑 Daily Rental Rate
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#34d399" }}>
                    {formatFCFA(vehicle.daily_rate)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--white-muted)", marginTop: "4px" }}>
                    per day (base rate)
                  </div>
                </div>
              )}
              {canBuy && vehicle.sale_price && (
                <div style={{
                  flex: 1, minWidth: "160px",
                  background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)",
                  borderRadius: "12px", padding: "16px",
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#60a5fa", marginBottom: "6px" }}>
                    🏷️ Sale Price
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#60a5fa" }}>
                    {formatFCFA(vehicle.sale_price)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--white-muted)", marginTop: "4px" }}>
                    listed price (adjusted dynamically)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {vehicle.description && (
            <div style={{
              background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
              borderRadius: "16px", padding: "22px",
            }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--red)" }}>▌</span> About This Vehicle
              </h2>
              <p style={{ color: "var(--white-muted)", lineHeight: 1.8, margin: 0 }}>
                {vehicle.description}
              </p>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--red)" }}>▌</span>
                Customer Reviews
                <span style={{
                  background: "rgba(251,191,36,0.12)", color: "#fbbf24",
                  padding: "2px 10px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 800,
                }}>
                  ⭐ {avgRating}
                </span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {reviews.map(r => (
                  <div key={r.id} style={{
                    background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
                    borderRadius: "12px", padding: "16px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                        {r.profiles?.full_name || "Anonymous"}
                      </span>
                      <span style={{ color: "#fbbf24", fontSize: "0.85rem" }}>
                        {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                      </span>
                    </div>
                    {r.comment && (
                      <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0, lineHeight: 1.6 }}>
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trust badges */}
          <div style={{
            background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
            borderRadius: "16px", padding: "20px",
          }}>
            <div className="trust-strip">
              {[
                { icon: "🛡️", label: "KYC Verified", sub: "Identity protection" },
                { icon: "💳", label: "MoMo / Orange", sub: "Local payments" },
                { icon: "🔒", label: "Encrypted Data", sub: "Supabase secure" },
                { icon: "📧", label: "Email Receipts", sub: "Instant confirmation" },
              ].map(b => (
                <div key={b.label} className="trust-badge">
                  <span className="trust-badge-icon">{b.icon}</span>
                  <div>
                    <div style={{ fontSize: "0.83rem", fontWeight: 700 }}>{b.label}</div>
                    <div style={{ fontSize: "0.73rem", color: "var(--white-muted)" }}>{b.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Checkout Panel(s) */}
        <div style={{ position: "sticky", top: "90px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Mode Toggle (only for "both" vehicles) */}
          {isBoth && (
            <div style={{
              display: "flex", background: "var(--navy-mid)",
              border: "1px solid var(--navy-border)", borderRadius: "12px",
              padding: "5px", gap: "4px",
            }}>
              <button
                onClick={() => setActiveMode("rent")}
                style={{
                  flex: 1, padding: "10px", borderRadius: "9px",
                  background: activeMode === "rent" ? "rgba(52,211,153,0.15)" : "transparent",
                  border: activeMode === "rent" ? "1px solid rgba(52,211,153,0.35)" : "1px solid transparent",
                  color: activeMode === "rent" ? "#34d399" : "var(--white-muted)",
                  fontWeight: 800, fontSize: "0.88rem", cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                🔑 Rent
              </button>
              <button
                onClick={() => setActiveMode("buy")}
                style={{
                  flex: 1, padding: "10px", borderRadius: "9px",
                  background: activeMode === "buy" ? "rgba(96,165,250,0.15)" : "transparent",
                  border: activeMode === "buy" ? "1px solid rgba(96,165,250,0.35)" : "1px solid transparent",
                  color: activeMode === "buy" ? "#60a5fa" : "var(--white-muted)",
                  fontWeight: 800, fontSize: "0.88rem", cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                🏷️ Buy
              </button>
            </div>
          )}

          {/* Active panel */}
          {activeMode === "rent" && canRent && (
            <RentalPanel vehicle={vehicle} onCheckout={handleRentCheckout} />
          )}
          {activeMode === "buy" && canBuy && (
            <BuyPanel vehicle={vehicle} onBuy={handleBuyClick} />
          )}

          {/* Quick contact */}
          <div style={{
            background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
            borderRadius: "14px", padding: "18px",
            display: "flex", gap: "12px", alignItems: "center",
          }}>
            <span style={{ fontSize: "1.4rem" }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>Need help?</div>
              <div style={{ fontSize: "0.77rem", color: "var(--white-muted)" }}>
                Chat with us on WhatsApp or email
              </div>
            </div>
            <Link href="/contact" style={{
              background: "var(--navy)", border: "1px solid var(--navy-border)",
              color: "var(--white-soft)", padding: "7px 14px", borderRadius: "8px",
              fontSize: "0.8rem", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            }}>
              Contact
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      {pendingRentPayData && (
        <ReauthModal
          userEmail={pendingRentPayData.userEmail}
          onSuccess={() => { setRentPayData(pendingRentPayData); setPendingRentPayData(null); }}
          onClose={() => setPendingRentPayData(null)}
        />
      )}
      {rentPayData && (
        <PaymentModal
          amount={rentPayData.total}
          description={`Rental: ${rentPayData.vehicleName}`}
          onClose={() => setRentPayData(null)}
          onSuccess={handleRentPaymentSuccess}
        />
      )}

      {pendingBuyPayData && (
        <ReauthModal
          userEmail={pendingBuyPayData.userEmail}
          onSuccess={() => { setBuyPayData(pendingBuyPayData); setPendingBuyPayData(null); }}
          onClose={() => setPendingBuyPayData(null)}
        />
      )}
      {buyPayData && (
        <PaymentModal
          amount={buyPayData.adjustedPrice}
          description={`${buyPayData.vehicle.make} ${buyPayData.vehicle.model} (${buyPayData.vehicle.year}) — Purchase`}
          onClose={() => setBuyPayData(null)}
          onSuccess={handleBuyPaymentSuccess}
        />
      )}

      {verGate && (
        <VerificationGate
          missing={verGate.missing}
          context={activeMode === "buy" ? "purchase" : "rental"}
          onClose={() => setVerGate(null)}
        />
      )}
    </div>
  );
}
