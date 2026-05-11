"use client";

import { useState } from "react";
import { formatFCFA } from "@/lib/currency";

type PayMethod = "orange" | "momo" | "card";

interface PaymentModalProps {
  amount: number;
  description: string;         // e.g. "Toyota Land Cruiser — 3 days rental"
  onSuccess: () => void;       // called after simulated payment succeeds
  onClose: () => void;
}

export default function PaymentModal({
  amount,
  description,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PayMethod>("orange");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [step, setStep] = useState<"select" | "processing" | "success">("select");
  const [error, setError] = useState("");

  /* ── Format card number with spaces ── */
  const formatCard = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  /* ── Format expiry MM/YY ── */
  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  /* ── Validate ── */
  const validate = (): boolean => {
    if (method === "orange" || method === "momo") {
      if (!phone || phone.replace(/\D/g, "").length < 9) {
        setError("Enter a valid Cameroonian phone number (9 digits).");
        return false;
      }
    } else {
      if (cardNumber.replace(/\s/g, "").length < 16) { setError("Enter a valid 16-digit card number."); return false; }
      if (expiry.length < 5) { setError("Enter a valid expiry date (MM/YY)."); return false; }
      if (cvv.length < 3) { setError("Enter a valid 3-digit CVV."); return false; }
      if (!cardName) { setError("Enter the cardholder name."); return false; }
    }
    return true;
  };

  /* ── Submit ── */
  const handlePay = () => {
    setError("");
    if (!validate()) return;
    setStep("processing");
    // Simulate processing delay
    setTimeout(() => setStep("success"), 2500);
    // After success screen, call parent
    setTimeout(() => onSuccess(), 4500);
  };

  const methodConfig = {
    orange: { label: "Orange Money", color: "#FF6200", bg: "rgba(255,98,0,0.1)", border: "rgba(255,98,0,0.35)", icon: "🟠", hint: "Enter your Orange Money number" },
    momo:   { label: "MTN MoMo",     color: "#FFCC00", bg: "rgba(255,204,0,0.1)", border: "rgba(255,204,0,0.35)", icon: "🟡", hint: "Enter your MTN MoMo number" },
    card:   { label: "Card Payment",  color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.35)", icon: "💳", hint: "Visa / Mastercard accepted" },
  };

  return (
    <div style={overlay}>
      <div style={modal}>

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <div style={centreBox}>
            <div style={bigSpinner} />
            <h3 style={{ marginTop: "24px", marginBottom: "8px" }}>Processing Payment</h3>
            <p style={{ color: "var(--white-muted)", fontSize: "0.9rem" }}>
              {method === "orange" ? "Connecting to Orange Money..." : method === "momo" ? "Connecting to MTN MoMo..." : "Verifying card details..."}
            </p>
            <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", marginTop: "8px" }}>Please wait, do not close this window.</p>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div style={centreBox}>
            <div style={successCircle}>✓</div>
            <h3 style={{ marginTop: "20px", marginBottom: "8px", color: "#34d399" }}>Payment Successful!</h3>
            <p style={{ color: "var(--white-muted)", fontSize: "0.9rem", marginBottom: "6px" }}>{description}</p>
            <p style={{ color: "var(--white)", fontWeight: 800, fontSize: "1.2rem" }}>{formatFCFA(amount)}</p>
            <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", marginTop: "16px" }}>
              A confirmation email has been sent to your inbox. Redirecting...
            </p>
          </div>
        )}

        {/* ── PAYMENT FORM ── */}
        {step === "select" && (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.2rem" }}>Complete Payment</h2>
                <p style={{ color: "var(--white-muted)", margin: 0, fontSize: "0.85rem" }}>{description}</p>
              </div>
              <button onClick={onClose} style={{ background: "var(--navy-light)", color: "var(--white-muted)", border: "none", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>✕</button>
            </div>

            {/* Amount */}
            <div style={{ background: "var(--navy)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "16px 20px", textAlign: "center", marginBottom: "24px" }}>
              <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Amount Due</p>
              <p style={{ color: "var(--red)", fontWeight: 900, fontSize: "2rem", margin: 0 }}>{formatFCFA(amount)}</p>
            </div>

            {/* Method Tabs */}
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--white-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Payment Method</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "24px" }}>
              {(Object.entries(methodConfig) as [PayMethod, typeof methodConfig.orange][]).map(([key, cfg]) => (
                <button key={key} onClick={() => { setMethod(key); setError(""); }}
                  style={{ background: method === key ? cfg.bg : "var(--navy)", border: `1.5px solid ${method === key ? cfg.border : "var(--navy-border)"}`, borderRadius: "10px", padding: "12px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
                  <span style={{ fontSize: "1.5rem" }}>{cfg.icon}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: method === key ? cfg.color : "var(--white-muted)", textAlign: "center", lineHeight: 1.3 }}>{cfg.label}</span>
                </button>
              ))}
            </div>

            {/* Method-specific hint */}
            <p style={{ fontSize: "0.82rem", color: "var(--white-muted)", marginBottom: "16px" }}>
              {methodConfig[method].hint}
            </p>

            {/* Orange Money / MOMO fields */}
            {(method === "orange" || method === "momo") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--white-muted)", fontSize: "0.9rem", userSelect: "none" }}>🇨🇲 +237</span>
                    <input
                      type="tel"
                      placeholder={method === "orange" ? "6XX XXX XXX" : "67X XXX XXX"}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ paddingLeft: "80px" }}
                      maxLength={13}
                    />
                  </div>
                </div>
                <div style={{ background: method === "orange" ? "rgba(255,98,0,0.06)" : "rgba(255,204,0,0.06)", border: `1px solid ${method === "orange" ? "rgba(255,98,0,0.2)" : "rgba(255,204,0,0.2)"}`, borderRadius: "10px", padding: "12px 16px", fontSize: "0.83rem", color: "var(--white-muted)", lineHeight: 1.6 }}>
                  {method === "orange"
                    ? "📱 You will receive a push notification on your Orange Money app to confirm this payment."
                    : "📱 You will receive a USSD prompt on your MTN line (*126#) to authorize this payment."}
                </div>
              </div>
            )}

            {/* Card fields */}
            {method === "card" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Card preview */}
                <div style={{ background: "linear-gradient(135deg, #1B2B3B 0%, #0D1B2A 100%)", border: "1px solid var(--navy-border)", borderRadius: "14px", padding: "20px 22px", marginBottom: "4px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(230,57,70,0.12)" }} />
                  <div style={{ position: "absolute", top: "10px", right: "10px", width: "60px", height: "60px", borderRadius: "50%", background: "rgba(230,57,70,0.08)" }} />
                  <p style={{ color: "var(--white-muted)", fontSize: "0.7rem", margin: "0 0 14px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Card Number</p>
                  <p style={{ fontSize: "1.1rem", fontWeight: 600, letterSpacing: "0.15em", margin: "0 0 16px", color: cardNumber ? "var(--white)" : "var(--navy-border)", fontFamily: "monospace" }}>
                    {cardNumber || "•••• •••• •••• ••••"}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ color: "var(--white-muted)", fontSize: "0.65rem", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cardholder</p>
                      <p style={{ fontWeight: 600, fontSize: "0.88rem", margin: 0, color: cardName ? "var(--white)" : "var(--navy-border)" }}>{cardName || "YOUR NAME"}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ color: "var(--white-muted)", fontSize: "0.65rem", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Expires</p>
                      <p style={{ fontWeight: 600, fontSize: "0.88rem", margin: 0, color: expiry ? "var(--white)" : "var(--navy-border)" }}>{expiry || "MM/YY"}</p>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input type="text" placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))} maxLength={19} inputMode="numeric" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cardholder Name</label>
                  <input type="text" placeholder="As it appears on your card" value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Expiry Date</label>
                    <input type="text" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} maxLength={5} inputMode="numeric" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input type="password" placeholder="•••" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} maxLength={3} inputMode="numeric" />
                  </div>
                </div>
                <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "10px", padding: "10px 14px", fontSize: "0.8rem", color: "var(--white-muted)" }}>
                  🔒 Your card details are encrypted and never stored on our servers.
                </div>
              </div>
            )}

            {/* Error */}
            {error && <div className="alert alert-error" style={{ marginTop: "16px" }}>{error}</div>}

            {/* Pay Button */}
            <button onClick={handlePay} style={{ width: "100%", marginTop: "20px", padding: "15px", fontSize: "1rem", fontWeight: 700, background: methodConfig[method].color === "#FFCC00" ? "#FFCC00" : "var(--red)", color: method === "momo" ? "#000" : "var(--white)", borderRadius: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {methodConfig[method].icon} Pay {formatFCFA(amount)}
            </button>

            {/* Security note */}
            <p style={{ textAlign: "center", color: "var(--white-muted)", fontSize: "0.76rem", marginTop: "12px" }}>
              🔐 Secured by DriveEasy · Buea, Cameroon · All transactions are simulated
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Styles ── */
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px",
};
const modal: React.CSSProperties = {
  background: "var(--navy-mid)", border: "1px solid var(--navy-border)", borderRadius: "20px",
  padding: "28px", width: "100%", maxWidth: "460px", maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
};
const centreBox: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  textAlign: "center", padding: "32px 16px",
};
const bigSpinner: React.CSSProperties = {
  width: "56px", height: "56px",
  border: "4px solid var(--navy-border)", borderTopColor: "var(--red)",
  borderRadius: "50%", animation: "spin 0.8s linear infinite",
};
const successCircle: React.CSSProperties = {
  width: "72px", height: "72px", borderRadius: "50%",
  background: "rgba(52,211,153,0.15)", border: "2px solid #34d399",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "2rem", color: "#34d399",
};
