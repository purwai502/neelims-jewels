"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import BarcodeScanner from "./BarcodeScanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <BarcodeScanner />
      <Sidebar />
      <main style={{
        marginLeft: "260px",
        flex: 1,
        padding: "48px",
        minHeight: "100vh",
        background: "var(--bg)",
      }}>
        {children}
      </main>
    </div>
  );
}