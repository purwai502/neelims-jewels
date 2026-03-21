"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

const fmt    = (n: number) => (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => (n || 0).toLocaleString("en-IN");

const GOLD   = "#C9A84C";
const GOLD2  = "#E8CC7A";
const ORANGE = "#E8A45A";
const GREEN  = "#5CB87A";
const BLUE   = "#7A9BC9";
const PINK   = "#C97A9B";
const RED    = "#E05C7A";
const MUTED  = "#888";

const METHOD_COLORS: Record<string, string> = {
  CASH: GREEN, UPI: BLUE, BANK: GOLD, CHEQUE: PINK, GOLD_EXCHANGE: ORANGE,
};

const INDIAN_PEAK_MONTHS: Record<number, string> = {
  4: "Akshaya Tritiya", 10: "Navratri / Diwali Season",
  11: "Diwali / Wedding Season", 12: "Wedding Season",
  1: "Wedding Season", 2: "Valentine's / Wedding",
};

interface Summary {
  total_revenue: number; total_orders: number; avg_order_value: number;
  total_clients: number; total_gold_exchange: number;
  total_making_charges: number; total_outstanding: number;
  total_cost: number; gross_profit: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading]           = useState(true);
  const [exporting, setExporting]       = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  const [summary, setSummary]           = useState<Summary | null>(null);
  const [revenueByMonth, setRevenue]    = useState<any[]>([]);
  const [ordersByMonth, setOrders]      = useState<any[]>([]);
  const [paymentMethods, setMethods]    = useState<any[]>([]);
  const [topClients, setTopClients]     = useState<any[]>([]);
  const [outstanding, setOutstanding]   = useState<any[]>([]);
  const [metalBreakdown, setMetal]      = useState<any[]>([]);
  const [goldExchange, setGoldExchange] = useState<any[]>([]);
  const [inactive, setInactive]         = useState<any[]>([]);
  const [profitByMonth, setProfit]      = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role === "EMPLOYEE") { router.push("/dashboard"); return; }
    const h = { "Authorization": `Bearer ${token}` };
    const B = process.env.NEXT_PUBLIC_API_URL!;
    Promise.all([
      fetch(`${B}/reports/summary`,              { headers: h }).then(r => r.json()),
      fetch(`${B}/reports/revenue-by-month`,     { headers: h }).then(r => r.json()),
      fetch(`${B}/reports/orders-by-month`,      { headers: h }).then(r => r.json()),
      fetch(`${B}/reports/payment-methods`,      { headers: h }).then(r => r.json()),
      fetch(`${B}/reports/top-clients`,          { headers: h }).then(r => r.json()),
      fetch(`${B}/reports/outstanding-balances`, { headers: h }).then(r => r.json()),
      fetch(`${B}/reports/metal-breakdown`,      { headers: h }).then(r => r.json()),
      fetch(`${B}/reports/gold-exchange-summary`,{ headers: h }).then(r => r.json()),
      fetch(`${B}/reports/inactive-clients`,     { headers: h }).then(r => r.json()),
      fetch(`${B}/reports/profit-by-month`,      { headers: h }).then(r => r.json()),
    ]).then(([s, rev, ord, meth, cli, out, met, gex, ina, prof]) => {
      setSummary(s);
      setRevenue(Array.isArray(rev) ? rev : []);
      setOrders(Array.isArray(ord) ? ord : []);
      setMethods(Array.isArray(meth) ? meth : []);
      setTopClients(Array.isArray(cli) ? cli : []);
      setOutstanding(Array.isArray(out) ? out : []);
      setMetal(Array.isArray(met) ? met : []);
      setGoldExchange(Array.isArray(gex) ? gex : []);
      setInactive(Array.isArray(ina) ? ina : []);
      setProfit(Array.isArray(prof) ? prof : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  // ── Export helpers ──────────────────────────────────────────────

  const fetchAllData = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/export/all`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Export failed");
    return res.json();
  };

  const toCSVString = (rows: any[]) => {
    if (!rows || rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(","),
      ...rows.map(r =>
        headers.map(h => {
          const val = r[h] == null ? "" : String(r[h]);
          return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(",")
      ),
    ];
    return lines.join("\n");
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportSingleCSV = async (sheet: string, label: string) => {
    setExporting(true);
    setExportStatus(`Exporting ${label}…`);
    try {
      const data = await fetchAllData();
      const rows = data[sheet] || [];
      downloadFile(toCSVString(rows), `neelima-${sheet}-${today()}.csv`, "text/csv");
      setExportStatus(`✓ ${label} exported`);
    } catch { setExportStatus("Export failed"); }
    setExporting(false);
    setTimeout(() => setExportStatus(""), 3000);
  };

  const exportAllCSV = async () => {
    setExporting(true);
    setExportStatus("Preparing full CSV export…");
    try {
      const data = await fetchAllData();
      const sheets: Record<string, string> = {
        clients: "clients", orders: "orders", products: "products",
        payments: "payments", transactions: "transactions", gold_rates: "gold_rates",
      };
      const parts: string[] = [];
      for (const [key, label] of Object.entries(sheets)) {
        parts.push(`\n=== ${label.toUpperCase()} ===\n`);
        parts.push(toCSVString(data[key] || []));
      }
      downloadFile(parts.join("\n"), `neelima-full-export-${today()}.csv`, "text/csv");
      setExportStatus("✓ Full CSV exported");
    } catch { setExportStatus("Export failed"); }
    setExporting(false);
    setTimeout(() => setExportStatus(""), 3000);
  };

  const exportExcel = async () => {
    setExporting(true);
    setExportStatus("Building Excel workbook…");
    try {
      const data = await fetchAllData();
      const wb = XLSX.utils.book_new();

      const sheetDefs: { key: string; name: string }[] = [
        { key: "clients",      name: "Clients"      },
        { key: "orders",       name: "Orders"       },
        { key: "products",     name: "Products"     },
        { key: "payments",     name: "Payments"     },
        { key: "transactions", name: "Transactions" },
        { key: "gold_rates",   name: "Gold Rates"   },
      ];

      // Summary sheet
      const summaryRows = [
        ["Neelima Jwels — Data Export", ""],
        ["Exported on", new Date().toLocaleString("en-IN")],
        [""],
        ["SUMMARY", ""],
        ["Total Revenue",         summary?.total_revenue       || 0],
        ["Total Orders",          summary?.total_orders        || 0],
        ["Avg Order Value",       summary?.avg_order_value     || 0],
        ["Total Clients",         summary?.total_clients       || 0],
        ["Outstanding Dues",      summary?.total_outstanding   || 0],
        ["Making Charges Earned", summary?.total_making_charges || 0],
        ["Gold Exchange Value",   summary?.total_gold_exchange || 0],
        ["Total Studio Cost",     summary?.total_cost          || 0],
        ["Gross Profit",          summary?.gross_profit        || 0],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet["!cols"] = [{ wch: 28 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      // Data sheets
      for (const { key, name } of sheetDefs) {
        const rows = data[key] || [];
        if (rows.length === 0) continue;
        const ws = XLSX.utils.json_to_sheet(rows);
        // auto column widths
        const cols = Object.keys(rows[0]).map(k => ({
          wch: Math.max(k.length, ...rows.slice(0, 20).map((r: any) =>
            String(r[k] == null ? "" : r[k]).length
          )) + 2,
        }));
        ws["!cols"] = cols;
        XLSX.utils.book_append_sheet(wb, ws, name);
      }

      XLSX.writeFile(wb, `neelima-jwels-${today()}.xlsx`);
      setExportStatus("✓ Excel file downloaded");
    } catch (e) {
      console.error(e);
      setExportStatus("Export failed");
    }
    setExporting(false);
    setTimeout(() => setExportStatus(""), 3000);
  };

  const today = () => new Date().toISOString().slice(0, 10);
  const handlePrint = () => window.print();

  const peakMonth = ordersByMonth.reduce((a, b) => b.count > a.count ? b : a, { count: 0, month: "" });
  const slowMonth = ordersByMonth.filter(m => m.count > 0).reduce((a, b) => b.count < a.count ? b : a, { count: Infinity, month: "" });
  const totalMethodsValue = paymentMethods.reduce((s, m) => s + m.total, 0);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: "48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <span style={{ color: GOLD, fontSize: "10px" }}>✦</span>
        <p className="label-caps">{title}</p>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
      </div>
      {children}
    </div>
  );

  const KpiCard = ({ label, value, sub, color = GOLD }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="card-luxury" style={{ padding: "20px 24px" }}>
      <p className="label-caps" style={{ marginBottom: "10px", fontSize: "9px" }}>{label}</p>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "26px", fontWeight: 600, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>{sub}</p>}
    </div>
  );

  if (loading) return (
    <div style={{ maxWidth: "1100px" }}>
      <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
        Compiling report…
      </p>
    </div>
  );

  return (
    <div style={{ maxWidth: "1100px" }} id="print-report">

      {/* Header */}
      <div style={{ marginBottom: "48px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Analytics</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", fontWeight: 400, color: "var(--text-primary)" }}>
            Studio Reports
          </h1>
          <p style={{ fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic", color: "var(--text-muted)", marginTop: "6px" }}>
            All-time performance overview
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={handlePrint} className="btn-outline" style={{ fontSize: "11px" }}>⎙ Print</button>
          <button onClick={exportAllCSV} disabled={exporting} className="btn-outline" style={{ fontSize: "11px" }}>
            ↓ Full CSV
          </button>
          <button onClick={exportExcel} disabled={exporting} className="btn-gold" style={{ fontSize: "11px" }}>
            ↓ Excel (.xlsx)
          </button>
        </div>
      </div>

      {exportStatus && (
        <div style={{
          marginBottom: "24px", padding: "12px 20px",
          background: exportStatus.startsWith("✓") ? "rgba(92,184,122,0.1)" : "rgba(201,168,76,0.08)",
          border: `1px solid ${exportStatus.startsWith("✓") ? "rgba(92,184,122,0.3)" : "var(--border-gold)"}`,
          color: exportStatus.startsWith("✓") ? GREEN : GOLD,
          fontFamily: "'Didact Gothic', sans-serif", fontSize: "12px", letterSpacing: "0.05em",
        }}>
          {exportStatus}
        </div>
      )}

      {/* KPIs */}
      <Section title="Overview">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "16px" }}>
          <KpiCard label="Total Revenue"   value={`₹${fmt(summary?.total_revenue || 0)}`} />
          <KpiCard label="Total Orders"    value={fmtInt(summary?.total_orders || 0)} color="var(--text-primary)" />
          <KpiCard label="Avg Order Value" value={`₹${fmt(summary?.avg_order_value || 0)}`} color={GOLD2} />
          <KpiCard label="Total Clients"   value={fmtInt(summary?.total_clients || 0)} color="var(--text-primary)" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "16px" }}>
          <KpiCard label="Outstanding Dues"      value={`₹${fmt(summary?.total_outstanding || 0)}`}     color={outstanding.length > 0 ? RED : GREEN} sub={`${outstanding.length} order(s) unpaid`} />
          <KpiCard label="Making Charges Earned" value={`₹${fmt(summary?.total_making_charges || 0)}`}  color={GREEN} />
          <KpiCard label="Gold Exchange Value"   value={`₹${fmt(summary?.total_gold_exchange || 0)}`}   color={ORANGE} />
        </div>
        {(summary?.total_cost || 0) > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <KpiCard label="Total Studio Cost"  value={`₹${fmt(summary?.total_cost || 0)}`}    color={ORANGE} sub="Sum of cost prices on sold items" />
            <KpiCard label="Gross Profit"       value={`₹${fmt(summary?.gross_profit || 0)}`}  color={(summary?.gross_profit || 0) >= 0 ? GREEN : RED} sub="Revenue minus studio cost" />
            <KpiCard label="Profit Margin"
              value={`${summary?.total_revenue ? ((summary.gross_profit / summary.total_revenue) * 100).toFixed(1) : "0.0"}%`}
              color={(summary?.gross_profit || 0) >= 0 ? GREEN : RED}
              sub="Gross profit ÷ revenue" />
          </div>
        )}
      </Section>

      {/* Profit Analysis */}
      {profitByMonth.length > 0 && (
        <Section title="Profit Analysis">
          <div className="card-ornate" style={{ padding: "28px" }}>
            <p style={{ fontFamily: "'Cormorant', serif", fontSize: "14px", fontStyle: "italic", color: "var(--text-muted)", marginBottom: "24px" }}>
              Monthly breakdown of revenue vs. studio cost vs. gross profit (only for products with cost price set)
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={profitByMonth} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} />
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={(v: number) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", borderRadius: 0 }}
                  labelStyle={{ color: GOLD, fontSize: 11 }}
                  formatter={(v: unknown, name?: unknown) => [`₹${fmt(Number(v) || 0)}`, String(name || "").charAt(0).toUpperCase() + String(name || "").slice(1)]}
                />
                <Bar dataKey="revenue" fill={GOLD}  name="revenue" radius={[2,2,0,0]} />
                <Bar dataKey="cost"    fill={ORANGE} name="cost"    radius={[2,2,0,0]} />
                <Bar dataKey="profit"  fill={GREEN}  name="profit"  radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "12px" }}>
              {[["Revenue", GOLD], ["Studio Cost", ORANGE], ["Gross Profit", GREEN]].map(([label, color]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", background: color }} />
                  <p style={{ fontSize: "10px", color: MUTED, letterSpacing: "0.08em" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Data Export Panel */}
      <Section title="Raw Data Export">
        <div className="card-ornate" style={{ padding: "28px" }}>
          <p style={{ fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic", color: "var(--text-muted)", marginBottom: "24px" }}>
            Download any dataset as CSV or download everything as a multi-sheet Excel workbook for analysis in Excel, Google Sheets, or any BI tool.
          </p>

          {/* Excel button — prominent */}
          <div style={{
            padding: "20px 24px", marginBottom: "24px",
            background: "var(--gold-subtle)", border: "1px solid var(--border-gold)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "var(--text-primary)", marginBottom: "4px" }}>
                Complete Excel Export
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                All tables in one .xlsx file — Clients, Orders, Products, Payments, Transactions, Gold Rates + Summary
              </p>
            </div>
            <button onClick={exportExcel} disabled={exporting} className="btn-gold" style={{ whiteSpace: "nowrap", minWidth: "140px" }}>
              {exporting ? "Building…" : "↓ Download .xlsx"}
            </button>
          </div>

          {/* Individual CSV downloads */}
          <p className="label-caps" style={{ marginBottom: "16px", fontSize: "9px" }}>Individual CSV Downloads</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {[
              { key: "clients",      label: "Clients",      icon: "👤" },
              { key: "orders",       label: "Orders",       icon: "📋" },
              { key: "products",     label: "Products",     icon: "💍" },
              { key: "payments",     label: "Payments",     icon: "💰" },
              { key: "transactions", label: "Transactions", icon: "↔" },
              { key: "gold_rates",   label: "Gold Rates",   icon: "✦" },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => exportSingleCSV(key, label)}
                disabled={exporting}
                style={{
                  padding: "14px 16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  fontFamily: "'Didact Gothic', sans-serif",
                  fontSize: "11px", letterSpacing: "0.06em",
                  cursor: exporting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "8px",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
                onMouseEnter={e => {
                  if (!exporting) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = GOLD;
                    (e.currentTarget as HTMLButtonElement).style.color = GOLD;
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }}
              >
                <span>{icon}</span>
                <span>↓ {label} CSV</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Revenue trend */}
      <Section title="Revenue Trend by Month">
        {revenueByMonth.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontFamily: "'Cormorant', serif" }}>No data yet.</p>
        ) : (
          <div className="card-luxury" style={{ padding: "24px" }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByMonth} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", borderRadius: 0, fontFamily: "'Didact Gothic'" }}
                  formatter={(v) => [`₹${fmt(v as number)}`, "Revenue"]}
                  labelStyle={{ color: GOLD, fontSize: 11 }}
                />
                <Bar dataKey="total" fill={GOLD} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Seasonality */}
      <Section title="Seasonality — Orders by Month (All Years Combined)">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
          <div className="card-luxury" style={{ padding: "24px" }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ordersByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", borderRadius: 0, fontFamily: "'Didact Gothic'" }}
                  formatter={(v) => [v, "Orders"]}
                  labelStyle={{ color: GOLD, fontSize: 11 }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {ordersByMonth.map((entry, i) => (
                    <Cell key={i} fill={INDIAN_PEAK_MONTHS[entry.month_num] ? ORANGE : GOLD} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="card-luxury" style={{ padding: "18px", flex: 1 }}>
              <p className="label-caps" style={{ fontSize: "8px", marginBottom: "8px", color: GREEN }}>Peak Month</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "var(--text-primary)" }}>{peakMonth.month || "—"}</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{peakMonth.count} orders</p>
            </div>
            <div className="card-luxury" style={{ padding: "18px", flex: 1 }}>
              <p className="label-caps" style={{ fontSize: "8px", marginBottom: "8px", color: RED }}>Slowest Month</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "var(--text-primary)" }}>{slowMonth.month || "—"}</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{slowMonth.count === Infinity ? 0 : slowMonth.count} orders</p>
            </div>
            <div className="card-luxury" style={{ padding: "16px", background: "var(--gold-subtle)", border: "1px solid var(--border-gold)" }}>
              <p className="label-caps" style={{ fontSize: "8px", marginBottom: "8px" }}>Indian Peak Seasons</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.8" }}>
                🪔 Oct–Nov: Diwali<br />
                💍 Nov–Feb: Wedding Season<br />
                ✨ Apr: Akshaya Tritiya<br />
                🌸 Feb: Valentine's
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Payment Methods */}
      <Section title="Payment Method Breakdown">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div className="card-luxury" style={{ padding: "24px" }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentMethods} dataKey="total" nameKey="method"
                  cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={3}>
                  {paymentMethods.map((entry, i) => (
                    <Cell key={i} fill={METHOD_COLORS[entry.method] || MUTED} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", borderRadius: 0, fontFamily: "'Didact Gothic'" }}
                  formatter={(v) => [`₹${fmt(v as number)}`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px" }}>
            {paymentMethods.map(m => (
              <div key={m.method} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "8px", height: "8px", background: METHOD_COLORS[m.method] || MUTED }} />
                  <span style={{ fontSize: "11px", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                    {m.method.replace("_", " ")}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>({m.count})</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", color: METHOD_COLORS[m.method] || MUTED }}>
                    ₹{fmt(m.total)}
                  </p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {totalMethodsValue > 0 ? ((m.total / totalMethodsValue) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Metal Breakdown */}
      <Section title="Product & Metal Breakdown">
        {metalBreakdown.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontFamily: "'Cormorant', serif" }}>No products yet.</p>
        ) : (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
            <table className="table-luxury">
              <thead>
                <tr>
                  <th>Metal Type</th><th>Products</th><th>Total Weight</th>
                  <th>Total Value</th><th>Making Charges</th><th>Avg Making %</th>
                </tr>
              </thead>
              <tbody>
                {metalBreakdown.map(m => (
                  <tr key={m.metal_type}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{m.metal_type}</td>
                    <td>{m.count}</td>
                    <td>{m.total_weight.toFixed(2)}g</td>
                    <td style={{ color: GOLD, fontFamily: "'Playfair Display', serif" }}>₹{fmt(m.total_value)}</td>
                    <td style={{ color: GREEN }}>₹{fmt(m.total_making_charges)}</td>
                    <td>
                      <span style={{
                        padding: "2px 8px", fontSize: "10px",
                        background: m.avg_making_pct > 15 ? "rgba(92,184,122,0.15)" : "rgba(201,168,76,0.1)",
                        color: m.avg_making_pct > 15 ? GREEN : GOLD,
                        border: `1px solid ${m.avg_making_pct > 15 ? "rgba(92,184,122,0.3)" : "rgba(201,168,76,0.3)"}`,
                      }}>{m.avg_making_pct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Gold Exchange */}
      {goldExchange.length > 0 && (
        <Section title="Gold Exchange Inflow">
          <div className="card-luxury" style={{ padding: "24px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={goldExchange} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", borderRadius: 0, fontFamily: "'Didact Gothic'" }}
                  formatter={(v) => [`₹${fmt(v as number)}`, "Gold Exchanged"]}
                />
                <Bar dataKey="total_value" fill={ORANGE} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Outstanding */}
      <Section title="Outstanding Balances">
        {outstanding.length === 0 ? (
          <div style={{
            padding: "24px", background: "rgba(92,184,122,0.08)",
            border: "1px solid rgba(92,184,122,0.3)",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <span style={{ color: GREEN, fontSize: "18px" }}>✓</span>
            <p style={{ fontFamily: "'Cormorant', serif", fontSize: "16px", color: GREEN, fontStyle: "italic" }}>
              All orders are fully paid.
            </p>
          </div>
        ) : (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
            <table className="table-luxury">
              <thead>
                <tr><th>Client</th><th>Phone</th><th>Order Total</th><th>Paid</th><th>Outstanding</th></tr>
              </thead>
              <tbody>
                {outstanding.map(o => (
                  <tr key={o.order_id}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{o.full_name}</td>
                    <td style={{ color: "var(--text-muted)" }}>{o.phone || "—"}</td>
                    <td>₹{fmt(o.final_price)}</td>
                    <td style={{ color: GREEN }}>₹{fmt(o.total_paid)}</td>
                    <td>
                      <span style={{ padding: "3px 10px", border: `1px solid ${RED}`, color: RED, fontSize: "11px", fontFamily: "'Playfair Display', serif" }}>
                        ₹{fmt(o.outstanding)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Top Clients */}
      <Section title="Top Clients by Revenue">
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
          <table className="table-luxury">
            <thead>
              <tr><th>#</th><th>Client</th><th>Phone</th><th>Orders</th><th>Total Paid</th><th>Last Payment</th></tr>
            </thead>
            <tbody>
              {topClients.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: i < 3 ? GOLD : "var(--text-muted)", fontWeight: i < 3 ? 600 : 400 }}>{i + 1}</td>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{c.full_name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{c.phone || "—"}</td>
                  <td>{c.order_count}</td>
                  <td style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: "15px" }}>₹{fmt(c.total_paid)}</td>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {c.last_payment ? new Date(c.last_payment).toLocaleDateString("en-IN") : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Inactive Clients */}
      <Section title="Client Re-engagement — Inactive 90+ Days">
        {inactive.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic" }}>
            All clients have been active recently.
          </p>
        ) : (
          <>
            <p style={{ fontFamily: "'Cormorant', serif", fontSize: "14px", color: "var(--text-muted)", fontStyle: "italic", marginBottom: "16px" }}>
              These clients haven't made a payment in over 90 days. Consider reaching out.
            </p>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
              <table className="table-luxury">
                <thead>
                  <tr><th>Client</th><th>Phone</th><th>Lifetime Value</th><th>Orders</th><th>Last Active</th><th>Days Silent</th></tr>
                </thead>
                <tbody>
                  {inactive.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{c.full_name}</td>
                      <td style={{ color: "var(--text-muted)" }}>{c.phone || "—"}</td>
                      <td style={{ color: GOLD, fontFamily: "'Playfair Display', serif" }}>₹{fmt(c.lifetime_value)}</td>
                      <td>{c.total_orders}</td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {c.last_payment ? new Date(c.last_payment).toLocaleDateString("en-IN") : "Never ordered"}
                      </td>
                      <td>
                        <span style={{
                          padding: "2px 8px", fontSize: "10px",
                          background: (c.days_since_payment || 999) > 180 ? "rgba(224,92,122,0.12)" : "rgba(232,164,90,0.12)",
                          color: (c.days_since_payment || 999) > 180 ? RED : ORANGE,
                          border: `1px solid ${(c.days_since_payment || 999) > 180 ? "rgba(224,92,122,0.3)" : "rgba(232,164,90,0.3)"}`,
                        }}>
                          {c.days_since_payment ? `${c.days_since_payment}d` : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

    </div>
  );
}