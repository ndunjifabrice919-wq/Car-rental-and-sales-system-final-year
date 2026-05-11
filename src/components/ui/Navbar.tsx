"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { lang, setLang, t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await signOut();
    setMenuOpen(false);
    router.push("/");
  };

  const userLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/rent", label: t("nav.rent") },
    { href: "/sales", label: t("nav.buy") },
    { href: "/rentals", label: t("nav.myRentals") },
    { href: "/sales/history", label: t("nav.myPurchases") },
    ...(profile?.role === "admin" || profile?.role === "owner"
      ? [{ href: "/admin", label: profile?.role === "owner" ? t("nav.owner") : t("nav.admin") }]
      : []),
  ];

  const guestLinks = [
    { href: "/", label: t("nav.home") },
  ];

  const links = user ? userLinks : guestLinks;
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const LangToggle = () => (
    <button
      onClick={() => setLang(lang === "en" ? "fr" : "en")}
      style={{
        padding: "5px 10px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 700,
        background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)",
        cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.2s",
      }}
      title={lang === "en" ? "Passer en français" : "Switch to English"}
    >
      {lang === "en" ? "🇫🇷 FR" : "🇬🇧 EN"}
    </button>
  );

  return (
    <>
      <nav style={{ ...navBase, boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.4)" : "none" }}>
        <div style={navInner}>
          {/* Logo */}
          <Link href="/" style={logoStyle} onClick={() => setMenuOpen(false)}>
            <span style={{ color: "var(--red)" }}>Drive</span>Easy
          </Link>

          {/* Desktop Links */}
          <div style={desktopLinks}>
            {links.map((link) => (
              <Link key={link.href} href={link.href}
                style={{ ...linkBase, color: isActive(link.href) ? "var(--white)" : "var(--white-muted)", background: isActive(link.href) ? "var(--navy-light)" : "transparent", ...(link.href === "/admin" ? { color: "var(--red)", background: "rgba(230,57,70,0.1)" } : {}) }}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth + Lang */}
          <div style={authArea}>
            <LangToggle />
            {user ? (
              <>
                <div style={avatarBadge} onClick={() => router.push("/profile")} title={t("nav.profile")}>
                  {(profile?.full_name || user.email || "?")[0].toUpperCase()}
                </div>
                <button onClick={() => router.push("/profile")} style={outlineBtn}>{t("nav.profile")}</button>
                <button onClick={handleLogout} style={redBtn}>{t("nav.logout")}</button>
              </>
            ) : (
              <>
                <Link href="/login" style={outlineBtnLink}>{t("nav.login")}</Link>
                <Link href="/register" style={redBtnLink}>{t("nav.getStarted")}</Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button style={hamburger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span style={bar(menuOpen, 0)} />
            <span style={bar(menuOpen, 1)} />
            <span style={bar(menuOpen, 2)} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={mobileMenu}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} style={{ ...mobileLinkBase, color: isActive(link.href) ? "var(--white)" : "var(--white-muted)", background: isActive(link.href) ? "var(--navy-light)" : "transparent" }}
              onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid var(--navy-border)", paddingTop: "12px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
              <LangToggle />
            </div>
            {user ? (
              <>
                <span style={{ color: "var(--white-muted)", fontSize: "0.82rem", padding: "4px 12px" }}>{user.email}</span>
                <button onClick={handleLogout} style={{ ...redBtn, width: "100%", textAlign: "left" }}>{t("nav.logout")}</button>
              </>
            ) : (
              <>
                <Link href="/login" style={{ ...outlineBtnLink, display: "block", textAlign: "center" }} onClick={() => setMenuOpen(false)}>{t("nav.login")}</Link>
                <Link href="/register" style={{ ...redBtnLink, display: "block", textAlign: "center" }} onClick={() => setMenuOpen(false)}>{t("nav.getStarted")}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Styles ── */
const navBase: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 1000,
  background: "rgba(13, 27, 42, 0.97)", backdropFilter: "blur(14px)",
  borderBottom: "1px solid var(--navy-border)", transition: "box-shadow 0.3s ease",
};
const navInner: React.CSSProperties = {
  maxWidth: "1200px", margin: "0 auto", padding: "0 24px", height: "68px",
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
};
const logoStyle: React.CSSProperties = {
  fontSize: "1.45rem", fontWeight: 900, letterSpacing: "-0.04em",
  color: "var(--white)", textDecoration: "none", flexShrink: 0,
};
const desktopLinks: React.CSSProperties = {
  display: "flex", gap: "4px", alignItems: "center", flex: 1,
  "@media (max-width: 768px)": { display: "none" } as any,
};
const linkBase: React.CSSProperties = {
  padding: "7px 14px", borderRadius: "8px", fontSize: "0.88rem",
  fontWeight: 500, transition: "color 0.2s, background 0.2s",
  textDecoration: "none", whiteSpace: "nowrap",
};
const authArea: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 };
const avatarBadge: React.CSSProperties = {
  width: "34px", height: "34px", borderRadius: "50%", background: "var(--red)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", flexShrink: 0,
};
const outlineBtn: React.CSSProperties = {
  padding: "8px 16px", background: "transparent", border: "1.5px solid var(--navy-border)",
  color: "var(--white)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
};
const redBtn: React.CSSProperties = {
  padding: "8px 18px", background: "var(--red)", border: "none",
  color: "var(--white)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
};
const outlineBtnLink: React.CSSProperties = {
  padding: "8px 16px", background: "transparent", border: "1.5px solid var(--navy-border)",
  color: "var(--white)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 500, textDecoration: "none",
};
const redBtnLink: React.CSSProperties = {
  padding: "8px 18px", background: "var(--red)", color: "var(--white)",
  borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
};
const hamburger: React.CSSProperties = {
  display: "none", flexDirection: "column", gap: "5px", background: "transparent",
  border: "none", cursor: "pointer", padding: "4px",
  "@media (max-width: 900px)": { display: "flex" } as any,
};
const bar = (open: boolean, i: number): React.CSSProperties => ({
  display: "block", width: "22px", height: "2px", background: "var(--white)",
  borderRadius: "2px", transition: "transform 0.25s, opacity 0.25s",
  transform: open ? (i === 0 ? "rotate(45deg) translate(5px, 5px)" : i === 2 ? "rotate(-45deg) translate(5px, -5px)" : "none") : "none",
  opacity: open && i === 1 ? 0 : 1,
});
const mobileMenu: React.CSSProperties = {
  position: "fixed", top: "68px", left: 0, right: 0, zIndex: 999,
  background: "var(--navy-mid)", borderBottom: "1px solid var(--navy-border)",
  padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: "4px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};
const mobileLinkBase: React.CSSProperties = {
  padding: "12px 16px", borderRadius: "10px", fontSize: "0.95rem",
  fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center",
};