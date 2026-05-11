"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ rentals: 0, purchases: 0, spent: 0 });
  const [recentRentals, setRecentRentals] = useState<any[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Only fetch dashboard data when user is confirmed logged in
  useEffect(() => {
    if (!user || authLoading) return;
    setDataLoading(true);

    Promise.all([
      supabase.from("rentals").select("total_price, start_date, end_date, status, vehicle_id, id, vehicles(make,model)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("sales").select("sale_price").eq("user_id", user.id),
      supabase.from("vehicles").select("id, make, model, year, type, status, daily_rate, sale_price, fuel_type, transmission").eq("status", "available").limit(4),
    ]).then(([{ data: rentals }, { data: purchases }, { data: vehicles }]) => {
      const rentalTotal = (rentals || []).reduce((s: number, r: any) => s + (r.total_price || 0), 0);
      const saleTotal = (purchases || []).reduce((s: number, p: any) => s + (p.sale_price || 0), 0);
      setStats({ rentals: rentals?.length || 0, purchases: purchases?.length || 0, spent: rentalTotal + saleTotal });
      setRecentRentals(rentals || []);
      setFeaturedVehicles(vehicles || []);
      setDataLoading(false);
    });
  }, [user, authLoading]);

  // Still resolving auth
  if (authLoading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  /* ── LOGGED IN DASHBOARD ── */
  if (user) {
    // Always use real full name — never show email username
    const displayName = profile?.full_name?.trim()
      ? profile.full_name.split(" ")[0]
      : null;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const isNewUser = !dataLoading && stats.rentals === 0 && stats.purchases === 0;

    return (
      <div className="page">
        {/* Greeting */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, marginBottom: "6px" }}>
            {greeting}{displayName ? `, ${displayName}` : ""}! 👋
          </h1>
          <p style={{ color: "var(--white-muted)", margin: 0 }}>
            Welcome {isNewUser ? "to DriveEasy" : "back to DriveEasy"} · Buea, Cameroon
          </p>
        </div>

        {/* NEW USER — Onboarding */}
        {isNewUser ? (
          <div>
            {/* Welcome banner */}
            <div style={{ background: "linear-gradient(135deg, rgba(230,57,70,0.12) 0%, rgba(13,27,42,0) 100%)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: "20px", padding: "36px", marginBottom: "32px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "1.5rem" }}>🎉</p>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>Your account is ready!</h2>
              <p style={{ color: "var(--white-muted)", margin: 0, maxWidth: "500px", lineHeight: 1.7 }}>
                Welcome to DriveEasy — Cameroon&apos;s premier vehicle rental and sales platform.
                You can rent a car for a day, or purchase one for keeps. All prices are in FCFA with no hidden fees.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
                <button onClick={() => router.push("/rent")} style={{ padding: "12px 24px", fontWeight: 700 }}>
                  🚗 Rent Your First Vehicle
                </button>
                <button onClick={() => router.push("/sales")} style={{ padding: "12px 24px", background: "var(--navy-light)", border: "1.5px solid var(--navy-border)", color: "var(--white)" }}>
                  🏷️ Browse Vehicles for Sale
                </button>
              </div>
            </div>

            {/* What you can do */}
            <h2 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--white-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
              What You Can Do
            </h2>
            <div className="grid-3" style={{ marginBottom: "36px" }}>
              {[
                { icon: "🚗", title: "Rent a Vehicle", desc: "Choose a car, pick your dates, pay via Orange Money, MTN MoMo or card. Instant confirmation.", href: "/rent", btn: "Browse Rentals" },
                { icon: "🏷️", title: "Buy a Vehicle", desc: "Browse our curated selection of vehicles for sale at honest FCFA prices.", href: "/sales", btn: "Browse Sales" },
                { icon: "👤", title: "Complete Your Profile", desc: "Add your phone number and full name so we can reach you for pickup and delivery.", href: "/profile", btn: "Edit Profile" },
              ].map((c) => (
                <div key={c.title} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <span style={{ fontSize: "2rem" }}>{c.icon}</span>
                  <h3 style={{ fontSize: "1rem", margin: 0 }}>{c.title}</h3>
                  <p style={{ color: "var(--white-muted)", fontSize: "0.87rem", lineHeight: 1.6, margin: 0, flex: 1 }}>{c.desc}</p>
                  <button onClick={() => router.push(c.href)} style={{ padding: "10px 20px", fontSize: "0.87rem", marginTop: "auto" }}>{c.btn}</button>
                </div>
              ))}
            </div>

            {/* Available vehicles */}
            {featuredVehicles.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h2 style={{ fontSize: "0.82rem", fontWeight: 700, margin: 0, color: "var(--white-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Available Now</h2>
                  <Link href="/rent" style={{ color: "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>Browse all →</Link>
                </div>
                <div className="grid-3">
                  {featuredVehicles.map((v) => (
                    <div key={v.id} className="card" style={{ cursor: "pointer" }} onClick={() => router.push(v.type === "sale" ? "/sales" : "/rent")}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div>
                          <p style={{ fontWeight: 700, margin: "0 0 3px" }}>{v.make} {v.model}</p>
                          <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{v.year} · {v.transmission}</p>
                        </div>
                        <span className={`badge badge-${v.status}`}>{v.status}</span>
                      </div>
                      {v.daily_rate && <p style={{ color: "var(--red)", fontWeight: 700, margin: 0 }}>{formatFCFA(v.daily_rate)}<span style={{ color: "var(--white-muted)", fontWeight: 400, fontSize: "0.78rem" }}>/day</span></p>}
                      {v.sale_price && <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: "4px 0 0" }}>For sale: {formatFCFA(v.sale_price)}</p>}
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
            {dataLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
                {[1, 2, 3].map(i => <div key={i} style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "14px", height: "90px" }} />)}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "36px" }}>
                {[
                  { label: "My Rentals", value: stats.rentals, icon: "🚗", href: "/rentals" },
                  { label: "My Purchases", value: stats.purchases, icon: "🏷️", href: "/sales/history" },
                  { label: "Total Spent", value: formatFCFA(stats.spent), icon: "💰", href: "/profile" },
                ].map((s) => (
                  <div key={s.label} onClick={() => router.push(s.href)}
                    style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "14px", padding: "22px", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(230,57,70,0.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--navy-border)")}>
                    <p style={{ fontSize: "1.4rem", margin: "0 0 4px" }}>{s.icon}</p>
                    <p style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 4px" }}>{s.value}</p>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ marginBottom: "36px" }}>
              <h2 style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "14px", color: "var(--white-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Quick Actions</h2>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {[
                  { label: "🚗 Rent a Vehicle", href: "/rent", primary: true },
                  { label: "🏷️ Buy a Vehicle", href: "/sales", primary: false },
                  { label: "📋 My Rentals", href: "/rentals", primary: false },
                  { label: "🧾 My Purchases", href: "/sales/history", primary: false },
                  { label: "👤 My Profile", href: "/profile", primary: false },
                  ...(profile?.role === "admin" ? [{ label: "🛡️ Admin Dashboard", href: "/admin", primary: false }] : []),
                ].map((a) => (
                  <button key={a.label} onClick={() => router.push(a.href)}
                    style={{ background: a.primary ? "var(--red)" : "var(--navy-light)", color: a.primary ? "var(--white)" : "var(--white-muted)", padding: "10px 18px", fontSize: "0.87rem", fontWeight: 600, borderRadius: "10px", border: "none", cursor: "pointer" }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Rentals */}
            {!dataLoading && recentRentals.length > 0 && (
              <div style={{ marginBottom: "36px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h2 style={{ fontSize: "0.82rem", fontWeight: 700, margin: 0, color: "var(--white-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent Rentals</h2>
                  <Link href="/rentals" style={{ color: "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>View all →</Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {recentRentals.map((r) => (
                    <div key={r.id} style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <p style={{ fontWeight: 600, margin: "0 0 3px", fontSize: "0.95rem" }}>{r.vehicles?.make} {r.vehicles?.model}</p>
                        <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>
                          {new Date(r.start_date).toLocaleDateString("fr-CM")} → {new Date(r.end_date).toLocaleDateString("fr-CM")}
                        </p>
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
                  <h2 style={{ fontSize: "0.82rem", fontWeight: 700, margin: 0, color: "var(--white-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Available Now</h2>
                  <Link href="/rent" style={{ color: "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>Browse all →</Link>
                </div>
                <div className="grid-3">
                  {featuredVehicles.map((v) => (
                    <div key={v.id} className="card" style={{ cursor: "pointer" }} onClick={() => router.push(v.type === "sale" ? "/sales" : "/rent")}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div>
                          <p style={{ fontWeight: 700, margin: "0 0 3px" }}>{v.make} {v.model}</p>
                          <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{v.year} · {v.transmission}</p>
                        </div>
                        <span className={`badge badge-${v.status}`}>{v.status}</span>
                      </div>
                      {v.daily_rate && <p style={{ color: "var(--red)", fontWeight: 700, margin: 0 }}>{formatFCFA(v.daily_rate)}<span style={{ color: "var(--white-muted)", fontWeight: 400, fontSize: "0.78rem" }}>/day</span></p>}
                      {v.sale_price && <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: "4px 0 0" }}>For sale: {formatFCFA(v.sale_price)}</p>}
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


  /* ── PUBLIC LANDING PAGE ── */
  return (
    <div>
      {/* Anchor Nav */}
      <nav style={anchorNav}>
        {[
          { label: "Home", href: "#hero" },
          { label: "Services", href: "#services" },
          { label: "How It Works", href: "#how" },
          { label: "FAQ", href: "#faq" },
        ].map((l) => (
          <a key={l.label} href={l.href} style={anchorLink}>{l.label}</a>
        ))}
        <a href="/register" style={anchorCta}>Get Started →</a>
      </nav>

      {/* HERO */}
      <section id="hero" style={heroSection}>
        <div style={heroBg} />
        <div style={heroInner}>
          <div style={badge}>🇨🇲 Buea, Cameroon&apos;s Premier Car Platform</div>
          <h1 style={heroTitle}>
            Rent or Buy a Car<br />
            <span style={{ color: "var(--red)" }}>Anywhere in Cameroon.</span>
          </h1>
          <p style={heroSub}>
            From Buea to Douala, Yaoundé to Bamenda — DriveEasy connects you with
            quality vehicles at honest FCFA prices. No hidden charges, no stress.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "48px" }}>
            <button style={primaryBtn} onClick={() => router.push("/register")}>Start for Free</button>
            <button style={outlineBtn} onClick={() => router.push("/login")}>Sign In</button>
          </div>
          <div style={{ display: "flex", gap: "36px", flexWrap: "wrap" }}>
            {[{ v: "50+", l: "Vehicles" }, { v: "500+", l: "Customers" }, { v: "3 Cities", l: "Buea · Douala · Yaoundé" }, { v: "24/7", l: "Support" }].map(s => (
              <div key={s.l}>
                <p style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 2px" }}>{s.v}</p>
                <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{ padding: "80px 0", background: "var(--navy-mid)" }}>
        <div className="page">
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={secTitle}>Two Services. One Platform.</h2>
            <p style={secSub}>Whether you need a car for a day or want to own one — we have you covered.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            {[
              { icon: "🚗", title: "Vehicle Rental", sub: "Need a car for a trip to Douala or a meeting in Yaoundé? Rent by the day with flexible pickup across Cameroon.", bullets: ["Daily & weekly rates in FCFA", "Sedans, SUVs, Pickups & Minibuses", "Buea, Douala & Yaoundé delivery", "Instant booking confirmation"], btn: "Rent a Vehicle →", href: "/register" },
              { icon: "🏷️", title: "Vehicle Sales", sub: "Ready to own? Browse quality vehicles for sale. Transparent FCFA pricing, no middlemen, no hidden fees.", bullets: ["Competitive prices in FCFA", "Verified mileage & history", "Sedans, SUVs, 4x4s & more", "Simple online purchase process"], btn: "Browse for Sale →", href: "/register" },
            ].map((s) => (
              <div key={s.title} style={svcCard}>
                <span style={{ fontSize: "2.5rem" }}>{s.icon}</span>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>{s.title}</h3>
                <p style={{ color: "var(--white-muted)", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{s.sub}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {s.bullets.map(b => <li key={b} style={{ color: "var(--white-soft)", fontSize: "0.88rem" }}>✔ {b}</li>)}
                </ul>
                <button style={primaryBtn} onClick={() => router.push(s.href)}>{s.btn}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "80px 0" }}>
        <div className="page">
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={secTitle}>How DriveEasy Works</h2>
            <p style={secSub}>Simple, fast, and designed for Cameroonians</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            {[
              { step: "01", icon: "📝", title: "Create Account", desc: "Register in 2 minutes with just your name and email. No complicated forms." },
              { step: "02", icon: "🔍", title: "Browse & Filter", desc: "Search vehicles by type, price, or city. Filter by fuel type and daily rate in FCFA." },
              { step: "03", icon: "📅", title: "Pick Your Dates", desc: "Select your rental dates. DriveEasy instantly calculates your total FCFA price." },
              { step: "04", icon: "✅", title: "Confirm & Drive", desc: "Booking confirmed instantly. For sales, the vehicle is reserved in your name." },
            ].map((s) => (
              <div key={s.step} className="card" style={{ position: "relative", textAlign: "center" }}>
                <div style={{ position: "absolute", top: 14, right: 16, fontSize: "0.7rem", fontWeight: 800, color: "var(--navy-border)" }}>{s.step}</div>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{s.icon}</div>
                <h3 style={{ marginBottom: "8px", fontSize: "1rem" }}>{s.title}</h3>
                <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "80px 0", background: "var(--navy-mid)" }}>
        <div className="page" style={{ maxWidth: "740px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={secTitle}>Frequently Asked Questions</h2>
            <p style={secSub}>Everything you need to know before booking</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { q: "What currency are prices in?", a: "All prices are in CFA Franc (FCFA). No dollar conversions or hidden exchange fees." },
              { q: "Where can I pick up my rental?", a: "We serve Buea, Douala and Yaoundé. After booking, our team confirms pickup location and can arrange delivery." },
              { q: "Can I cancel a rental?", a: "Yes — cancel from your 'My Rentals' dashboard anytime. Refund terms depend on how far in advance you cancel." },
              { q: "How do I buy a vehicle?", a: "Browse 'Buy a Vehicle', choose your car, click 'Buy Now'. Sale is logged and our team contacts you for handover." },
              { q: "Is my account data safe?", a: "Yes. DriveEasy uses encrypted authentication. No payment card data is stored on our platform." },
            ].map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 0", borderTop: "1px solid var(--navy-border)" }}>
        <div className="page" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "12px" }}>Ready to Hit the Road in Cameroon?</h2>
          <p style={{ color: "var(--white-muted)", marginBottom: "28px" }}>Join DriveEasy — Buea&apos;s smartest way to rent or buy a vehicle.</p>
          <button style={primaryBtn} onClick={() => router.push("/register")}>Get Started — It&apos;s Free</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "var(--navy)", borderTop: "1px solid var(--navy-border)", padding: "40px 0 24px" }}>
        <div className="page">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 900 }}><span style={{ color: "var(--red)" }}>Drive</span>Easy</div>
            <div style={{ display: "flex", gap: "24px" }}>
              {[["Rent", "/rent"], ["Buy", "/sales"], ["Login", "/login"], ["Register", "/register"]].map(([l, h]) => (
                <Link key={l} href={h} style={{ color: "var(--white-muted)", fontSize: "0.85rem" }}>{l}</Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--navy-border)", paddingTop: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", margin: 0 }}>© 2026 DriveEasy · Buea, Cameroon</p>
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
    <div style={{ background: "var(--navy)", border: `1px solid ${open ? "rgba(230,57,70,0.4)" : "var(--navy-border)"}`, borderRadius: "12px", overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: "transparent", border: "none", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", color: "var(--white)", textAlign: "left", fontWeight: 600, fontSize: "0.92rem" }}>
        {q}
        <span style={{ color: "var(--red)", fontSize: "1.2rem", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>+</span>
      </button>
      {open && <div style={{ padding: "0 20px 16px", color: "var(--white-muted)", fontSize: "0.88rem", lineHeight: 1.7 }}>{a}</div>}
    </div>
  );
}

/* Styles */
const anchorNav: React.CSSProperties = { display: "flex", alignItems: "center", gap: "4px", padding: "0 24px", background: "var(--navy-mid)", borderBottom: "1px solid var(--navy-border)", overflowX: "auto" };
const anchorLink: React.CSSProperties = { padding: "12px 16px", color: "var(--white-muted)", fontSize: "0.85rem", fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" };
const anchorCta: React.CSSProperties = { marginLeft: "auto", padding: "8px 18px", background: "var(--red)", color: "var(--white)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" };
const heroSection: React.CSSProperties = { position: "relative", minHeight: "88vh", display: "flex", alignItems: "center", overflow: "hidden" };
const heroBg: React.CSSProperties = { position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 50% at 20% 40%, rgba(230,57,70,0.12) 0%, transparent 60%)", zIndex: 0 };
const heroInner: React.CSSProperties = { position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" };
const badge: React.CSSProperties = { display: "inline-block", background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.3)", color: "var(--red)", padding: "7px 16px", borderRadius: "100px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "18px" };
const heroTitle: React.CSSProperties = { fontSize: "clamp(2.2rem, 5.5vw, 4rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.04em", marginBottom: "18px" };
const heroSub: React.CSSProperties = { fontSize: "1.05rem", color: "var(--white-muted)", maxWidth: "560px", marginBottom: "30px", lineHeight: 1.8 };
const primaryBtn: React.CSSProperties = { padding: "13px 28px", background: "var(--red)", color: "var(--white)", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" };
const outlineBtn: React.CSSProperties = { padding: "13px 28px", background: "transparent", color: "var(--white)", border: "1.5px solid var(--navy-border)", borderRadius: "10px", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" };
const secTitle: React.CSSProperties = { fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, marginBottom: "8px", color: "var(--white)" };
const secSub: React.CSSProperties = { color: "var(--white-muted)", fontSize: "0.95rem", margin: 0 };
const svcCard: React.CSSProperties = { background: "var(--navy)", border: "1px solid var(--navy-border)", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "16px" };