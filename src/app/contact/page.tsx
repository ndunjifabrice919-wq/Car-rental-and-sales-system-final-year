"use client";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="page" style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "36px" }}>
        <h1 className="section-title">Contact Us</h1>
        <p className="section-subtitle">We&apos;re based in Buea, Cameroon — reach out any time</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>

        {/* Contact Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { icon: "📍", title: "Office", lines: ["Buea, South West Region", "Cameroon"] },
            { icon: "📞", title: "Phone / WhatsApp", lines: ["+237672221937", "Mon–Sat, 8am–8pm"] },
            { icon: "✉️", title: "Email", lines: ["smartcarrentalscr.service@gmail.com", "Response within 24 hours"] },
          ].map(c => (
            <div key={c.title} style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "14px", padding: "20px 22px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{c.icon}</span>
              <div>
                <p style={{ fontWeight: 700, margin: "0 0 4px", fontSize: "0.9rem" }}>{c.title}</p>
                {c.lines.map(l => <p key={l} style={{ color: "var(--white-muted)", margin: 0, fontSize: "0.84rem" }}>{l}</p>)}
              </div>
            </div>
          ))}

          {/* WhatsApp CTA */}
          <a href="https://wa.me/237672221937" target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "14px", background: "#25d366", color: "#fff", borderRadius: "12px", fontWeight: 700, textDecoration: "none", fontSize: "0.95rem" }}>
            💬 Chat on WhatsApp
          </a>
        </div>

        {/* Contact Form */}
        <div style={{ background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "20px", padding: "32px 28px" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
              <h3 style={{ fontWeight: 900, margin: "0 0 10px", color: "#34d399" }}>Message Sent!</h3>
              <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", lineHeight: 1.7 }}>
                Thank you for reaching out. Our team will get back to you within 24 hours.
              </p>
              <button onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                style={{ marginTop: "20px", padding: "10px 24px", background: "transparent", border: "1px solid var(--navy-border)", color: "var(--white-muted)" }}>
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <h3 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: "1.1rem" }}>Send a Message</h3>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required>
                  <option value="">Select a subject</option>
                  <option>Rental Enquiry</option>
                  <option>Vehicle Purchase</option>
                  <option>Payment Issue</option>
                  <option>Account Problem</option>
                  <option>Partnership / Business</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Describe your question or issue…" required rows={4}
                  style={{ resize: "vertical", minHeight: "100px" }} />
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", fontWeight: 700 }}>
                {loading ? "Sending…" : "Send Message →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
