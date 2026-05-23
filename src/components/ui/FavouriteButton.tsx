"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface FavouriteButtonProps {
  vehicleId: string;
  size?: "sm" | "md";
}

export default function FavouriteButton({ vehicleId, size = "md" }: FavouriteButtonProps) {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data } = await supabase.from("favourites")
        .select("id").eq("user_id", session.user.id).eq("vehicle_id", vehicleId).maybeSingle();
      setIsFav(!!data);
      setLoading(false);
    };
    check();
  }, [vehicleId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/login"; return; }

    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    if (isFav) {
      await supabase.from("favourites").delete().eq("user_id", session.user.id).eq("vehicle_id", vehicleId);
      setIsFav(false);
    } else {
      await supabase.from("favourites").insert({ user_id: session.user.id, vehicle_id: vehicleId });
      setIsFav(true);
    }
  };

  const btnSize = size === "sm" ? "32px" : "38px";
  const iconSize = size === "sm" ? "0.95rem" : "1.1rem";

  if (loading) return (
    <div style={{ width: btnSize, height: btnSize, borderRadius: "50%", background: "rgba(0,0,0,0.35)" }} />
  );

  return (
    <button
      onClick={toggle}
      title={isFav ? "Remove from favourites" : "Save to favourites"}
      style={{
        width: btnSize, height: btnSize,
        borderRadius: "50%",
        background: isFav ? "rgba(230,57,70,0.18)" : "rgba(0,0,0,0.45)",
        border: isFav ? "1.5px solid rgba(230,57,70,0.5)" : "1.5px solid rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        fontSize: iconSize,
        transition: "all 0.2s ease",
        transform: animating ? "scale(1.35)" : "scale(1)",
        backdropFilter: "blur(4px)",
        flexShrink: 0,
      }}
    >
      {isFav ? "❤️" : "🤍"}
    </button>
  );
}
