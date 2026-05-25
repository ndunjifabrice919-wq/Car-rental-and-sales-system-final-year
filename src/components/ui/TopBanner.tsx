"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function TopBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    // Check if the user has dismissed the banner
    const dismissed = localStorage.getItem("hide_promo_banner_v1");
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("hide_promo_banner_v1", "true");
  };

  if (!isVisible) return null;

  return (
    <div style={{
      background: "linear-gradient(90deg, var(--red) 0%, #ff4d4d 100%)",
      color: "white",
      padding: "10px 40px",
      textAlign: "center",
      fontSize: "0.85rem",
      fontWeight: 600,
      position: "relative",
      zIndex: 100,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      boxShadow: "0 2px 10px rgba(230, 57, 70, 0.3)"
    }}>
      <span>🎉 Special Offer: Enjoy 10% off your first weekend rental! No code required.</span>
      <button 
        onClick={handleDismiss}
        style={{
          position: "absolute",
          right: "16px",
          background: "transparent",
          border: "none",
          color: "white",
          fontSize: "1.2rem",
          cursor: "pointer",
          opacity: 0.8,
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          transition: "opacity 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.8"}
        aria-label="Dismiss banner"
      >
        ✕
      </button>
    </div>
  );
}
