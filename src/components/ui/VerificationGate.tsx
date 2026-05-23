"use client";

import { useRouter } from "next/navigation";

interface Props {
  missing: string[];   // list of what's missing e.g. ["Phone number", "ID document"]
  context: "rental" | "purchase";
  onClose: () => void;
}

export default function VerificationGate({ missing, context, onClose }: Props) {
  const router = useRouter();

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>

        {/* Icon */}
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(251,191,36,0.12)", border: "1.5px solid rgba(251,191,36,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 20px" }}>
          🛡️
        </div>

        <h2 style={{ textAlign: "center", fontSize: "1.25rem", fontWeight: 800, marginBottom: "8px" }}>
          Verification Required
        </h2>
        <p style={{ textAlign: "center", color: "var(--white-muted)", fontSize: "0.9rem", marginBottom: "24px", lineHeight: 1.7 }}>
          To complete your {context === "rental" ? "vehicle rental" : "vehicle purchase"}, DriveEasy requires identity verification.
          This keeps all customers safe and ensures accountability.
        </p>

        {/* Missing items */}
        <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fbbf24", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            ⚠️ Required — Please complete:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {missing.map(item => (
              <li key={item} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.88rem", color: "var(--white-soft)" }}>
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(230,57,70,0.2)", border: "1px solid rgba(230,57,70,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--red)", flexShrink: 0 }}>✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* What verification protects */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "28px" }}>
          {[
            "Your identity stays private — only admin staff can view documents",
            "Prevents fraud and protects all DriveEasy customers",
            "One-time setup — once verified, book instantly every time",
          ].map(point => (
            <div key={point} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "0.83rem", color: "var(--white-muted)" }}>
              <span style={{ color: "#34d399", flexShrink: 0, fontWeight: 800 }}>✓</span>
              {point}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
          <button
            onClick={() => router.push("/profile?tab=verification")}
            style={{ width: "100%", padding: "14px", fontWeight: 700, fontSize: "0.95rem" }}
          >
            Complete Verification →
          </button>
          <button
            onClick={onClose}
            style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid var(--navy-border)", color: "var(--white-muted)", fontWeight: 500, fontSize: "0.88rem" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 2000,
  background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "16px", animation: "fadeIn 0.2s ease",
};

const modal: React.CSSProperties = {
  background: "var(--navy-mid)",
  border: "1px solid var(--navy-border)",
  borderRadius: "20px",
  padding: "36px 32px",
  width: "100%",
  maxWidth: "440px",
  boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  animation: "fadeInUp 0.25s ease",
};
