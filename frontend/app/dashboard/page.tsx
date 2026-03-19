"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface AttRecord {
  staff_id: string;
  full_name: string;
  staff_type: string;
  attendance: { status: string } | null;
}

const quickLinks = [
  { label: "New Order",     href: "/orders/new",   icon: "❖", desc: "Create a client or stock order" },
  { label: "Add Client",    href: "/clients/new",  icon: "◎", desc: "Register a new client" },
  { label: "Add Product",   href: "/products/new", icon: "◇", desc: "Add a jewelry piece" },
  { label: "View Clients",  href: "/clients",      icon: "◉", desc: "Browse all clients" },
  { label: "Transactions",  href: "/transactions", icon: "⟁", desc: "View financial records" },
  { label: "Reports",       href: "/reports",      icon: "▦", desc: "Studio analytics" },
];

export default function DashboardPage() {
  const [goldRate, setGoldRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [attendance, setAttendance] = useState<AttRecord[]>([]);
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/attendance/daily?date=${todayStr}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok ? r.json() : []).then(setAttendance).catch(() => {});
  }, [todayStr]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const handleSaveRate = async () => {
    if (!goldRate) return;
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const dateStr = new Date().toISOString().split("T")[0];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gold-rates/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          price_per_gram_24k: parseFloat(goldRate),
          effective_date: dateStr,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(true);
      setGoldRate("");
      setTimeout(() => setSaved(false), 4000);
    } catch {
      setError("Could not save rate. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: "960px" }}>

      {/* Page Header */}
      <div style={{ marginBottom: "48px" }}>
        <p className="label-caps" style={{ marginBottom: "10px" }}>
          ✦ &nbsp; Studio Dashboard &nbsp; ✦
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "52px",
          fontWeight: 400,
          color: "var(--text-primary)",
          lineHeight: 1.05,
          marginBottom: "12px",
        }}>
          {greeting},<br/>
          <em style={{ fontWeight: 700, color: "var(--gold)" }}>Purwai.</em>
        </h1>
        <p style={{
          fontFamily: "'Didact Gothic', sans-serif",
          fontSize: "13px",
          color: "var(--text-muted)",
          letterSpacing: "0.05em",
        }}>{today}</p>

        {/* Ornate divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginTop: "28px",
        }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
          <span style={{ color: "var(--gold)", fontSize: "10px", letterSpacing: "0.3em" }}>✦</span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, var(--border-gold), transparent)" }} />
        </div>
      </div>

      {/* Gold Rate Input */}
      <div style={{ marginBottom: "48px" }}>
        <p className="label-caps" style={{ marginBottom: "20px" }}>Today's Gold Rate</p>

        <div className="card-ornate" style={{ maxWidth: "520px" }}>
          <p style={{
            fontFamily: "'Cormorant', serif",
            fontSize: "15px",
            fontStyle: "italic",
            color: "var(--text-secondary)",
            marginBottom: "20px",
            lineHeight: 1.5,
          }}>
            Enter the 24K gold rate per gram to update all purity calculations for today.
          </p>

          <div style={{ display: "flex", gap: "0", marginBottom: "16px" }}>
            <div style={{
              background: "var(--surface-deep)",
              border: "1px solid var(--border-gold)",
              borderRight: "none",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              color: "var(--gold)",
              fontSize: "14px",
              fontFamily: "'Didact Gothic', sans-serif",
            }}>₹ / g</div>
            <input
              type="number"
              placeholder="e.g. 8500"
              value={goldRate}
              onChange={(e) => setGoldRate(e.target.value)}
              className="input-luxury"
              style={{ flex: 1, borderLeft: "none" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={handleSaveRate}
              disabled={saving || !goldRate}
              className="btn-gold"
              style={{ opacity: !goldRate ? 0.5 : 1 }}
            >
              {saving ? "Saving..." : saved ? "✓  Rate Saved" : "Set Today's Rate"}
            </button>
            {error && <span style={{ color: "#E05C7A", fontSize: "12px" }}>{error}</span>}
          </div>
        </div>
      </div>

      {/* Today's Attendance */}
      {attendance.length > 0 && (
        <div style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <p className="label-caps">Today's Attendance</p>
            <Link href="/staff" style={{
              fontFamily: "'Didact Gothic', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.08em",
              color: "var(--gold)",
              textDecoration: "none",
            }}>View Staff →</Link>
          </div>
          <div className="card-ornate" style={{ padding: "20px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {attendance.map(r => {
                const status = r.attendance?.status;
                const color  = status === "PRESENT" ? "#4CAF50" : status === "HALF_DAY" ? "#C4A84F" : status === "ABSENT" ? "#E05C7A" : "var(--text-muted)";
                return (
                  <div key={r.staff_id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    background: "var(--surface-deep)",
                    border: `1px solid ${status ? `${color}44` : "var(--border)"}`,
                  }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color }} />
                    <span style={{ fontFamily: "'Didact Gothic', sans-serif", fontSize: "12px", color: "var(--text-secondary)" }}>
                      {r.full_name}
                    </span>
                    <span style={{ fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px", color, letterSpacing: "0.06em" }}>
                      {status ? status.replace("_", " ") : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "20px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
              {[
                ["Present",  attendance.filter(r => r.attendance?.status === "PRESENT").length,  "#4CAF50"],
                ["Half Day", attendance.filter(r => r.attendance?.status === "HALF_DAY").length, "#C4A84F"],
                ["Absent",   attendance.filter(r => r.attendance?.status === "ABSENT").length,   "#E05C7A"],
                ["Unmarked", attendance.filter(r => !r.attendance).length,                       "var(--text-muted)"],
              ].map(([l, n, c]) => (
                <div key={l as string} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", color: c as string }}>{n as number}</span>
                  <span style={{ fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em" }}>{l as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p className="label-caps" style={{ marginBottom: "20px" }}>Quick Actions</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}>
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                padding: "24px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--gold)";
                el.style.background = "var(--gold-subtle)";
                el.style.transform = "translateY(-3px)";
                el.style.boxShadow = "var(--shadow-gold)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--border)";
                el.style.background = "var(--bg-card)";
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}>
                <span style={{
                  fontSize: "20px",
                  color: "var(--gold)",
                  display: "block",
                  marginBottom: "14px",
                }}>{link.icon}</span>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}>{link.label}</p>
                <p style={{
                  fontFamily: "'Cormorant', serif",
                  fontSize: "14px",
                  fontStyle: "italic",
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                }}>{link.desc}</p>

                {/* Corner mark */}
                <span style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "10px",
                  color: "var(--gold)",
                  fontSize: "7px",
                  opacity: 0.4,
                }}>✦</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
