"use client";

import { useState } from "react";
import { getUser } from "@/lib/user";
import { useRouter } from "next/navigation";

export default function VehicleCard({ vehicle }: any) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const router = useRouter();

  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 🔥 PREVIEW PRICE
  const handlePreview = async () => {
    if (!startDate || !endDate) {
      alert("Select dates first");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("https://localhost:7256/api/rentals/preview-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId: vehicle.vehicleId,
          startDate,
          endDate,
        }),
      });

      const data = await res.json();
      setPricing(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // 🚗 RENT
  // 📅 RESERVE VEHICLE
const handleReserve = async () => {
  const user = getUser();

  if (!user) {
    alert("Login required");
    return;
  }

  if (!startDate || !endDate) {
    alert("Select dates first");
    return;
  }

  try {
    await fetch("https://localhost:7256/api/rentals/reserve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vehicleId: vehicle.vehicleId,
        customerId: user.customerId,
        startDate,
        endDate,
      }),
    });

    alert("Vehicle reserved successfully!");
  } catch (err) {
    console.error(err);
    alert("Reservation failed");
  }
};
  const handleRent = async () => {
    const user = getUser();

    if (!user) {
      alert("Login required");
      return;
    }

    if (!pricing) {
      alert("Preview price first");
      return;
    }

    try {
      await fetch("https://localhost:7256/api/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId: vehicle.vehicleId,
          customerId: user.customerId,
          startDate,
          endDate,
        }),
      });

      alert("Rental successful!");
    } catch (err) {
      console.error(err);
      alert("Rental failed");
    }
  };

  return (
    <div style={card}>
      <h3>
        {vehicle.make} {vehicle.model}
      </h3>

      <p>Base Rate: ${vehicle.dailyRate}</p>

      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        style={input}
      />

      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        style={input}
      />

      <button onClick={handlePreview} style={btn}>
        Preview Price
      </button>

      {loading && <p>Calculating...</p>}

      {/* 🔥 PRICE BREAKDOWN */}
      {pricing && (
        <div style={pricingBox}>
          <h4>Price Breakdown</h4>

          <p>Base Rate: ${pricing.baseRate}</p>
          <p>Demand: x{pricing.demandMultiplier}</p>
          <p>Weekend: x{pricing.weekendMultiplier}</p>
          <p>Rules: x{pricing.rulesMultiplier}</p>

          <hr />

          <p>Daily Rate: ${pricing.dailyRate}</p>
          <p>Days: {pricing.days}</p>
          <p><strong>Total: ${pricing.total}</strong></p>
        </div>
      )}

    <button
  onClick={() => {
    if (!startDate || !endDate) {
      alert("Select dates first");
      return;
    }

    // 🔥 send dates via query (important)
    router.push(
      `/checkout/${vehicle.vehicleId}?start=${startDate}&end=${endDate}`
    );
  }}
  style={{ ...btn, marginTop: "10px" }}
>
  Proceed to Payment
</button>
<button
  onClick={handleReserve}
  style={{
    ...btn,
    marginTop: "8px",
    background: "#16a34a",
  }}
>
  Reserve Vehicle
</button>
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #333",
  padding: "15px",
  borderRadius: "8px",
};

const input: React.CSSProperties = {
  width: "100%",
  marginBottom: "8px",
  padding: "6px",
};

const btn: React.CSSProperties = {
  padding: "8px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

const pricingBox: React.CSSProperties = {
  marginTop: "10px",
  padding: "10px",
  background: "#111",
  border: "1px solid #333",
};