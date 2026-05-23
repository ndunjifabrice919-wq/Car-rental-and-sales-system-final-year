import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import { AuthProvider } from "@/context/AuthContext";
import { LangProvider } from "@/context/LangContext";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DriveEasy — Car Rental & Sales | Buea, Cameroon",
  description:
    "Rent or buy quality vehicles in Buea, Douala and Yaoundé. FCFA pricing, instant booking, Orange Money & MTN MoMo payments.",
  keywords: "car rental cameroon, buy car cameroon, rent car buea, voiture location cameroun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <LangProvider>
          <AuthProvider>
            <Navbar />
            <main>{children}</main>

            {/* Site Footer */}
            <footer style={{
              borderTop: "1px solid var(--navy-border)",
              background: "var(--navy-mid)",
              padding: "48px 24px 28px",
              marginTop: "60px",
            }}>
              <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "36px", marginBottom: "40px" }}>

                  {/* Brand */}
                  <div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "12px", letterSpacing: "-0.03em" }}>
                      <span style={{ color: "var(--red)" }}>Drive</span>Easy
                    </div>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.83rem", lineHeight: 1.7, margin: "0 0 16px" }}>
                      Cameroon&apos;s premier vehicle rental and sales platform. Based in Buea, serving the nation.
                    </p>
                    <a href="https://wa.me/237672221937" target="_blank" rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#25d366", color: "#fff", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "0.8rem", fontWeight: 700 }}>
                      💬 WhatsApp Us
                    </a>
                  </div>

                  {/* Platform */}
                  <div>
                    <p style={{ fontWeight: 800, marginBottom: "14px", fontSize: "0.88rem", color: "var(--white-soft)" }}>Platform</p>
                    {[
                      { href: "/rent", label: "Rent a Vehicle" },
                      { href: "/sales", label: "Buy a Vehicle" },
                      { href: "/login", label: "Sign In" },
                      { href: "/register", label: "Create Account" },
                    ].map(l => (
                      <Link key={l.href} href={l.href} style={{ display: "block", color: "var(--white-muted)", fontSize: "0.83rem", marginBottom: "8px", textDecoration: "none" }}>
                        {l.label}
                      </Link>
                    ))}
                  </div>

                  {/* Company */}
                  <div>
                    <p style={{ fontWeight: 800, marginBottom: "14px", fontSize: "0.88rem", color: "var(--white-soft)" }}>Company</p>
                    {[
                      { href: "/about", label: "About Us" },
                      { href: "/contact", label: "Contact" },
                      { href: "/terms", label: "Terms of Service" },
                      { href: "/privacy", label: "Privacy Policy" },
                    ].map(l => (
                      <Link key={l.href} href={l.href} style={{ display: "block", color: "var(--white-muted)", fontSize: "0.83rem", marginBottom: "8px", textDecoration: "none" }}>
                        {l.label}
                      </Link>
                    ))}
                  </div>

                  {/* Contact */}
                  <div>
                    <p style={{ fontWeight: 800, marginBottom: "14px", fontSize: "0.88rem", color: "var(--white-soft)" }}>Contact</p>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.83rem", marginBottom: "8px" }}>📍 Buea, South West, Cameroon</p>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.83rem", marginBottom: "8px" }}>✉️ support@driveeasy.cm</p>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.83rem", marginBottom: "8px" }}>📞 +237 XXX XXX XXX</p>
                    <p style={{ color: "var(--white-muted)", fontSize: "0.83rem" }}>🕐 Mon–Sat, 8am–8pm</p>
                  </div>
                </div>

                {/* Bottom bar */}
                <div style={{ borderTop: "1px solid var(--navy-border)", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <p style={{ color: "var(--white-muted)", fontSize: "0.78rem", margin: 0 }}>
                    © {new Date().getFullYear()} DriveEasy. All rights reserved. Made with ❤️ in Buea, Cameroon.
                  </p>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <Link href="/terms" style={{ color: "var(--white-muted)", fontSize: "0.75rem", textDecoration: "none" }}>Terms</Link>
                    <Link href="/privacy" style={{ color: "var(--white-muted)", fontSize: "0.75rem", textDecoration: "none" }}>Privacy</Link>
                    <Link href="/contact" style={{ color: "var(--white-muted)", fontSize: "0.75rem", textDecoration: "none" }}>Contact</Link>
                  </div>
                </div>
              </div>
            </footer>

            {/* Floating WhatsApp button */}
            <WhatsAppButton />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}