"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function WhatsAppButton() {
  const { profile } = useAuth();
  const [hovered, setHovered] = useState(false);
  const phone = "237672221937"; // DriveEasy WhatsApp
  const message = encodeURIComponent("Hello DriveEasy! I'd like to enquire about a vehicle.");

  // Hide for admins/owners — they manage the platform, not support customers
  if (profile?.role === "admin" || profile?.role === "owner") return null;

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "fixed",
        bottom: "28px",
        right: "28px",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "#25d366",
        color: "#fff",
        borderRadius: "50px",
        padding: hovered ? "14px 22px 14px 18px" : "16px",
        boxShadow: "0 8px 32px rgba(37,211,102,0.45)",
        textDecoration: "none",
        fontWeight: 700,
        fontSize: "0.9rem",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
      title="Chat with DriveEasy on WhatsApp"
    >
      {/* WhatsApp Icon */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.558 4.132 1.534 5.873L0 24l6.293-1.512A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.015-1.372l-.36-.214-3.732.897.934-3.617-.235-.373A9.818 9.818 0 0 1 2.182 12c0-5.421 4.397-9.818 9.818-9.818 5.421 0 9.818 4.397 9.818 9.818 0 5.421-4.397 9.818-9.818 9.818z"/>
      </svg>

      {/* Expandable label */}
      <span style={{
        maxWidth: hovered ? "120px" : "0px",
        opacity: hovered ? 1 : 0,
        overflow: "hidden",
        transition: "max-width 0.3s ease, opacity 0.2s ease",
      }}>
        Chat with us
      </span>
    </a>
  );
}
