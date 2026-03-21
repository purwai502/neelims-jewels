"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard",    href: "/dashboard",    icon: "◈", ownerOnly: false, staffHidden: false },
  { label: "Gold Rates",   href: "/gold-rates",   icon: "✦", ownerOnly: false, staffHidden: false },
  { label: "Clients",      href: "/clients",      icon: "◎", ownerOnly: false, staffHidden: false },
  { label: "Vendors",      href: "/vendors",      icon: "◑", ownerOnly: true,  staffHidden: true  },
  { label: "Orders",       href: "/orders",       icon: "❖", ownerOnly: false, staffHidden: false },
  { label: "Products",     href: "/products",     icon: "◇", ownerOnly: false, staffHidden: false },
  { label: "Transactions", href: "/transactions", icon: "⟁", ownerOnly: false, staffHidden: true  },
  { label: "Payments",     href: "/payments",     icon: "◈", ownerOnly: false, staffHidden: true  },
  { label: "Buybacks",     href: "/buyback",      icon: "↺", ownerOnly: false, staffHidden: false },
  { label: "Staff",        href: "/staff",        icon: "◉", ownerOnly: false, staffHidden: true  },
  { label: "Reports",      href: "/reports",      icon: "▦", ownerOnly: false, staffHidden: true  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [dark, setDark] = useState(false);
  const [role, setRole] = useState("");

  useEffect(() => {
    setRole(localStorage.getItem("role") || "");
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (dark) html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", "dark");
    setDark(!dark);
  };

  const visibleItems = navItems.filter(item => {
    if (item.ownerOnly && role !== "OWNER") return false;
    if (item.staffHidden && role === "STAFF") return false;
    return true;
  });

  return (
    <aside style={{
      width: "260px",
      minHeight: "100vh",
      background: "var(--bg-sidebar)",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 100,
      borderRight: "1px solid rgba(201,168,76,0.2)",
    }}>

      {/* Top ornament line */}
      <div style={{
        height: "3px",
        background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
      }} />

      {/* Logo */}
      <div style={{
        padding: "36px 28px 28px",
        position: "relative",
      }}>
        <span style={{ position: "absolute", top: "20px", left: "20px", color: "var(--gold)", fontSize: "8px", opacity: 0.5 }}>✦</span>
        <span style={{ position: "absolute", top: "20px", right: "20px", color: "var(--gold)", fontSize: "8px", opacity: 0.5 }}>✦</span>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "26px", fontWeight: 700,
          color: "var(--gold)", letterSpacing: "0.04em",
          lineHeight: 1.1, fontStyle: "italic",
        }}>Neelima</h1>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "26px", fontWeight: 400,
          color: "var(--gold-light)", letterSpacing: "0.1em",
          lineHeight: 1.1, marginBottom: "10px",
        }}>Jewels</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, rgba(201,168,76,0.4))" }} />
          <span style={{ color: "var(--gold)", fontSize: "8px" }}>✦</span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, rgba(201,168,76,0.4))" }} />
        </div>

        <p style={{
          fontFamily: "'Didact Gothic', sans-serif",
          fontSize: "9px", color: "rgba(201,168,76,0.45)",
          letterSpacing: "0.3em", textTransform: "uppercase",
          textAlign: "center", marginTop: "6px",
        }}>Studio Management</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 16px", overflowY: "auto" }}>
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "11px 16px", marginBottom: "2px",
                background: active ? "rgba(201,168,76,0.1)" : "transparent",
                borderLeft: active ? "2px solid var(--gold)" : "2px solid transparent",
                borderRight: active ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                color: active ? "var(--gold)" : "rgba(232,213,240,0.55)",
                fontSize: "12px", fontFamily: "'Didact Gothic', sans-serif",
                letterSpacing: "0.08em", textTransform: "uppercase",
                transition: "all 0.25s ease", cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLDivElement).style.color = "rgba(201,168,76,0.8)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLDivElement).style.color = "rgba(232,213,240,0.55)";
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }
              }}>
                <span style={{ fontSize: "14px", opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(201,168,76,0.15)", display: "flex", flexDirection: "column", gap: "8px" }}>
        {role === "OWNER" && (
          <button onClick={() => router.push("/users/new")} style={{
            width: "100%", padding: "10px",
            background: "transparent",
            border: "1px solid rgba(201,168,76,0.35)",
            color: "rgba(201,168,76,0.85)",
            fontFamily: "'Didact Gothic', sans-serif",
            fontSize: "10px", letterSpacing: "0.2em",
            textTransform: "uppercase", cursor: "pointer",
            transition: "all 0.3s ease",
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: "8px",
          }}>
            ◉  Add User
          </button>
        )}
        <button onClick={toggleTheme} style={{
          width: "100%", padding: "10px",
          background: "transparent",
          border: "1px solid rgba(201,168,76,0.2)",
          color: "rgba(201,168,76,0.6)",
          fontFamily: "'Didact Gothic', sans-serif",
          fontSize: "10px", letterSpacing: "0.2em",
          textTransform: "uppercase", cursor: "pointer",
          transition: "all 0.3s ease",
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: "8px",
        }}>
          {dark ? "☀  Light Mode" : "☾  Dark Mode"}
        </button>
      </div>

      {/* Bottom ornament line */}
      <div style={{
        height: "3px",
        background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
      }} />
    </aside>
  );
}