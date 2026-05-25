"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ConfirmedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Check if we have a session (confirmation was successful)
    const checkSession = async () => {
      // Give Supabase a moment to process the token from URL hash
      await new Promise(r => setTimeout(r, 800));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Create the profile now that the user is authenticated
        const { user } = session;
        if (user) {
          const rawMeta = user.user_metadata || {};
          const fullName = rawMeta.full_name || user.email?.split("@")[0] || "User";
          const phone = rawMeta.phone || "";
          
          await supabase.from("profiles").upsert({
            id: user.id,
            full_name: fullName,
            phone: phone,
            role: "customer"
          }, { onConflict: "id" });
        }

        // Sign out so they go through proper login
        await supabase.auth.signOut();
        setStatus("success");
      } else {
        // Try to get error from URL
        const error = searchParams.get("error_description") || searchParams.get("error");
        if (error) {
          setStatus("error");
        } else {
          // Assume success if they landed here from email link
          setStatus("success");
        }
      }
    };
    checkSession();
  }, [searchParams]);

  // Countdown to auto-redirect
  useEffect(() => {
    if (status !== "success") return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); router.push("/login"); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, router]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--navy)", padding: "20px",
    }}>
      <div style={{
        background: "var(--navy-mid)", border: "1px solid var(--navy-border)",
        borderRadius: "24px", padding: "52px 40px", maxWidth: "480px", width: "100%",
        textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", animation: "fadeInUp 0.4s ease",
      }}>
        {/* Logo */}
        <div style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "32px", letterSpacing: "-0.03em" }}>
          <span style={{ color: "var(--red)" }}>Drive</span>Easy
        </div>

        {status === "loading" && (
          <>
            <div className="spinner" style={{ margin: "0 auto 24px", width: "40px", height: "40px" }} />
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>Confirming your email…</h1>
            <p style={{ color: "var(--white-muted)", fontSize: "0.88rem" }}>Please wait a moment</p>
          </>
        )}

        {status === "success" && (
          <>
            {/* Success icon */}
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: "rgba(52,211,153,0.12)", border: "2px solid rgba(52,211,153,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2.2rem", margin: "0 auto 28px",
              animation: "fadeIn 0.4s ease 0.2s both",
            }}>
              ✅
            </div>

            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: "12px", color: "#34d399" }}>
              Email Confirmed!
            </h1>
            <p style={{ color: "var(--white-muted)", fontSize: "0.93rem", lineHeight: 1.7, marginBottom: "32px" }}>
              Your DriveEasy account is now active. You can sign in and start renting or buying vehicles across Cameroon.
            </p>

            {/* Features reminder */}
            <div style={{
              background: "var(--navy)", borderRadius: "14px", padding: "20px",
              marginBottom: "32px", display: "flex", flexDirection: "column", gap: "10px", textAlign: "left",
            }}>
              {[
                { icon: "🚗", text: "Rent vehicles across Cameroon" },
                { icon: "🏷️", text: "Browse vehicles for sale" },
                { icon: "💳", text: "Pay via MTN MoMo or Orange Money" },
                { icon: "🛡️", text: "Secure, verified platform" },
              ].map(f => (
                <div key={f.text} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem", color: "var(--white-soft)" }}>
                  <span>{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push("/login")}
              style={{ width: "100%", padding: "14px", fontWeight: 700, fontSize: "1rem", marginBottom: "12px" }}
            >
              Sign In to Your Account →
            </button>

            <p style={{ color: "var(--white-muted)", fontSize: "0.78rem" }}>
              Redirecting to login in <strong style={{ color: "var(--white-soft)" }}>{countdown}s</strong>…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: "rgba(230,57,70,0.1)", border: "2px solid rgba(230,57,70,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2.2rem", margin: "0 auto 28px",
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "12px" }}>Link Expired</h1>
            <p style={{ color: "var(--white-muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "28px" }}>
              This confirmation link has expired or already been used. Please register again or contact support.
            </p>
            <button onClick={() => router.push("/register")} style={{ width: "100%", padding: "14px", fontWeight: 700, marginBottom: "10px" }}>
              Register Again
            </button>
            <button onClick={() => router.push("/login")} style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid var(--navy-border)", color: "var(--white-muted)" }}>
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmedPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)" }}>
        <div className="spinner" style={{ width: "40px", height: "40px" }} />
      </div>
    }>
      <ConfirmedInner />
    </Suspense>
  );
}
