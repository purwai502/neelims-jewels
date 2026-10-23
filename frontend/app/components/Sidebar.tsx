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

export const SIDEBAR_WIDTH_EXPANDED  = 260;
export const SIDEBAR_WIDTH_COLLAPSED = 76;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("username");
    router.push("/login");
  };

  const visibleItems = navItems.filter(item => {
    if (item.ownerOnly && role !== "OWNER") return false;
    if (item.staffHidden && role === "STAFF") return false;
    return true;
  });

  const bottomButtonStyle = (borderColor: string, color: string): React.CSSProperties => ({
    width: "100%", padding: collapsed ? "12px 0" : "10px",
    background: "transparent",
    border: `1px solid ${borderColor}`,
    color,
    fontFamily: "'Didact Gothic', sans-serif",
    fontSize: "10px", letterSpacing: "0.2em",
    textTransform: "uppercase", cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex", alignItems: "center",
    justifyContent: "center", gap: "8px",
  });

  return (
    <aside style={{
      width: collapsed ? `${SIDEBAR_WIDTH_COLLAPSED}px` : `${SIDEBAR_WIDTH_EXPANDED}px`,
      height: "100vh",
      background: "var(--bg-sidebar)",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 100,
      borderRight: "1px solid rgba(201,168,76,0.2)",
      transition: "width 0.25s ease",
      overflow: "visible",
    }}>

      {/* Collapse/expand toggle — deliberately oversized and poking out past
          the sidebar's own edge into the main content, so its presence (and
          the fact the whole rail collapses) is unmissable rather than a
          subtle icon someone has to go looking for. */}
      <button
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          position: "absolute",
          top: "84px",
          right: "-16px",
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "var(--gold)",
          border: "2px solid var(--bg-sidebar)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,168,76,0.4)",
          color: "#1A0622",
          fontSize: "14px",
          fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          zIndex: 101,
          transition: "transform 0.2s ease, background 0.2s ease",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.12)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {collapsed ? "›" : "‹"}
      </button>

      {/* Top ornament line */}
      <div style={{
        height: "3px",
        background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
      }} />

      {/* Logo */}
      {collapsed ? (
        <div style={{ padding: "28px 0 20px", textAlign: "center" }}>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "26px", fontWeight: 700, fontStyle: "italic",
            color: "var(--gold)", lineHeight: 1, margin: 0,
          }}>N</p>
          <span style={{ color: "var(--gold)", fontSize: "8px", opacity: 0.6 }}>✦</span>
        </div>
      ) : (
        <div style={{ padding: "36px 28px 28px", position: "relative" }}>
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
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? "8px 10px" : "8px 16px", overflowY: "auto", overflowX: "hidden" }}>
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} title={collapsed ? item.label : undefined}>
              <div style={{
                display: "flex", alignItems: "center",
                gap: collapsed ? 0 : "14px",
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "12px 0" : "11px 16px",
                marginBottom: "2px",
                background: active ? "rgba(201,168,76,0.1)" : "transparent",
                borderLeft: active ? "2px solid var(--gold)" : "2px solid transparent",
                borderRight: active ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                color: active ? "var(--gold)" : "rgba(232,213,240,0.55)",
                fontSize: "12px", fontFamily: "'Didact Gothic', sans-serif",
                letterSpacing: "0.08em", textTransform: "uppercase",
                transition: "all 0.25s ease", cursor: "pointer",
                whiteSpace: "nowrap",
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
                {!collapsed && item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: collapsed ? "16px 10px" : "16px", borderTop: "1px solid rgba(201,168,76,0.15)", display: "flex", flexDirection: "column", gap: "8px" }}>
        {role === "OWNER" && (
          <button onClick={() => router.push("/users/new")} title={collapsed ? "Add User" : undefined}
            style={bottomButtonStyle("rgba(201,168,76,0.35)", "rgba(201,168,76,0.85)")}>
            ◉{!collapsed && <>&nbsp; Add User</>}
          </button>
        )}
        <button onClick={toggleTheme} title={collapsed ? (dark ? "Light Mode" : "Dark Mode") : undefined}
          style={bottomButtonStyle("rgba(201,168,76,0.2)", "rgba(201,168,76,0.6)")}>
          {dark ? "☀" : "☾"}{!collapsed && <>&nbsp; {dark ? "Light Mode" : "Dark Mode"}</>}
        </button>
        <button onClick={handleLogout} title={collapsed ? "Log Out" : undefined}
          style={bottomButtonStyle("rgba(224,92,122,0.35)", "rgba(224,92,122,0.85)")}>
          ⏻{!collapsed && <>&nbsp; Log Out</>}
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
