"use client";

import { useState, useEffect } from "react";
import { formatFCFA } from "@/lib/currency";

type PayMethod = "orange" | "momo" | "card";

interface PaymentModalProps {
  amount: number;
  description: string;         // e.g. "Toyota Land Cruiser — 3 days rental"
  onSuccess: () => void;       // called after simulated or real payment succeeds
  onClose: () => void;
}

export default function PaymentModal({
  amount,
  description,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const [isLive, setIsLive] = useState(true); // Default to Live payment mode!
  const [method, setMethod] = useState<PayMethod>("orange");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [step, setStep] = useState<"select" | "processing" | "success">("select");
  const [error, setError] = useState("");

  // Fapshi Live states
  const [fapshiStep, setFapshiStep] = useState<"idle" | "initiating" | "polling" | "expired" | "failed">("idle");
  const [fapshiLink, setFapshiLink] = useState("");
  const [transId, setTransId] = useState("");

  /* ── Format card number with spaces ── */
  const formatCard = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  /* ── Format expiry MM/YY ── */
  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  /* ── Poll Fapshi payment status in background ── */
  useEffect(() => {
    if (!isLive || fapshiStep !== "polling" || !transId) return;

    let isActive = true;
    let pollInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/fapshi/status?transId=${transId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!isActive) return;

        if (data.status === "SUCCESSFUL") {
          clearInterval(pollInterval);
          setStep("success");
          setTimeout(() => {
            onSuccess();
          }, 3500);
        } else if (data.status === "FAILED") {
          clearInterval(pollInterval);
          setFapshiStep("failed");
          setError("The mobile money payment was cancelled or failed. Please try again.");
          setStep("select");
        } else if (data.status === "EXPIRED") {
          clearInterval(pollInterval);
          setFapshiStep("expired");
          setError("The mobile money payment request expired. Please try again.");
          setStep("select");
        }
      } catch (err) {
        console.error("Error polling Fapshi status:", err);
      }
    };

    // Check status immediately, then poll every 4 seconds
    checkStatus();
    pollInterval = setInterval(checkStatus, 4000);

    return () => {
      isActive = false;
      clearInterval(pollInterval);
    };
  }, [isLive, fapshiStep, transId, onSuccess]);

  /* ── Validate Demo Fields ── */
  const validateDemo = (): boolean => {
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

  /* ── Initiate Fapshi Real Payment ── */
  const handleLivePayment = async () => {
    setError("");
    setFapshiStep("initiating");
    setStep("processing");

    try {
      const res = await fetch("/api/fapshi/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          message: description || "DriveEasy Car Platform Payment",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to contact payment gateway.");
      }

      setFapshiLink(data.link);
      setTransId(data.transId);
      setFapshiStep("polling");

      // Attempt to open the secure checkout page in a new tab
      const newTab = window.open(data.link, "_blank");
      if (!newTab) {
        console.warn("Popup blocked! Customer must click manual reopen button.");
      }
    } catch (err: any) {
      console.error("Fapshi live pay error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
      setStep("select");
      setFapshiStep("idle");
    }
  };

  /* ── Submit Payment Button ── */
  const handlePay = () => {
    setError("");

    if (isLive) {
      if (method === "card") {
        setError("Live Card payment is not supported yet. Please select MTN MoMo or Orange Money, or toggle Demo Simulator above.");
        return;
      }
      handleLivePayment();
    } else {
      // Demo Simulation flow
      if (!validateDemo()) return;
      setStep("processing");
      // Simulate processing delay
      setTimeout(() => setStep("success"), 2500);
      // After success screen, call parent
      setTimeout(() => onSuccess(), 4500);
    }
  };

  const methodConfig = {
    orange: { label: "Orange Money", color: "#FF6200", bg: "rgba(255,98,0,0.1)", border: "rgba(255,98,0,0.35)", icon: "orange", hint: "Pay with Orange Money" },
    momo:   { label: "MTN MoMo",     color: "#FFCC00", bg: "rgba(255,204,0,0.1)", border: "rgba(255,204,0,0.35)", icon: "momo", hint: "Pay with MTN MoMo" },
    card:   { label: "Card Payment",  color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.35)", icon: "card", hint: "Visa / Mastercard accepted" },
  };

  return (
    <div style={overlay}>
      <div style={modal}>

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <div style={centreBox}>
            <div style={bigSpinner} />
            
            {isLive ? (
              <>
                <h3 style={{ marginTop: "24px", marginBottom: "8px" }}>
                  {fapshiStep === "initiating" ? "Securing Payment Gateway" : "Awaiting Confirmation"}
                </h3>
                <p style={{ color: "var(--white-muted)", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 16px" }}>
                  {fapshiStep === "initiating" 
                    ? "Connecting to Fapshi secure payment servers..." 
                    : "A secure checkout page has been opened in a new tab. Please complete the payment on your device."}
                </p>

                {fapshiStep === "polling" && fapshiLink && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", alignItems: "center" }}>
                    <a href={fapshiLink} target="_blank" rel="noopener noreferrer" style={accentButton}>
                      🔗 Open Checkout Page
                    </a>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: "4px 0 0" }}>
                      Popup blocked? Click the button above to pay.
                    </p>
                  </div>
                )}
                
                {error && <div className="alert alert-error" style={{ marginTop: "16px", width: "100%" }}>{error}</div>}

                <button onClick={() => { setStep("select"); setFapshiStep("idle"); setError(""); }} style={cancelButton}>
                  Cancel & Go Back
                </button>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: "24px", marginBottom: "8px" }}>Processing Simulation</h3>
                <p style={{ color: "var(--white-muted)", fontSize: "0.9rem" }}>
                  {method === "orange" ? "Connecting to Orange Money..." : method === "momo" ? "Connecting to MTN MoMo..." : "Verifying card details..."}
                </p>
                <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", marginTop: "8px" }}>Please wait, do not close this window.</p>
              </>
            )}
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
              A confirmation receipt and booking details have been registered. Redirecting...
            </p>
          </div>
        )}

        {/* ── PAYMENT FORM ── */}
        {step === "select" && (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.2rem" }}>Complete Payment</h2>
                <p style={{ color: "var(--white-muted)", margin: 0, fontSize: "0.85rem" }}>{description}</p>
              </div>
              <button onClick={onClose} style={{ background: "var(--navy-light)", color: "var(--white-muted)", border: "none", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>✕</button>
            </div>

            {/* Live / Demo Mode Switcher */}
            <div style={{ display: "flex", background: "var(--navy)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "4px", marginBottom: "20px" }}>
              <button onClick={() => { setIsLive(true); setError(""); }}
                style={{ flex: 1, background: isLive ? "var(--red)" : "transparent", color: isLive ? "var(--white)" : "var(--white-muted)", border: "none", borderRadius: "8px", padding: "8px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}>
                🟢 Real Payment (Fapshi)
              </button>
              <button onClick={() => { setIsLive(false); setError(""); }}
                style={{ flex: 1, background: !isLive ? "rgba(255,255,255,0.08)" : "transparent", color: !isLive ? "var(--white)" : "var(--white-muted)", border: "none", borderRadius: "8px", padding: "8px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}>
                🧪 Demo Simulator
              </button>
            </div>

            {/* Amount */}
            <div style={{ background: "var(--navy)", border: "1px solid var(--navy-border)", borderRadius: "12px", padding: "14px 20px", textAlign: "center", marginBottom: "20px" }}>
              <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Amount Due</p>
              <p style={{ color: "var(--red)", fontWeight: 900, fontSize: "1.8rem", margin: 0 }}>{formatFCFA(amount)}</p>
            </div>

            {/* Method Tabs */}
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--white-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Payment Method</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
              {(Object.entries(methodConfig) as [PayMethod, typeof methodConfig.orange][]).map(([key, cfg]) => (
                <button key={key} onClick={() => { setMethod(key); setError(""); }}
                  style={{ background: method === key ? cfg.bg : "var(--navy)", border: `1.5px solid ${method === key ? cfg.border : "var(--navy-border)"}`, borderRadius: "10px", padding: "12px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
                  <span style={{ fontSize: "1.4rem" }}>
                    {key === "orange" ? "🟠" : key === "momo" ? "🟡" : "💳"}
                  </span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: method === key ? cfg.color : "var(--white-muted)", textAlign: "center", lineHeight: 1.3 }}>{cfg.label}</span>
                </button>
              ))}
            </div>

            {/* Method-specific hint & fields */}
            <p style={{ fontSize: "0.82rem", color: "var(--white-muted)", marginBottom: "16px" }}>
              {isLive 
                ? (method === "card" ? "Cards are currently simulated only. Please use MoMo / Orange for real payments." : "🔐 Redirects to secure Fapshi gateway to pay using MTN MoMo or Orange Money.")
                : methodConfig[method].hint
              }
            </p>

            {/* Orange Money / MOMO fields (DEMO ONLY) */}
            {!isLive && (method === "orange" || method === "momo") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Phone Number (Demo)</label>
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
                  📱 Demo Simulation: Test the workflow without charging real money.
                </div>
              </div>
            )}

            {/* Card fields (DEMO ONLY) */}
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

                {!isLive && (
                  <>
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
                      🔒 Demo Mode Card Details are safely simulated.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Error */}
            {error && <div className="alert alert-error" style={{ marginTop: "16px" }}>{error}</div>}

            {/* Pay Button */}
            <button onClick={handlePay} style={{ width: "100%", marginTop: "20px", padding: "15px", fontSize: "1rem", fontWeight: 700, background: isLive ? "var(--red)" : (methodConfig[method].color === "#FFCC00" ? "#FFCC00" : "var(--red)"), color: (!isLive && method === "momo") ? "#000" : "var(--white)", borderRadius: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}>
              {isLive ? "💸" : methodConfig[method].icon === "card" ? "💳" : methodConfig[method].icon === "orange" ? "🟠" : "🟡"} {isLive ? "Pay Real" : "Simulate Pay"} {formatFCFA(amount)}
            </button>

            {/* Security note */}
            <p style={{ textAlign: "center", color: "var(--white-muted)", fontSize: "0.76rem", marginTop: "12px" }}>
              {isLive 
                ? "🔐 Real Cameroonian payments secured by Fapshi gateway · Buea, Cameroon" 
                : "🧪 Demo Simulation mode · Smart Car Rental System"
              }
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
const accentButton: React.CSSProperties = {
  background: "var(--red)",
  color: "var(--white)",
  padding: "12px 24px",
  borderRadius: "10px",
  fontWeight: 700,
  fontSize: "0.9rem",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
  transition: "all 0.2s",
  cursor: "pointer",
  width: "100%",
  maxWidth: "240px",
  boxShadow: "0 4px 12px rgba(230,57,70,0.3)",
};
const cancelButton: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--white-muted)",
  fontSize: "0.82rem",
  cursor: "pointer",
  marginTop: "24px",
  textDecoration: "underline",
  transition: "all 0.2s",
};
