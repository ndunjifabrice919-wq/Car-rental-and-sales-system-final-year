"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatFCFA } from "@/lib/currency";
import { CITIES_BY_REGION } from "@/lib/locations";
import FavouriteButton from "@/components/ui/FavouriteButton";

type VehicleTab = "all" | "rental" | "sale" | "both";

function VehicleShimmer() {
  return (
    <div style={{ borderRadius: "20px", overflow: "hidden", background: "var(--navy-mid)", border: "1px solid var(--navy-border)" }}>
      <div className="shimmer" style={{ height: "220px" }} />
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="shimmer" style={{ height: "20px", width: "65%", borderRadius: "6px" }} />
        <div className="shimmer" style={{ height: "14px", width: "45%", borderRadius: "6px" }} />
        <div style={{ display: "flex", gap: "6px" }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: "26px", width: "64px", borderRadius: "20px" }} />)}
        </div>
        <div className="shimmer" style={{ height: "46px", borderRadius: "10px", marginTop: "6px" }} />
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === "both") return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      background: "linear-gradient(135deg, rgba(230,57,70,0.2), rgba(96,165,250,0.2))",
      border: "1px solid rgba(230,57,70,0.35)", color: "#f0a0a5",
      padding: "3px 10px", borderRadius: "100px", fontSize: "0.67rem", fontWeight: 800,
      letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      🔑 Rent & Buy
    </span>
  );
  if (type === "rental") return (
    <span style={{
      background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399",
      padding: "3px 10px", borderRadius: "100px", fontSize: "0.67rem", fontWeight: 800,
      letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      🔑 Rent Only
    </span>
  );
  return (
    <span style={{
      background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa",
      padding: "3px 10px", borderRadius: "100px", fontSize: "0.67rem", fontWeight: 800,
      letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      🏷️ For Sale
    </span>
  );
}

function VehicleCard({ vehicle: v }: { vehicle: any }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const priceLabel = formatFCFA(v.sale_price);

  return (
    <div
      className="card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/vehicles/${v.id}`)}
      style={{
        display: "flex", flexDirection: "column", overflow: "hidden", padding: 0,
        cursor: "pointer", transition: "transform 0.25s, border-color 0.25s, box-shadow 0.25s",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        borderColor: hovered ? "rgba(230,57,70,0.45)" : undefined,
        boxShadow: hovered ? "0 12px 40px rgba(230,57,70,0.12)" : undefined,
      }}
    >
      {/* Image */}
      {v.image_url ? (
        <div style={{
          position: "relative", height: "220px", overflow: "hidden",
          borderRadius: "20px 20px 0 0", background: "var(--navy)",
        }}>
          <img
            src={v.image_url}
            alt={`${v.make} ${v.model}`}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              transition: "transform 0.5s ease",
              transform: hovered ? "scale(1.06)" : "scale(1)",
            }}
          />
          {/* Gradient overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(13,27,42,0.9) 0%, rgba(13,27,42,0.1) 55%, transparent 100%)",
            pointerEvents: "none",
          }} />
          {/* Price badge */}
          <span style={{
            position: "absolute", bottom: 14, left: 14,
            background: "rgba(230,57,70,0.95)", color: "#fff",
            padding: "5px 13px", borderRadius: "100px",
            fontSize: "0.83rem", fontWeight: 800, backdropFilter: "blur(6px)",
          }}>
            {priceLabel}
          </span>
          {/* Top right controls */}
          <div style={{
            position: "absolute", top: 10, right: 10,
            display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end",
          }}>
            <div onClick={e => e.stopPropagation()}>
              <FavouriteButton vehicleId={v.id} size="sm" />
            </div>
            {v.location && (
              <span style={{
                background: "rgba(13,27,42,0.85)", backdropFilter: "blur(4px)",
                color: "var(--white-muted)", padding: "3px 10px", borderRadius: "100px",
                fontSize: "0.68rem", fontWeight: 600,
              }}>
                📍 {v.location}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          height: "220px", borderRadius: "20px 20px 0 0",
          background: "linear-gradient(135deg, var(--navy-light) 0%, var(--navy) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "4rem", opacity: 0.35, position: "relative",
        }}>
          🚗
        </div>
      )}

      {/* Body */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
        {/* Title */}
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "3px" }}>{v.make} {v.model}</h3>
          <p style={{ color: "var(--white-muted)", fontSize: "0.82rem", margin: 0 }}>
            {v.year} · {v.transmission} · {v.fuel_type}
          </p>
        </div>

        {/* Spec pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            v.color && `🎨 ${v.color}`,
            v.seats && `💺 ${v.seats} seats`,
            v.mileage && `⏱ ${v.mileage.toLocaleString()} km`,
          ].filter(Boolean).map(s => (
            <span key={s!} className="spec-pill">{s}</span>
          ))}
        </div>

        {/* Description preview */}
        {v.description && (
          <p style={{
            color: "var(--white-muted)", fontSize: "0.82rem", margin: 0,
            lineHeight: 1.6, display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {v.description}
          </p>
        )}

        {/* CTA */}
        <div style={{ marginTop: "auto" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--navy)", borderRadius: "10px", padding: "12px 16px",
            cursor: "pointer",
            transition: "background 0.2s",
          }}>
            <span style={{ fontSize: "0.85rem", color: "var(--white-soft)", fontWeight: 600 }}>View Details</span>
            <span style={{
              color: "var(--red)", fontSize: "1.1rem",
              transform: hovered ? "translateX(4px)" : "translateX(0)",
              transition: "transform 0.2s",
            }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const TABS: { key: VehicleTab; label: string; icon: string }[] = [
  { key: "all", label: "All Vehicles", icon: "🚙" },
  { key: "rental", label: "For Rent", icon: "🔑" },
  { key: "sale", label: "For Sale", icon: "🏷️" },
  { key: "both", label: "Rent & Buy", icon: "⭐" },
];

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<VehicleTab>("sale");
  const [search, setSearch] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [transFilter, setTransFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      loadVehicles();
    });

    const channel = supabase.channel("realtime:vehicles-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => loadVehicles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const loadVehicles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false });
    setVehicles(data || []);
    setLoading(false);
  };

  const tabCounts = useMemo(() => {
    const all = vehicles.length;
    const rental = vehicles.filter(v => v.type === "rental" || v.type === "both").length;
    const sale = vehicles.filter(v => v.type === "sale" || v.type === "both").length;
    const both = vehicles.filter(v => v.type === "both").length;
    return { all, rental, sale, both };
  }, [vehicles]);

  const filtered = useMemo(() => {
    let list = vehicles.filter(v => {
      // Tab filter
      if (tab === "rental" && v.type !== "rental" && v.type !== "both") return false;
      if (tab === "sale" && v.type !== "sale" && v.type !== "both") return false;
      if (tab === "both" && v.type !== "both") return false;

      const matchSearch = !search || `${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase());
      const matchFuel = !fuelFilter || v.fuel_type === fuelFilter;
      const matchTrans = !transFilter || v.transmission === transFilter;
      const matchCity = !cityFilter || v.location === cityFilter;
      return matchSearch && matchFuel && matchTrans && matchCity;
    });

    if (sortBy === "price-asc") {
      list = [...list].sort((a, b) => {
        const pa = a.daily_rate || a.sale_price || 0;
        const pb = b.daily_rate || b.sale_price || 0;
        return pa - pb;
      });
    } else if (sortBy === "price-desc") {
      list = [...list].sort((a, b) => {
        const pa = a.daily_rate || a.sale_price || 0;
        const pb = b.daily_rate || b.sale_price || 0;
        return pb - pa;
      });
    }
    return list;
  }, [vehicles, tab, search, fuelFilter, transFilter, cityFilter, sortBy]);

  const hasActiveFilters = !!(search || fuelFilter || transFilter || cityFilter);
  const clearFilters = () => { setSearch(""); setFuelFilter(""); setTransFilter(""); setCityFilter(""); };

  return (
    <div className="page">
      {/* Hero Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(230,57,70,0.08) 0%, transparent 60%)",
        border: "1px solid var(--navy-border)", borderRadius: "20px",
        padding: "40px 36px", marginBottom: "32px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: "220px", height: "220px",
          borderRadius: "50%", background: "radial-gradient(circle, rgba(230,57,70,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="section-label" style={{ marginBottom: "14px" }}>🚗 DriveEasy Fleet</div>
        <h1 className="section-title" style={{ fontSize: "2.2rem", marginBottom: "10px" }}>
          Available Vehicles
        </h1>
        <p className="section-subtitle" style={{ margin: 0, maxWidth: "560px" }}>
          Browse our complete fleet of high-quality vehicles for sale. Real-time availability,
          FCFA pricing and mobile money checkout.
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "20px", marginTop: "24px", flexWrap: "wrap" }}>
          {[
            { label: "Vehicles Available", value: vehicles.length, icon: "🚙" },
            { label: "Pure 'Buy Now' Deals", value: filtered.length, icon: "🏷️" },
          ].map(s => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--navy-border)",
              borderRadius: "12px", padding: "14px 20px", display: "flex",
              alignItems: "center", gap: "10px",
            }}>
              <span style={{ fontSize: "1.4rem" }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "0.73rem", color: "var(--white-muted)", fontWeight: 600, marginTop: "2px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "20px" }}>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            background: filtersOpen ? "var(--red)" : "var(--navy-light)",
            border: "1px solid var(--navy-border)",
            color: filtersOpen ? "#fff" : "var(--white-muted)",
            padding: "9px 18px", fontSize: "0.85rem",
            display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          {filtersOpen ? "✕ Hide Filters" : "⚙️ Filters"}
          {hasActiveFilters && (
            <span style={{ background: "var(--red)", color: "#fff", borderRadius: "100px", padding: "1px 7px", fontSize: "0.7rem", fontWeight: 800 }}>
              ON
            </span>
          )}
        </button>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: "9px 14px", fontSize: "0.85rem", width: "auto" }}
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
        </select>
        {!loading && (
          <span style={{ color: "var(--white-muted)", fontSize: "0.84rem" }}>
            {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {/* Filter Panel */}
      {filtersOpen && (
        <div style={{
          background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
          borderRadius: "14px", padding: "22px", marginBottom: "24px",
          display: "flex", flexDirection: "column", gap: "14px",
          animation: "fadeInUp 0.2s ease",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--white-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                Search
              </label>
              <input
                placeholder="Make or model…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: "0.87rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--white-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                City
              </label>
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{ fontSize: "0.87rem" }}>
                <option value="">All Cities</option>
                {CITIES_BY_REGION.map(({ region, cities }) => (
                  <optgroup key={region} label={region}>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--white-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                Fuel Type
              </label>
              <select value={fuelFilter} onChange={e => setFuelFilter(e.target.value)} style={{ fontSize: "0.87rem" }}>
                <option value="">All Fuel Types</option>
                <option>Petrol</option>
                <option>Diesel</option>
                <option>Electric</option>
                <option>Hybrid</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--white-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                Transmission
              </label>
              <select value={transFilter} onChange={e => setTransFilter(e.target.value)} style={{ fontSize: "0.87rem" }}>
                <option value="">All Transmissions</option>
                <option>Automatic</option>
                <option>Manual</option>
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                alignSelf: "flex-start", background: "transparent",
                border: "1px solid var(--navy-border)", color: "var(--white-muted)",
                padding: "8px 16px", fontSize: "0.82rem",
              }}
            >
              ✕ Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Vehicle Grid */}
      {loading ? (
        <div className="grid-3">
          {[1, 2, 3, 4, 5, 6].map(i => <VehicleShimmer key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🚗</div>
          <h3>No vehicles found</h3>
          <p style={{ marginBottom: "20px" }}>
            {hasActiveFilters ? "Try adjusting your filters or clearing them" : "No vehicles are currently available — check back soon!"}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ padding: "10px 28px" }}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(v => <VehicleCard key={v.id} vehicle={v} />)}
        </div>
      )}

      {/* Bottom CTA Strip */}
      {!loading && filtered.length > 0 && (
        <div style={{
          marginTop: "48px", background: "var(--navy-mid)",
          border: "1px solid var(--navy-border)", borderRadius: "16px",
          padding: "28px 32px", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: "16px",
        }}>
          <div>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--white)", margin: "0 0 4px" }}>
              💬 Need help choosing the right vehicle?
            </p>
            <p style={{ color: "var(--white-muted)", fontSize: "0.85rem", margin: 0 }}>
              Our team is available 24/7 via WhatsApp or email.
            </p>
          </div>
          <Link href="/contact" style={{
            background: "var(--red)", color: "#fff", padding: "12px 24px",
            borderRadius: "10px", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem",
          }}>
            Contact Us
          </Link>
        </div>
      )}
    </div>
  );
}
