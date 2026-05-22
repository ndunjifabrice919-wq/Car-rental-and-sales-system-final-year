"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ rentals: 0, purchases: 0, spent: 0 });
  const [recentRentals, setRecentRentals] = useState<any[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
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
    setDataLoading(true);
    Promise.all([
      supabase.from("rentals").select("total_price, start_date, end_date, status, vehicle_id, id, vehicles(make,model,image_url)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("sales").select("sale_price").eq("user_id", user.id),
      supabase.from("vehicles").select("id, make, model, year, type, status, daily_rate, sale_price, fuel_type, transmission, image_url, seats, color").eq("status", "available").limit(4),
    ]).then(([{ data: rentals }, { data: purchases }, { data: vehicles }]) => {
      const rentalTotal = (rentals || []).reduce((s: number, r: any) => s + (r.total_price || 0), 0);
      const saleTotal = (purchases || []).reduce((s: number, p: any) => s + (p.sale_price || 0), 0);
      setStats({ rentals: rentals?.length || 0, purchases: purchases?.length || 0, spent: rentalTotal + saleTotal });
      setRecentRentals(rentals || []);
      setFeaturedVehicles(vehicles || []);
      setDataLoading(false);
    });
  }, [user, authLoading]);

  if (authLoading) return <div className="loading"><div className="spinner" /></div>;

  /* ─── LOGGED IN DASHBOARD ─── */
  if (user) {
    const displayName = profile?.full_name?.trim() ? profile.full_name.split(" ")[0] : null;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const isNewUser = !dataLoading && stats.rentals === 0 && stats.purchases === 0;

    return (
      <div className="page animate-in">
        {/* Greeting header */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, marginBottom: "6px" }}>
            {greeting}{displayName ? `, ${displayName}` : ""}! 👋
          </h1>
          <p style={{ color: "var(--white-muted)", margin: 0 }}>
            Welcome {isNewUser ? "to DriveEasy" : "back to DriveEasy"} · Buea, Cameroon
          </p>
        </div>

        {isNewUser ? (
          <div>
            {/* Welcome banner */}
            <div style={{ background: "linear-gradient(135deg, rgba(230,57,70,0.12) 0%, rgba(13,27,42,0) 100%)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: "20px", padding: "36px", marginBottom: "32px" }} className="animate-in">
              <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>🎉</p>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 10px" }}>Your account is ready!</h2>
              <p style={{ color: "var(--white-muted)", margin: "0 0 20px", maxWidth: "500px", lineHeight: 1.7 }}>
                Welcome to DriveEasy — Cameroon&apos;s premier vehicle rental and sales platform.
                Rent a car for a day, or purchase one outright. All prices in FCFA, no hidden fees.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button onClick={() => router.push("/rent")} style={{ padding: "12px 24px", fontWeight: 700 }}>🚗 Rent Your First Vehicle</button>
                <button onClick={() => router.push("/sales")} style={{ padding: "12px 24px", background: "var(--navy-light)", border: "1.5px solid var(--navy-border)", color: "var(--white)" }}>🏷️ Browse Vehicles for Sale</button>
              </div>
            </div>

            {/* What you can do */}
            <p className="section-label">Get started</p>
            <div className="grid-3" style={{ marginBottom: "36px" }}>
              {[
                { icon: "🚗", title: "Rent a Vehicle", desc: "Choose a car, pick your dates, pay via Orange Money, MTN MoMo or card. Instant confirmation.", href: "/rent", btn: "Browse Rentals" },
                { icon: "🏷️", title: "Buy a Vehicle", desc: "Browse our curated selection of vehicles for sale at honest FCFA prices.", href: "/sales", btn: "Browse Sales" },
                { icon: "👤", title: "Complete Your Profile", desc: "Add your phone number and full name so we can reach you for pickup and delivery.", href: "/profile", btn: "Edit Profile" },
              ].map((c, i) => (
                <div key={c.title} className={`card animate-in-delay-${i + 1}`} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <span style={{ fontSize: "2rem" }}>{c.icon}</span>
                  <h3 style={{ fontSize: "1rem", margin: 0 }}>{c.title}</h3>
                  <p style={{ color: "var(--white-muted)", fontSize: "0.87rem", lineHeight: 1.6, margin: 0, flex: 1 }}>{c.desc}</p>
                  <button onClick={() => router.push(c.href)} style={{ padding: "10px 20px", fontSize: "0.87rem", marginTop: "auto" }}>{c.btn}</button>
                </div>
              ))}
            </div>

            {featuredVehicles.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <p className="section-label">Available Now</p>
                  <Link href="/rent" style={{ color: "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>Browse all →</Link>
                </div>
                <div className="grid-3">
                  {featuredVehicles.map((v) => (
                    <div key={v.id} className="card" style={{ cursor: "pointer", padding: 0, overflow: "hidden" }} onClick={() => router.push(v.type === "sale" ? "/sales" : "/rent")}>
                      {v.image_url ? (
                        <div className="vehicle-card-image">
                          <img src={v.image_url} alt={`${v.make} ${v.model}`} />
                          <div className="vehicle-card-image-overlay" />
                          {v.daily_rate && <span className="vehicle-card-price-badge">{formatFCFA(v.daily_rate)}/day</span>}
                        </div>
                      ) : (
                        <div className="vehicle-card-placeholder">🚗</div>
                      )}
                      <div style={{ padding: "16px" }}>
                        <p style={{ fontWeight: 700, margin: "0 0 3px" }}>{v.make} {v.model}</p>
                        <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{v.year} · {v.transmission}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* RETURNING USER — Stats dashboard */
          <div>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "36px" }}>
              {dataLoading ? (
                [1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: "90px" }} />)
              ) : (
                [
                  { label: "My Rentals", value: stats.rentals, icon: "🚗", href: "/rentals" },
                  { label: "My Purchases", value: stats.purchases, icon: "🏷️", href: "/sales/history" },
                  { label: "Total Spent", value: formatFCFA(stats.spent), icon: "💰", href: "/profile" },
                ].map((s) => (
                  <div key={s.label} onClick={() => router.push(s.href)} className="card animate-in"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(230,57,70,0.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--navy-border)")}>
                    <p style={{ fontSize: "1.4rem", margin: "0 0 4px" }}>{s.icon}</p>
                    <p style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 4px" }}>{s.value}</p>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: 0 }}>{s.label}</p>
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: "36px" }}>
              <p className="section-label">Quick Actions</p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {[
                  { label: "🚗 Rent a Vehicle", href: "/rent", primary: true },
                  { label: "🏷️ Buy a Vehicle", href: "/sales", primary: false },
                  { label: "📋 My Rentals", href: "/rentals", primary: false },
                  { label: "🧾 My Purchases", href: "/sales/history", primary: false },
                  { label: "👤 My Profile", href: "/profile", primary: false },
                  ...(profile?.role === "admin" || profile?.role === "owner" ? [{ label: "🛡️ Admin Dashboard", href: "/admin", primary: false }] : []),
                ].map((a) => (
                  <button key={a.label} onClick={() => router.push(a.href)}
                    style={{ background: a.primary ? "var(--red)" : "var(--navy-light)", color: a.primary ? "var(--white)" : "var(--white-muted)", padding: "10px 18px", fontSize: "0.87rem", fontWeight: 600, borderRadius: "10px", border: a.primary ? "none" : "1px solid var(--navy-border)", cursor: "pointer" }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Rentals */}
            {!dataLoading && recentRentals.length > 0 && (
              <div style={{ marginBottom: "36px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <p className="section-label">Recent Rentals</p>
                  <Link href="/rentals" style={{ color: "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>View all →</Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {recentRentals.map((r) => (
                    <div key={r.id} style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {r.vehicles?.image_url ? (
                          <img src={r.vehicles.image_url} alt="" style={{ width: "48px", height: "36px", objectFit: "cover", borderRadius: "6px" }} />
                        ) : (
                          <div style={{ width: "48px", height: "36px", background: "var(--navy)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🚗</div>
                        )}
                        <div>
                          <p style={{ fontWeight: 600, margin: "0 0 3px", fontSize: "0.95rem" }}>{r.vehicles?.make} {r.vehicles?.model}</p>
                          <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>
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

            {/* Available Vehicles */}
            {!dataLoading && featuredVehicles.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <p className="section-label">Available Now</p>
                  <Link href="/rent" style={{ color: "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>Browse all →</Link>
                </div>
                <div className="grid-3">
                  {featuredVehicles.map((v) => (
                    <div key={v.id} className="card" style={{ cursor: "pointer", padding: 0, overflow: "hidden" }} onClick={() => router.push(v.type === "sale" ? "/sales" : "/rent")}>
                      {v.image_url ? (
                        <div className="vehicle-card-image">
                          <img src={v.image_url} alt={`${v.make} ${v.model}`} />
                          <div className="vehicle-card-image-overlay" />
                          {v.daily_rate && <span className="vehicle-card-price-badge">{formatFCFA(v.daily_rate)}/day</span>}
                        </div>
                      ) : (
                        <div className="vehicle-card-placeholder">🚗</div>
                      )}
                      <div style={{ padding: "16px" }}>
                        <p style={{ fontWeight: 700, margin: "0 0 3px" }}>{v.make} {v.model}</p>
                        <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{v.year} · {v.transmission}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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