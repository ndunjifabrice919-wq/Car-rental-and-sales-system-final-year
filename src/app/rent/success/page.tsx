"use client";

import Link from "next/link";

export default function SuccessPage() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <h1 style={{ fontSize: "32px", color: "#22c55e" }}>
        ✅ Rental Successful!
      </h1>

      <p>Your vehicle has been booked successfully.</p>

      <Link href="/rent">
        <button>Back to Vehicles</button>
      </Link>
    </div>
  );
}