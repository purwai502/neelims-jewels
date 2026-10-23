"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from "./Sidebar";
import BarcodeScanner from "./BarcodeScanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/";
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebarCollapsed", String(next));
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <BarcodeScanner />
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <main style={{
        marginLeft: `${sidebarWidth}px`,
        flex: 1,
        padding: "48px",
        minHeight: "100vh",
        background: "var(--bg)",
        transition: "margin-left 0.25s ease",
      }}>
        {children}
      </main>
    </div>
  );
}
