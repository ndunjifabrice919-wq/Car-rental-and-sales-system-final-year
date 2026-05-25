"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/context/LangContext";
import { formatFCFA } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";

/* ─── animated counter ─── */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (target === 0) return;
    const steps = 40;
    const inc = target / steps;
    let current = 0;
    ref.current = setInterval(() => {
      current = Math.min(current + inc, target);
      setValue(Math.round(current));
      if (current >= target && ref.current) clearInterval(ref.current);
    }, duration / steps);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [target, duration]);
  return value;
}

const TESTIMONIALS = [
  {
    name: "Fokou Emmanuel",
    city: "Buea, SW Region",
    role: "Business Owner",
    initials: "FE",
    color: "#E63946",
    rating: 5,
    quote: "I rented an SUV for a client visit in Douala and the booking took less than 3 minutes. The FCFA pricing is transparent — no surprises when I paid via MTN MoMo. I've used DriveEasy four times now.",
  },
  {
    name: "Nkengafac Blandine",
    city: "Yaoundé, Centre Region",
    role: "University Student",
    initials: "NB",
    color: "#2563eb",
    rating: 5,
    quote: "Finding a reliable car for hire in Yaoundé used to require calling ten different people. DriveEasy shows exactly what's available, at what price, and you confirm in one click. Game changer.",
  },
  {
    name: "Tabi Michael",
    city: "Douala, Littoral Region",
    role: "Logistics Manager",
    initials: "TM",
    color: "#059669",
    rating: 5,
    quote: "We sourced two pickup trucks for our company through DriveEasy. The admin dashboard for corporate accounts is exactly what we needed. Very professional platform for Cameroon.",
  },
];

const TRUST_ITEMS = [
  { icon: "🔒", title: "Secure Payments", desc: "Orange Money, MTN MoMo & Card" },
  { icon: "✅", title: "Verified Fleet", desc: "Every vehicle is quality-checked" },
  { icon: "💰", title: "FCFA Pricing", desc: "No hidden fees, ever" },
  { icon: "📞", title: "24/7 Support", desc: "Real humans, real answers" },
];

export default function HomePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [stats, setStats] = useState({ rentals: 0, purchases: 0, spent: 0 });
  const [recentRentals, setRecentRentals] = useState<any[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dashProfile, setDashProfile] = useState<any>(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const animVehicles = useCountUp(vehicleCount);

  useEffect(() => {
    // Fetch public vehicle count for landing page stats
    if (!user) {
      supabase.from("vehicles").select("id", { count: "exact", head: true }).then(({ count }) => {
        setVehicleCount(count || 0);
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user || authLoading) return;
    refreshProfile();
    setDataLoading(true);
    Promise.all([
      supabase.from("rentals").select("total_price, start_date, end_date, status, vehicle_id, id, vehicles(make,model,image_url)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("sales").select("sale_price").eq("user_id", user.id),
      supabase.from("vehicles").select("id, make, model, year, type, status, daily_rate, sale_price, fuel_type, transmission, image_url, seats, color, location").eq("status", "available").limit(6),
      supabase.from("profiles").select("full_name, phone, id_number, id_document_url, verification_status").eq("id", user.id).single(),
    ]).then(([{ data: rentals }, { data: purchases }, { data: vehicles }, { data: prof }]) => {
      const rentalTotal = (rentals || []).reduce((s: number, r: any) => s + (r.total_price || 0), 0);
      const saleTotal = (purchases || []).reduce((s: number, p: any) => s + (p.sale_price || 0), 0);
      setStats({ rentals: rentals?.length || 0, purchases: purchases?.length || 0, spent: rentalTotal + saleTotal });
      setRecentRentals(rentals || []);
      setFeaturedVehicles(vehicles || []);
      setDashProfile(prof || profile);
      setDataLoading(false);
    });
  }, [user, authLoading]);

  if (authLoading) return <div className="loading"><div className="spinner" /></div>;

  /* ─── LOGGED IN DASHBOARD ─── */
  if (user) {
    const currentProfile = dashProfile || profile;
    const displayName = currentProfile?.full_name?.trim() ? currentProfile.full_name.split(" ")[0] : null;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const isNewUser = !dataLoading && stats.rentals === 0 && stats.purchases === 0;

    // Profile completion
    const profileFields = [
      { label: "Full name", done: !!currentProfile?.full_name?.trim() },
      { label: "Phone number", done: !!currentProfile?.phone?.trim() },
      { label: "ID number", done: !!currentProfile?.id_number },
      { label: "ID document", done: !!currentProfile?.id_document_url },
    ];
    const completedFields = profileFields.filter(f => f.done).length;
    const completionPct = Math.round((completedFields / profileFields.length) * 100);

    // Loyalty tier
    const loyaltyTier = stats.rentals + stats.purchases >= 10 ? { label: "Platinum", color: "#60a5fa", icon: "💎" }
      : stats.rentals + stats.purchases >= 5 ? { label: "Gold", color: "#fbbf24", icon: "⭐" }
      : stats.rentals + stats.purchases >= 2 ? { label: "Silver", color: "#a1a1aa", icon: "🥈" }
      : { label: "Member", color: "var(--white-muted)", icon: "🚗" };

    // Upcoming rentals
    const today = new Date().toISOString().split("T")[0];
    const upcoming = recentRentals.filter((r: any) => r.start_date >= today && (r.status === "pending" || r.status === "active"));
    const activeRental = recentRentals.find((r: any) => r.status === "active");

    // Days until next trip
    const nextTrip = upcoming[0];
    const daysUntil = nextTrip ? Math.ceil((new Date(nextTrip.start_date).getTime() - Date.now()) / 86400000) : null;

    const verStatus = currentProfile?.verification_status || "unverified";
    const verComplete = verStatus === "verified" || verStatus === "pending";

    return (
      <div className="page animate-in">

        {/* ── Greeting header with loyalty ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", fontWeight: 900, marginBottom: "4px" }}>
              {greeting}{displayName ? `, ${displayName}` : ""}! 👋
            </h1>
            <p style={{ color: "var(--white-muted)", margin: 0, fontSize: "0.88rem" }}>
              {isNewUser ? "Welcome to DriveEasy" : "Welcome back to DriveEasy"} · Cameroon
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Loyalty badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--navy-mid)", border: `1px solid ${loyaltyTier.color}44`, borderRadius: "100px", padding: "6px 14px" }}>
              <span style={{ fontSize: "0.9rem" }}>{loyaltyTier.icon}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: loyaltyTier.color }}>{loyaltyTier.label}</span>
            </div>
            {/* Verify badge */}
            {verStatus === "verified" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "100px", padding: "6px 14px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#34d399" }}>✓ Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Active rental banner ── */}
        {!dataLoading && activeRental && (
          <div style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.1), rgba(13,27,42,0))", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "16px", padding: "20px 24px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {activeRental.vehicles?.image_url && (
              <img src={activeRental.vehicles.image_url} alt="" loading="lazy" decoding="async" style={{ width: "64px", height: "46px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, margin: "0 0 3px", color: "#34d399", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>🟢 Active Rental</p>
              <p style={{ fontWeight: 700, margin: "0 0 2px", fontSize: "1rem" }}>{activeRental.vehicles?.make} {activeRental.vehicles?.model}</p>
              <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: 0 }}>
                {new Date(activeRental.start_date).toLocaleDateString("fr-CM")} → {new Date(activeRental.end_date).toLocaleDateString("fr-CM")}
              </p>
            </div>
            <button onClick={() => router.push("/rentals")} style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", padding: "9px 18px", fontSize: "0.84rem", fontWeight: 600 }}>View Details →</button>
          </div>
        )}

        {/* ── Upcoming trip countdown ── */}
        {!dataLoading && nextTrip && daysUntil !== null && daysUntil >= 0 && (
          <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "14px", padding: "16px 20px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(251,191,36,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>📅</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "0.95rem" }}>
                {daysUntil === 0 ? "Your rental starts TODAY!" : `Trip in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
              </p>
              <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: 0 }}>
                {nextTrip.vehicles?.make} {nextTrip.vehicles?.model} · {new Date(nextTrip.start_date).toLocaleDateString("fr-CM")}
              </p>
            </div>
            <span className="badge badge-pending" style={{ flexShrink: 0 }}>{nextTrip.status}</span>
          </div>
        )}

        {/* ── KYC soft reminder (not a blocker) ── */}
        {!dataLoading && !verComplete && (stats.rentals > 0 || completedFields < 2) && (
          <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "14px", padding: "14px 20px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.3rem" }}>🛡️</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "0.9rem", color: "#fbbf24" }}>Complete Identity Verification</p>
              <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>Required for renting or buying a vehicle. Keeps your bookings secure.</p>
            </div>
            <button onClick={() => router.push("/profile?tab=verification")} style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", padding: "8px 16px", fontSize: "0.82rem", fontWeight: 600 }}>Verify Now →</button>
          </div>
        )}

        {/* ── Profile completion progress ── */}
        {!dataLoading && completionPct < 100 && (
          <div className="card" style={{ marginBottom: "28px", padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <p style={{ fontWeight: 700, margin: "0 0 2px", fontSize: "0.95rem" }}>Profile Completion</p>
                <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>Complete your profile to unlock all features</p>
              </div>
              <span style={{ fontWeight: 800, fontSize: "1.1rem", color: completionPct === 100 ? "#34d399" : completionPct >= 50 ? "#fbbf24" : "var(--red)" }}>{completionPct}%</span>
            </div>
            <div style={{ height: "6px", background: "var(--navy-border)", borderRadius: "100px", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ height: "100%", width: `${completionPct}%`, background: completionPct === 100 ? "#34d399" : completionPct >= 50 ? "#fbbf24" : "var(--red)", borderRadius: "100px", transition: "width 1s ease" }} />
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {profileFields.map(f => (
                <span key={f.label} style={{ display: "flex", alignItems: "center", gap: "5px", background: f.done ? "rgba(52,211,153,0.08)" : "var(--navy)", border: `1px solid ${f.done ? "rgba(52,211,153,0.2)" : "var(--navy-border)"}`, borderRadius: "100px", padding: "3px 10px", fontSize: "0.72rem", color: f.done ? "#34d399" : "var(--white-muted)" }}>
                  {f.done ? "✓" : "○"} {f.label}
                </span>
              ))}
            </div>
            {completionPct < 100 && (
              <button onClick={() => router.push("/profile?tab=" + (completedFields < 2 ? "profile" : "verification"))} style={{ marginTop: "14px", alignSelf: "flex-start", padding: "9px 20px", fontSize: "0.85rem" }}>
                Complete Profile →
              </button>
            )}
          </div>
        )}

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "14px", marginBottom: "28px" }}>
          {dataLoading ? (
            [1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: "90px", borderRadius: "12px" }} />)
          ) : [
            { label: "My Rentals", value: stats.rentals, icon: "🚗", href: "/rentals", color: "var(--white)" },
            { label: "My Purchases", value: stats.purchases, icon: "🏷️", href: "/sales/history", color: "#60a5fa" },
            { label: "Total Spent", value: formatFCFA(stats.spent), icon: "💰", href: "/profile", color: "var(--red)" },
          ].map(s => (
            <div key={s.label} onClick={() => router.push(s.href)} className="card animate-in"
              style={{ cursor: "pointer", textAlign: "center" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(230,57,70,0.4)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--navy-border)")}>
              <p style={{ fontSize: "1.3rem", margin: "0 0 4px" }}>{s.icon}</p>
              <p style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0 0 4px", color: s.color }}>{s.value}</p>
              <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ marginBottom: "32px" }}>
          <p className="section-label">Quick Actions</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
            {[
              { icon: "🚗", label: "Rent", href: "/rent", primary: true },
              { icon: "🏷️", label: "Buy", href: "/sales", primary: false },
              { icon: "📋", label: "My Rentals", href: "/rentals", primary: false },
              { icon: "🧾", label: "Purchases", href: "/sales/history", primary: false },
              { icon: "👤", label: "Profile", href: "/profile", primary: false },
              { icon: "🛡️", label: "Verify ID", href: "/profile?tab=verification", primary: false },
              ...(profile?.role === "admin" || profile?.role === "owner" ? [{ icon: "⚙️", label: "Admin", href: "/admin", primary: false }] : []),
            ].map(a => (
              <button key={a.label} onClick={() => router.push(a.href)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "16px 10px", background: a.primary ? "var(--red)" : "var(--navy-mid)", color: a.primary ? "var(--white)" : "var(--white-muted)", border: a.primary ? "none" : "1px solid var(--navy-border)", borderRadius: "12px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, transition: "all 0.2s" }}
                onMouseEnter={e => { if (!a.primary) { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(230,57,70,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--white)"; } }}
                onMouseLeave={e => { if (!a.primary) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--navy-border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--white-muted)"; } }}
              >
                <span style={{ fontSize: "1.4rem" }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent rentals ── */}
        {!dataLoading && recentRentals.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <p className="section-label" style={{ margin: 0 }}>Recent Rentals</p>
              <Link href="/rentals" style={{ color: "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>View all →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentRentals.map((r: any) => (
                <div key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {r.vehicles?.image_url ? (
                      <img src={r.vehicles.image_url} alt="" loading="lazy" decoding="async" style={{ width: "52px", height: "38px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: "52px", height: "38px", background: "var(--navy)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>🚗</div>
                    )}
                    <div>
                      <p style={{ fontWeight: 600, margin: "0 0 2px", fontSize: "0.93rem" }}>{r.vehicles?.make} {r.vehicles?.model}</p>
                      <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: 0 }}>
                        {new Date(r.start_date).toLocaleDateString("fr-CM")} → {new Date(r.end_date).toLocaleDateString("fr-CM")}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{formatFCFA(r.total_price)}</span>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Featured vehicles ── */}
        {!dataLoading && featuredVehicles.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <p className="section-label" style={{ margin: 0 }}>Available Now</p>
              <Link href="/rent" style={{ color: "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>Browse all →</Link>
            </div>
            <div className="grid-3">
              {featuredVehicles.map(v => (
                <div key={v.id} className="card" style={{ cursor: "pointer", padding: 0, overflow: "hidden" }}
                  onClick={() => router.push(v.type === "sale" ? "/sales" : "/rent")}>
                  {v.image_url ? (
                    <div className="vehicle-card-image">
                      <img src={v.image_url} alt={`${v.make} ${v.model}`} loading="lazy" decoding="async" />
                      <div className="vehicle-card-image-overlay" />
                      {v.daily_rate && <span className="vehicle-card-price-badge">{formatFCFA(v.daily_rate)}/day</span>}
                      {v.location && <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(13,27,42,0.8)", backdropFilter: "blur(4px)", color: "var(--white-muted)", padding: "2px 8px", borderRadius: "100px", fontSize: "0.65rem", fontWeight: 600 }}>📍 {v.location}</span>}
                    </div>
                  ) : (
                    <div className="vehicle-card-placeholder">🚗</div>
                  )}
                  <div style={{ padding: "14px 16px" }}>
                    <p style={{ fontWeight: 700, margin: "0 0 3px", fontSize: "0.95rem" }}>{v.make} {v.model}</p>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: 0 }}>{v.year} · {v.transmission} · {v.fuel_type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── New user onboarding ── */}
        {isNewUser && (
          <div style={{ background: "linear-gradient(135deg, rgba(230,57,70,0.1) 0%, rgba(13,27,42,0) 100%)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: "20px", padding: "32px", marginTop: "28px" }}>
            <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>🎉</p>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 10px" }}>Your account is ready!</h2>
            <p style={{ color: "var(--white-muted)", margin: "0 0 20px", lineHeight: 1.7, fontSize: "0.9rem" }}>
              Welcome to DriveEasy — Cameroon&apos;s premier vehicle platform. Rent a car for a day or purchase one outright. All prices in FCFA, no hidden fees.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={() => router.push("/rent")} style={{ padding: "11px 22px", fontWeight: 700 }}>🚗 Rent Your First Vehicle</button>
              <button onClick={() => router.push("/sales")} style={{ padding: "11px 22px", background: "var(--navy-light)", border: "1.5px solid var(--navy-border)", color: "var(--white)" }}>🏷️ Browse Sales</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── PUBLIC LANDING PAGE ─── */
  return (
    <div>
      {/* Anchor Nav */}
      <nav style={anchorNav}>
        {[
          { label: "Home", href: "#hero" },
          { label: "Services", href: "#services" },
          { label: "How It Works", href: "#how" },
          { label: "Why Us", href: "#why" },
          { label: "Reviews", href: "#testimonials" },
          { label: "FAQ", href: "#faq" },
        ].map((l) => (
          <a key={l.label} href={l.href} style={anchorLink}>{l.label}</a>
        ))}
        <a href="/register" style={anchorCta}>Get Started →</a>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" style={heroSection}>
        <div style={heroBg} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 70% 50%, rgba(230,57,70,0.07) 0%, transparent 55%)", zIndex: 0 }} />
        <div style={heroInner} className="animate-in">
          <div style={badge}>🇨🇲 Cameroon&apos;s Premier Car Platform</div>
          <h1 style={heroTitle}>
            Rent or Buy a Car<br />
            <span style={{ color: "var(--red)" }}>Anywhere in Cameroon.</span>
          </h1>
          <p style={heroSub}>
            From Buea to Douala, Yaoundé to Bamenda — DriveEasy connects you with
            quality vehicles at honest FCFA prices. No hidden charges, no stress.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "48px" }}>
            <button style={primaryBtn} onClick={() => router.push("/register")}>
              🚀 Start for Free
            </button>
            <button style={outlineBtn} onClick={() => router.push("/login")}>Sign In</button>
          </div>
          <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
            {[
              { v: animVehicles > 0 ? `${animVehicles}+` : "50+", l: "Vehicles" },
              { v: "500+", l: "Customers" },
              { v: "3", l: "Cities Covered" },
              { v: "24/7", l: "Support" }
            ].map(s => (
              <div key={s.l}>
                <p style={{ fontSize: "2rem", fontWeight: 900, margin: "0 0 2px", color: "var(--white)" }}>{s.v}</p>
                <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: 0 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section style={{ background: "var(--navy-mid)", borderTop: "1px solid var(--navy-border)", borderBottom: "1px solid var(--navy-border)", padding: "20px 0" }}>
        <div className="page" style={{ padding: "0 24px" }}>
          <div className="trust-strip">
            {TRUST_ITEMS.map(item => (
              <div key={item.title} className="trust-badge">
                <span className="trust-badge-icon">{item.icon}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.85rem", margin: "0 0 2px", color: "var(--white)" }}>{item.title}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--white-muted)", margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ padding: "90px 0" }}>
        <div className="page">
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <span className="section-label">Our Services</span>
            <h2 style={secTitle}>Two Services. One Platform.</h2>
            <p style={secSub}>Whether you need a car for a day or want to own one — we have you covered.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            {[
              {
                icon: "🚗", title: "Vehicle Rental", gradient: "rgba(230,57,70,0.08)",
                sub: "Need a car for a trip to Douala or a meeting in Yaoundé? Rent by the day with flexible pickup across Cameroon.",
                bullets: ["Daily & weekly rates in FCFA", "Sedans, SUVs, Pickups & Minibuses", "Buea, Douala & Yaoundé delivery", "Instant booking confirmation"],
                btn: "Rent a Vehicle →", href: "/register"
              },
              {
                icon: "🏷️", title: "Vehicle Sales", gradient: "rgba(96,165,250,0.08)",
                sub: "Ready to own? Browse quality vehicles for sale. Transparent FCFA pricing, no middlemen, no hidden fees.",
                bullets: ["Competitive prices in FCFA", "Verified mileage & history", "Sedans, SUVs, 4x4s & more", "Simple online purchase process"],
                btn: "Browse for Sale →", href: "/register"
              },
            ].map((s) => (
              <div key={s.title} style={{ ...svcCard, background: `linear-gradient(135deg, ${s.gradient} 0%, var(--navy-mid) 60%)` }}>
                <span style={{ fontSize: "2.5rem" }}>{s.icon}</span>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>{s.title}</h3>
                <p style={{ color: "var(--white-muted)", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{s.sub}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {s.bullets.map(b => <li key={b} style={{ color: "var(--white-soft)", fontSize: "0.88rem", display: "flex", gap: "8px", alignItems: "center" }}><span style={{ color: "#34d399", fontWeight: 800 }}>✓</span> {b}</li>)}
                </ul>
                <button style={primaryBtn} onClick={() => router.push(s.href)}>{s.btn}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: "90px 0", background: "var(--navy-mid)" }}>
        <div className="page">
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <span className="section-label">Simple Process</span>
            <h2 style={secTitle}>How DriveEasy Works</h2>
            <p style={secSub}>Simple, fast, and designed for Cameroonians</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
            {[
              { step: "01", icon: "📝", title: "Create Account", desc: "Register in 2 minutes with just your name and email. No complicated forms." },
              { step: "02", icon: "🔍", title: "Browse & Filter", desc: "Search vehicles by type, price, or city. Filter by fuel type and daily rate in FCFA." },
              { step: "03", icon: "📅", title: "Pick Your Dates", desc: "Select your rental dates. DriveEasy instantly calculates your total FCFA price." },
              { step: "04", icon: "✅", title: "Confirm & Drive", desc: "Booking confirmed instantly. Pay via Orange Money, MTN MoMo, or card." },
            ].map((s, i) => (
              <div key={s.step} className="card" style={{ position: "relative", textAlign: "center", padding: "32px 24px" }}>
                <div style={{ position: "absolute", top: 16, right: 18, fontSize: "2rem", fontWeight: 900, color: "rgba(230,57,70,0.12)", letterSpacing: "-0.05em" }}>{s.step}</div>
                <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", margin: "0 auto 16px" }}>{s.icon}</div>
                <h3 style={{ marginBottom: "10px", fontSize: "1rem" }}>{s.title}</h3>
                <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY DRIVEEASY ── */}
      <section id="why" style={{ padding: "90px 0" }}>
        <div className="page">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "48px", alignItems: "center" }}>
            <div>
              <span className="section-label">Why DriveEasy</span>
              <h2 style={{ ...secTitle, marginBottom: "16px" }}>Built for the Cameroon Market</h2>
              <p style={{ color: "var(--white-muted)", fontSize: "0.95rem", lineHeight: 1.8, marginBottom: "28px" }}>
                We are not a global platform trying to fit into the Cameroonian market. DriveEasy was designed from the ground up for Cameroon — FCFA pricing, Orange Money and MTN MoMo payments, local city coverage, and a bilingual interface in English and French.
              </p>
              <button style={primaryBtn} onClick={() => router.push("/register")}>Get Started Free</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { icon: "🇨🇲", title: "Built for Cameroon", desc: "FCFA pricing, local cities, Orange Money & MTN MoMo payments natively supported." },
                { icon: "🌐", title: "English & French", desc: "Full bilingual interface. Switch between EN and FR at any time, on any page." },
                { icon: "⚡", title: "Real-Time Updates", desc: "Vehicle availability and rental status sync in real-time across all devices." },
                { icon: "🛡️", title: "Secure & Reliable", desc: "Row-level database security ensures your data is never exposed to other users." },
              ].map(item => (
                <div key={item.title} style={{ display: "flex", gap: "16px", alignItems: "flex-start", background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "14px", padding: "18px 20px", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(230,57,70,0.35)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--navy-border)"}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, margin: "0 0 4px", color: "var(--white)", fontSize: "0.95rem" }}>{item.title}</p>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: "90px 0", background: "var(--navy-mid)" }}>
        <div className="page">
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <span className="section-label">Customer Reviews</span>
            <h2 style={secTitle}>What Our Customers Say</h2>
            <p style={secSub}>Real reviews from real DriveEasy customers across Cameroon</p>
          </div>
          <div className="grid-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="testimonial-card">
                <div className="testimonial-stars">{"★".repeat(t.rating)}</div>
                <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{ background: t.color }}>{t.initials}</div>
                  <div>
                    <p style={{ fontWeight: 700, margin: "0 0 2px", fontSize: "0.92rem", color: "var(--white)" }}>{t.name}</p>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: 0 }}>{t.role} · {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "90px 0" }}>
        <div className="page" style={{ maxWidth: "740px" }}>
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <span className="section-label">FAQ</span>
            <h2 style={secTitle}>Frequently Asked Questions</h2>
            <p style={secSub}>Everything you need to know before booking</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { q: "What currency are prices in?", a: "All prices are in CFA Franc (FCFA). No dollar conversions or hidden exchange fees." },
              { q: "Where can I pick up my rental?", a: "We serve Buea, Douala and Yaoundé. After booking, our team confirms pickup location and can arrange delivery." },
              { q: "Can I cancel a rental?", a: "Yes — cancel from your 'My Rentals' dashboard anytime. Refund terms depend on how far in advance you cancel." },
              { q: "How do I buy a vehicle?", a: "Browse 'Buy a Vehicle', choose your car, click 'Buy Now'. Sale is logged and our team contacts you for handover." },
              { q: "Is my account data safe?", a: "Yes. DriveEasy uses encrypted authentication and row-level database security. No payment card data is stored on our platform." },
              { q: "Do you support Orange Money and MTN MoMo?", a: "Yes! Both Orange Money and MTN MoMo are supported payment methods on DriveEasy, alongside international card payments." },
            ].map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "90px 0", background: "linear-gradient(135deg, rgba(230,57,70,0.12) 0%, var(--navy-mid) 60%)", borderTop: "1px solid var(--navy-border)", borderBottom: "1px solid var(--navy-border)" }}>
        <div className="page" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🚗</div>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", fontWeight: 900, marginBottom: "14px" }}>Ready to Hit the Road in Cameroon?</h2>
          <p style={{ color: "var(--white-muted)", marginBottom: "30px", fontSize: "1rem", maxWidth: "480px", margin: "0 auto 30px" }}>Join DriveEasy — Buea&apos;s smartest way to rent or buy a vehicle. Free to sign up, no credit card required.</p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ ...primaryBtn, padding: "15px 36px", fontSize: "1rem" }} onClick={() => router.push("/register")}>
              Get Started — It&apos;s Free
            </button>
            <button style={{ ...outlineBtn, padding: "15px 36px", fontSize: "1rem" }} onClick={() => router.push("/login")}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "var(--navy)", borderTop: "1px solid var(--navy-border)", padding: "60px 0 28px" }}>
        <div className="page">
          <div className="footer-grid">
            {/* Brand */}
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "14px" }}>
                <span style={{ color: "var(--red)" }}>Drive</span>Easy
              </div>
              <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", lineHeight: 1.8, marginBottom: "16px", maxWidth: "260px" }}>
                Cameroon&apos;s premier digital platform for vehicle rental and sales. Serving Buea, Douala, and Yaoundé.
              </p>
              <div className="footer-social">
                {[["📘", "https://facebook.com"], ["📷", "https://instagram.com"], ["💬", "https://wa.me/237600000000"]].map(([icon, href]) => (
                  <a key={href as string} href={href as string} target="_blank" rel="noopener noreferrer" className="footer-social-btn">{icon}</a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="footer-col-title">Platform</p>
              {[["Rent a Vehicle", "/rent"], ["Buy a Vehicle", "/sales"], ["My Rentals", "/rentals"], ["My Purchases", "/sales/history"], ["My Profile", "/profile"]].map(([l, h]) => (
                <Link key={l} href={h} className="footer-link">{l}</Link>
              ))}
            </div>

            {/* Company */}
            <div>
              <p className="footer-col-title">Company</p>
              {[["Home", "/"], ["Register", "/register"], ["Login", "/login"], ["Admin Dashboard", "/admin"]].map(([l, h]) => (
                <Link key={l} href={h} className="footer-link">{l}</Link>
              ))}
            </div>

            {/* Contact */}
            <div>
              <p className="footer-col-title">Contact</p>
              <p className="footer-link">📍 Buea, South West Region, Cameroon</p>
              <p className="footer-link">📞 +237 6XX XXX XXX</p>
              <p className="footer-link">✉️ hello@driveeasy.cm</p>
              <p className="footer-link">⏰ Mon–Sat, 8am–6pm</p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--navy-border)", paddingTop: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>© 2026 DriveEasy · Buea, Cameroon. All rights reserved.</p>
            <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>Built for Cameroonians 🇨🇲</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "var(--navy-mid)", border: `1px solid ${open ? "rgba(230,57,70,0.4)" : "var(--navy-border)"}`, borderRadius: "12px", overflow: "hidden", transition: "border-color 0.2s" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", background: "transparent", border: "none", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", color: "var(--white)", textAlign: "left", fontWeight: 600, fontSize: "0.95rem", gap: "12px" }}>
        <span>{q}</span>
        <span style={{ color: "var(--red)", fontSize: "1.4rem", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.25s", flexShrink: 0, lineHeight: 1 }}>+</span>
      </button>
      {open && <div style={{ padding: "0 22px 18px", color: "var(--white-muted)", fontSize: "0.9rem", lineHeight: 1.75, animation: "fadeInUp 0.2s ease" }}>{a}</div>}
    </div>
  );
}

/* Styles */
const anchorNav: React.CSSProperties = { display: "flex", alignItems: "center", gap: "4px", padding: "0 24px", background: "var(--navy-mid)", borderBottom: "1px solid var(--navy-border)", overflowX: "auto", scrollbarWidth: "none" };
const anchorLink: React.CSSProperties = { padding: "12px 14px", color: "var(--white-muted)", fontSize: "0.84rem", fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap", transition: "color 0.2s" };
const anchorCta: React.CSSProperties = { marginLeft: "auto", padding: "8px 18px", background: "var(--red)", color: "var(--white)", borderRadius: "8px", fontSize: "0.84rem", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" };
const heroSection: React.CSSProperties = { position: "relative", minHeight: "90vh", display: "flex", alignItems: "center", overflow: "hidden" };
const heroBg: React.CSSProperties = { position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 15% 50%, rgba(230,57,70,0.14) 0%, transparent 65%)", zIndex: 0 };
const heroInner: React.CSSProperties = { position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" };
const badge: React.CSSProperties = { display: "inline-block", background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.3)", color: "var(--red)", padding: "7px 16px", borderRadius: "100px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "18px" };
const heroTitle: React.CSSProperties = { fontSize: "clamp(2.4rem, 6vw, 4.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", marginBottom: "20px" };
const heroSub: React.CSSProperties = { fontSize: "1.05rem", color: "var(--white-muted)", maxWidth: "560px", marginBottom: "32px", lineHeight: 1.8 };
const primaryBtn: React.CSSProperties = { padding: "13px 28px", background: "var(--red)", color: "var(--white)", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" };
const outlineBtn: React.CSSProperties = { padding: "13px 28px", background: "transparent", color: "var(--white)", border: "1.5px solid var(--navy-border)", borderRadius: "10px", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" };
const secTitle: React.CSSProperties = { fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 800, marginBottom: "10px", color: "var(--white)" };
const secSub: React.CSSProperties = { color: "var(--white-muted)", fontSize: "0.95rem", margin: 0 };
const svcCard: React.CSSProperties = { background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "20px", padding: "36px", display: "flex", flexDirection: "column", gap: "18px", transition: "border-color 0.2s, transform 0.2s" };