"use client";

export default function AboutPage() {
  return (
    <div className="page" style={{ maxWidth: "900px", margin: "0 auto" }}>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, var(--navy-mid) 0%, rgba(230,57,70,0.08) 100%)",
        border: "1px solid var(--navy-border)", borderRadius: "24px",
        padding: "60px 48px", marginBottom: "40px", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "20px" }}>🚗</div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-0.03em" }}>
          About <span style={{ color: "var(--red)" }}>Drive</span>Easy
        </h1>
        <p style={{ color: "var(--white-muted)", fontSize: "1.05rem", lineHeight: 1.8, maxWidth: "600px", margin: "0 auto" }}>
          Cameroon&apos;s first fully digital car rental and sales platform — built in Buea, serving the nation.
        </p>
      </div>

      {/* Mission */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {[
          { icon: "🎯", title: "Our Mission", text: "To make vehicle access simple, transparent and affordable for every Cameroonian — whether renting for a trip or buying for life." },
          { icon: "🛡️", title: "Our Commitment", text: "Every vehicle is verified. Every transaction is secured with identity verification and email authentication before payment." },
          { icon: "🌍", title: "Our Vision", text: "Expand DriveEasy across Central Africa, connecting vehicle owners and users in a safe, trusted marketplace." },
        ].map(c => (
          <div key={c.title} style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "16px", padding: "28px 24px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "14px" }}>{c.icon}</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>{c.title}</h3>
            <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", lineHeight: 1.7, margin: 0 }}>{c.text}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "20px", padding: "36px", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 900, textAlign: "center", marginBottom: "28px" }}>DriveEasy by the Numbers</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "20px", textAlign: "center" }}>
          {[
            { value: "100+", label: "Vehicles Listed" },
            { value: "10+", label: "Cities Covered" },
            { value: "KYC", label: "Verified Platform" },
            { value: "24/7", label: "Support Available" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--red)", marginBottom: "6px" }}>{s.value}</div>
              <div style={{ color: "var(--white-muted)", fontSize: "0.82rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Why DriveEasy */}
      <div style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "20px" }}>Why Choose DriveEasy?</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { icon: "✅", title: "Verified Vehicles", text: "All vehicles on the platform are listed by verified owners and checked by our team." },
            { icon: "🔐", title: "Secure Payments", text: "Pay with MTN MoMo, Orange Money, or card. Identity verified before every transaction." },
            { icon: "📍", title: "Local Expertise", text: "Built by Cameroonians for Cameroonians. We understand local routes, prices, and needs." },
            { icon: "🚀", title: "Instant Booking", text: "Browse, select dates, verify your identity and book — all in under 5 minutes." },
            { icon: "💼", title: "For Businesses", text: "Fleet rental options available for businesses, NGOs, and government agencies." },
          ].map(f => (
            <div key={f.title} style={{ display: "flex", gap: "16px", alignItems: "flex-start", background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "16px 20px" }}>
              <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{f.icon}</span>
              <div>
                <p style={{ fontWeight: 700, margin: "0 0 4px", fontSize: "0.92rem" }}>{f.title}</p>
                <p style={{ color: "var(--white-muted)", margin: 0, fontSize: "0.85rem", lineHeight: 1.6 }}>{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <div style={{ background: "linear-gradient(135deg, rgba(230,57,70,0.12), rgba(230,57,70,0.04))", border: "1px solid rgba(230,57,70,0.2)", borderRadius: "20px", padding: "36px", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 900, margin: "0 0 12px" }}>Have Questions?</h2>
        <p style={{ color: "var(--white-muted)", fontSize: "0.9rem", margin: "0 0 24px", lineHeight: 1.7 }}>
          Our team is based in Buea, Cameroon and ready to help you find the perfect vehicle.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", background: "var(--red)", color: "#fff", borderRadius: "10px", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>
            📞 Contact Us
          </a>
          <a href="https://wa.me/237672221937" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", background: "#25d366", color: "#fff", borderRadius: "10px", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>
            💬 WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
