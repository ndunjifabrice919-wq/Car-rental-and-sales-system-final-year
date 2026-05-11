"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px" }}>
      <div>
        <p style={{ fontSize: "6rem", fontWeight: 900, color: "var(--red)", margin: "0 0 8px", lineHeight: 1 }}>404</p>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "12px" }}>Page Not Found</h1>
        <p style={{ color: "var(--white-muted)", maxWidth: "360px", margin: "0 auto 32px" }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => router.back()} style={{ padding: "12px 24px", background: "var(--navy-light)", color: "var(--white)", border: "1.5px solid var(--navy-border)", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>
            ← Go Back
          </button>
          <button onClick={() => router.push("/")} style={{ padding: "12px 24px", background: "var(--red)", color: "var(--white)", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
