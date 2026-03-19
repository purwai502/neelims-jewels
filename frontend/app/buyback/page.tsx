"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  weight: number;
  purity: string;
  total_price: number | null;
  is_sold: boolean;
}

interface Client {
  id: string;
  full_name: string;
  account_id: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface BuybackRecord {
  transaction_id:    string;
  date:              string;
  amount:            number;
  gold_weight:       number | null;
  gold_purity:       string | null;
  gold_rate_snapshot: number | null;
  notes:             string | null;
  product: {
    id:                 string;
    name:               string;
    barcode:            string | null;
    weight:             number;
    purity:             string;
    total_price:        number | null;
    gold_rate_snapshot: number | null;
  } | null;
  client: {
    id:        string;
    full_name: string;
    phone:     string | null;
  } | null;
}

interface BuybackCalc {
  product_id:          string;
  product_name:        string;
  barcode:             string | null;
  weight:              number;
  purity:              string;
  original_price:      number;
  deduction_20_pct:    number;
  buyback_base:        number;
  original_gold_rate:  number;
  current_gold_rate:   number;
  original_gold_value: number;
  current_gold_value:  number;
  gold_variance:       number;
  buyback_value:       number;
  client_id:           string | null;
  client_name:         string | null;
}

const fmt = (n: number) => Number(n || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function inWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
    "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function b100(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function b1000(n: number): string {
    if (n < 100) return b100(n);
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + b100(n % 100) : "");
  }
  const n = Math.round(amount);
  if (n === 0) return "Zero";
  const parts: string[] = [];
  if (Math.floor(n / 10000000)) parts.push(b100(Math.floor(n / 10000000)) + " Crore");
  if (Math.floor((n % 10000000) / 100000)) parts.push(b100(Math.floor((n % 10000000) / 100000)) + " Lakh");
  if (Math.floor((n % 100000) / 1000)) parts.push(b1000(Math.floor((n % 100000) / 1000)) + " Thousand");
  if (n % 1000) parts.push(b1000(n % 1000));
  return parts.join(" ").trim();
}

export default function BuybackPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [calc, setCalc] = useState<BuybackCalc | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [originalClientConfirmed, setOriginalClientConfirmed] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState("");
  const [done, setDone] = useState(false);
  const [records, setRecords] = useState<BuybackRecord[]>([]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role === "EMPLOYEE") { router.push("/dashboard"); return; }

    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/`,  { headers: { "Authorization": `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/`,   { headers: { "Authorization": `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/buybacks/`,  { headers: { "Authorization": `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([p, c, b]) => {
      setProducts(Array.isArray(p) ? p : []);
      setClients(Array.isArray(c) ? c : []);
      setRecords(Array.isArray(b) ? b : []);
    });
  }, [router]);

  const refreshRecords = (token: string) => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/buybacks/`, { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json()).then(b => setRecords(Array.isArray(b) ? b : []));
  };

  useEffect(() => {
    if (!selectedProduct) { setCalc(null); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    setCalcLoading(true);
    setCalcError("");
    setCalc(null);
    setDone(false);
    setOriginalClientConfirmed(null);
    setSelectedClient("");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/buybacks/calculate/${selectedProduct}`, {
      headers: { "Authorization": `Bearer ${token}` }
    }).then(r => {
      if (!r.ok) throw new Error("Failed");
      return r.json();
    }).then(data => {
      setCalc(data);
      setCalcLoading(false);
    }).catch(() => {
      setCalcError("Could not calculate buyback. Product may not have a price snapshot.");
      setCalcLoading(false);
    });
  }, [selectedProduct]);

  const filteredProducts = products.filter(p =>
    p.is_sold && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
    )
  );

  const handleProcess = async () => {
    if (!calc || !selectedClient) { setProcessError("Please select a client"); return; }
    setProcessing(true);
    setProcessError("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/buybacks/process/${calc.product_id}/${selectedClient}`,
        { method: "POST", headers: { "Authorization": `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed");
      setDone(true);
      refreshRecords(token!);
    } catch {
      setProcessError("Could not process buyback. Please try again.");
    }
    setProcessing(false);
  };

  const clientName = selectedClient
    ? (clients.find(c => c.id === selectedClient)?.full_name ?? calc?.client_name ?? "—")
    : (calc?.client_name ?? "—");

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body * { visibility: hidden; }
          #buyback-receipt {
            display: block !important;
            visibility: visible;
            position: fixed;
            top: 0; left: 0;
            width: 100%;
          }
          #buyback-receipt * { visibility: visible; }
        }
        #buyback-receipt { display: none; }
      `}</style>

      {/* ── Printable receipt ────────────────────────────── */}
      {calc && (
        <div id="buyback-receipt">
          <div style={{
            fontFamily: "'Instrument Sans', system-ui, sans-serif",
            width: "190mm", minHeight: "277mm", margin: "0 auto",
            color: "#111", display: "flex", flexDirection: "column",
            justifyContent: "space-between", padding: "24px",
            border: "1px solid #C4A44A", position: "relative", background: "#fff",
          }}>
            {/* Inner border */}
            <div style={{ position: "absolute", inset: "8px", border: "0.5px solid #C4A44A", pointerEvents: "none" }} />

            <div>
              {/* Header */}
              <div style={{ textAlign: "center", padding: "14px 0 10px" }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "34px", fontWeight: 400, letterSpacing: "0.15em", margin: 0, color: "#8B6914" }}>
                  NEELIMA JEWELS
                </h1>
                <div style={{ margin: "8px auto", width: "90px", height: "1px", background: "#C4A44A" }} />
                <p style={{ fontSize: "12px", letterSpacing: "0.4em", color: "#555", margin: 0, textTransform: "uppercase" }}>Buyback Form</p>
              </div>

              {/* Studio + Client two-column */}
              {(() => {
                const clientObj = clients.find(c => c.id === (selectedClient || calc.client_id));
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: "0", margin: "12px 0", borderTop: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>
                    <div style={{ padding: "12px 16px 12px 4px" }}>
                      <p style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#8B6914", margin: "0 0 6px", textTransform: "uppercase" }}>Studio</p>
                      <p style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px" }}>Neelima Jewels</p>
                      <p style={{ fontSize: "13px", color: "#444", lineHeight: 1.7, margin: 0 }}>
                        G-3, Phoenix Lifestyle<br />
                        Sukhadia Circle, Opp. Tapri Niwas<br />
                        Udaipur, Rajasthan — 313001
                      </p>
                      <p style={{ fontSize: "13px", color: "#444", margin: "6px 0 0" }}>Date: {today}</p>
                    </div>
                    <div style={{ background: "#ddd" }} />
                    <div style={{ padding: "12px 4px 12px 20px" }}>
                      <p style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#8B6914", margin: "0 0 6px", textTransform: "uppercase" }}>Client</p>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "21px", fontStyle: "italic", margin: "0 0 5px", color: "#111" }}>
                        {clientName}
                      </p>
                      {clientObj?.phone && (
                        <p style={{ fontSize: "13px", color: "#444", lineHeight: 1.7, margin: 0 }}>Ph: {clientObj.phone}</p>
                      )}
                      {clientObj?.email && (
                        <p style={{ fontSize: "13px", color: "#444", lineHeight: 1.7, margin: 0 }}>{clientObj.email}</p>
                      )}
                      {clientObj?.address && (
                        <p style={{ fontSize: "13px", color: "#444", lineHeight: 1.7, margin: "2px 0 0" }}>{clientObj.address}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Gold rate banner */}
              <div style={{ background: "#FDFAF4", border: "1px solid #E8D5A0", padding: "9px 14px", margin: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "#8B6914", margin: 0, textTransform: "uppercase" }}>Gold Rate Reference</p>
                <div style={{ display: "flex", gap: "32px" }}>
                  <span style={{ fontSize: "14px", color: "#444" }}>Rate at purchase: <strong style={{ color: "#111" }}>₹{fmt(calc.original_gold_rate)}/g</strong></span>
                  <span style={{ fontSize: "14px", color: "#444" }}>Rate today ({calc.purity}): <strong style={{ color: "#111" }}>₹{fmt(calc.current_gold_rate)}/g</strong></span>
                </div>
              </div>

              {/* Item details table */}
              <p style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#8B6914", margin: "14px 0 8px", textTransform: "uppercase" }}>Item Details</p>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#F9F4EC", borderTop: "1px solid #C4A44A", borderBottom: "1px solid #C4A44A" }}>
                    {["Item", "Purity", "Gross Wt.", "Original Price"].map((h, i) => (
                      <th key={h} style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", color: "#555", textAlign: i === 0 ? "left" : i === 3 ? "right" : "center" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", margin: 0 }}>{calc.product_name}</p>
                      {calc.barcode && <p style={{ fontSize: "11px", color: "#888", letterSpacing: "0.05em", margin: "2px 0 0" }}>{calc.barcode}</p>}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{calc.purity}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{calc.weight} g</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "'Playfair Display', serif" }}>₹{fmt(calc.original_price)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Valuation breakdown table */}
              <p style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#8B6914", margin: "0 0 8px", textTransform: "uppercase" }}>Valuation Breakdown</p>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#F9F4EC", borderTop: "1px solid #C4A44A", borderBottom: "1px solid #C4A44A" }}>
                    <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", color: "#555", textAlign: "left" }}>Description</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", color: "#555", textAlign: "right" }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px 12px", color: "#333" }}>Original price paid</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>₹{fmt(calc.original_price)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px 12px", color: "#333" }}>Less: 20% studio deduction</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#c0392b" }}>− ₹{fmt(calc.deduction_20_pct)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #C4A44A", background: "#fafaf7" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>Base buyback value (80% of original)</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>₹{fmt(calc.buyback_base)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "7px 12px", color: "#666", fontSize: "13px" }}>Gold value at purchase rate &nbsp;(₹{fmt(calc.original_gold_rate)}/g × {calc.weight}g)</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", color: "#555", fontSize: "13px" }}>₹{fmt(calc.original_gold_value)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "7px 12px", color: "#666", fontSize: "13px" }}>Gold value at today&apos;s rate &nbsp;(₹{fmt(calc.current_gold_rate)}/g × {calc.weight}g)</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", color: "#555", fontSize: "13px" }}>₹{fmt(calc.current_gold_value)}</td>
                  </tr>
                  <tr style={{ borderBottom: "2px solid #C4A44A", background: calc.gold_variance >= 0 ? "#f6fdf8" : "#fdf6f6" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>Gold rate variance</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: calc.gold_variance >= 0 ? "#27ae60" : "#c0392b" }}>
                      {calc.gold_variance >= 0 ? "+ " : "− "}₹{fmt(Math.abs(calc.gold_variance))}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: "#F9F4EC", borderBottom: "2px solid #C4A44A" }}>
                    <td style={{ padding: "12px 12px", fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: 600, color: "#8B6914" }}>
                      Total Buyback Value
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right", fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: "#8B6914" }}>
                      ₹{fmt(calc.buyback_value)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Value in words */}
              <p style={{ fontSize: "14px", color: "#444", fontStyle: "italic", marginBottom: "8px" }}>
                Value in words: <strong style={{ color: "#111", fontStyle: "normal" }}>Rupees {inWords(calc.buyback_value)} Only</strong>
              </p>
            </div>

            {/* Footer */}
            <div>
              <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.8, marginBottom: "24px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                Buyback value is calculated at 80% of the original purchase price, adjusted for the change in gold rates
                between the date of purchase and today. Both parties confirm agreement to the above valuation.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <div style={{ borderTop: "1px solid #8B6914", paddingTop: "8px" }}>
                    <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>Client Signature</p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontStyle: "italic", margin: "4px 0 0", color: "#111" }}>{clientName}</p>
                  </div>
                </div>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <div style={{ borderTop: "1px solid #8B6914", paddingTop: "8px" }}>
                    <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>Authorised by</p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", margin: "4px 0 0", color: "#111" }}>Neelima Jewels</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main UI ──────────────────────────────────────── */}
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "40px" }}>
          <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Buyback</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", fontWeight: 400, color: "var(--text-primary)" }}>
            Buyback Calculator
          </h1>
          <p style={{ fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic", color: "var(--text-muted)", marginTop: "8px" }}>
            80% of original price paid · adjusted for gold rate change
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>

          {/* Product lookup */}
          <div className="card-ornate">
            <p className="label-caps" style={{ marginBottom: "14px" }}>Find Product</p>
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-luxury"
              style={{ marginBottom: "12px" }}
            />
            <div style={{ maxHeight: "340px", overflowY: "auto" }}>
              {filteredProducts.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "14px", fontStyle: "italic" }}>
                  No products found.
                </p>
              ) : filteredProducts.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProduct(p.id);
                    setDone(false);
                    setCalcError("");
                    setProcessError("");
                    setSelectedClient("");
                    setOriginalClientConfirmed(null);
                  }}
                  style={{
                    padding: "10px 14px", marginBottom: "4px", cursor: "pointer",
                    border: `1px solid ${selectedProduct === p.id ? "var(--gold)" : "var(--border)"}`,
                    background: selectedProduct === p.id ? "rgba(232,164,90,0.07)" : "transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: 0 }}>{p.name}</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: "2px 0 0", letterSpacing: "0.05em" }}>
                    {p.purity} · {p.weight}g
                    {p.barcode ? ` · ${p.barcode}` : ""}
                    {p.total_price ? ` · ₹${fmt(p.total_price)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Calculation result */}
          <div>
            {calcLoading && (
              <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "16px", fontStyle: "italic" }}>
                Calculating...
              </p>
            )}

            {calcError && (
              <p style={{ color: "#E05C7A", fontSize: "13px" }}>{calcError}</p>
            )}

            {!calc && !calcLoading && !calcError && (
              <div style={{ padding: "40px 24px", border: "1px dashed var(--border)", textAlign: "center" }}>
                <p style={{ fontFamily: "'Cormorant', serif", fontSize: "17px", fontStyle: "italic", color: "var(--text-muted)" }}>
                  Select a product to see buyback value
                </p>
              </div>
            )}

            {calc && !calcLoading && (
              <div className="card-ornate">
                <p className="label-caps" style={{ marginBottom: "14px" }}>Buyback Estimate</p>

                {/* Product info */}
                <div style={{ marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", color: "var(--text-primary)", margin: "0 0 3px" }}>
                    {calc.product_name}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.05em", margin: 0 }}>
                    {calc.purity} · {calc.weight}g{calc.barcode ? ` · ${calc.barcode}` : ""}
                  </p>
                </div>

                {/* Breakdown */}
                {[
                  { label: "Original price paid",  value: `₹${fmt(calc.original_price)}`,       col: "var(--text-primary)" },
                  { label: "Less 20% deduction",   value: `− ₹${fmt(calc.deduction_20_pct)}`,   col: "#E05C7A" },
                  { label: "Base buyback (80%)",   value: `₹${fmt(calc.buyback_base)}`,          col: "var(--text-secondary)" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "9px" }}>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{row.label}</p>
                    <p style={{ fontSize: "13px", color: row.col, fontFamily: "'Playfair Display', serif", margin: 0 }}>{row.value}</p>
                  </div>
                ))}

                {/* Gold variance breakdown */}
                <div style={{ margin: "12px 0", padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>GOLD RATE VARIANCE</p>
                  {[
                    { label: `Rate at purchase  (₹${fmt(calc.original_gold_rate)}/g × ${calc.weight}g)`, value: `₹${fmt(calc.original_gold_value)}`, col: "var(--text-secondary)" },
                    { label: `Rate today        (₹${fmt(calc.current_gold_rate)}/g × ${calc.weight}g)`,  value: `₹${fmt(calc.current_gold_value)}`,  col: "var(--text-secondary)" },
                    { label: "Variance",                                                       value: `${calc.gold_variance >= 0 ? "+ " : "− "}₹${fmt(Math.abs(calc.gold_variance))}`, col: calc.gold_variance >= 0 ? "#5CB87A" : "#E05C7A" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: 0, fontFamily: "monospace" }}>{row.label}</p>
                      <p style={{ fontSize: "12px", color: row.col, fontFamily: "'Playfair Display', serif", margin: 0 }}>{row.value}</p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div style={{
                  margin: "14px 0 18px",
                  padding: "12px 16px",
                  background: "var(--gold-subtle)",
                  border: "1px solid var(--border-gold)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <p style={{ fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold)", margin: 0 }}>BUYBACK VALUE</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", color: "var(--gold)", fontWeight: 600, margin: 0 }}>
                    ₹{fmt(calc.buyback_value)}
                  </p>
                </div>

                {/* Client */}
                {done ? (
                  <>
                    <p style={{ color: "#5CB87A", fontSize: "12px", marginBottom: "14px" }}>
                      ✓ Buyback processed — ₹{fmt(calc.buyback_value)} credited to {clientName}
                    </p>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => window.print()} className="btn-gold">Print Receipt</button>
                      <button onClick={() => {
                        setSelectedProduct(""); setCalc(null); setSelectedClient("");
                        setDone(false); setSearch(""); setOriginalClientConfirmed(null);
                      }} className="btn-outline">New Buyback</button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Step 1 — confirm original buyer if known */}
                    {calc.client_id && originalClientConfirmed === null && (
                      <div style={{ marginBottom: "16px", padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border-gold)" }}>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>Original buyer on record:</p>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", color: "var(--text-primary)", margin: "0 0 12px" }}>
                          {calc.client_name}
                        </p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn-gold" style={{ fontSize: "11px" }} onClick={() => {
                            setSelectedClient(calc.client_id!);
                            setOriginalClientConfirmed(true);
                          }}>
                            Yes
                          </button>
                          <button className="btn-outline" style={{ fontSize: "11px" }} onClick={() => {
                            setOriginalClientConfirmed(false);
                            setSelectedClient("");
                          }}>
                            Select Another
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 1 — no original buyer, or user said No */}
                    {(!calc.client_id || originalClientConfirmed === false) && (
                      <>
                        <p className="label-caps" style={{ marginBottom: "8px" }}>Select Client *</p>
                        <select
                          value={selectedClient}
                          onChange={e => setSelectedClient(e.target.value)}
                          className="input-luxury"
                          style={{ cursor: "pointer", marginBottom: "16px" }}
                        >
                          <option value="">— Select Client —</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                        </select>
                      </>
                    )}

                    {/* Step 2 — confirmed, show name + allow change */}
                    {originalClientConfirmed === true && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", padding: "10px 14px", background: "var(--gold-subtle)", border: "1px solid var(--border-gold)" }}>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", color: "var(--text-primary)", margin: 0 }}>
                          {calc.client_name}
                        </p>
                        <button className="btn-outline" style={{ fontSize: "10px", padding: "4px 10px" }} onClick={() => {
                          setOriginalClientConfirmed(false);
                          setSelectedClient("");
                        }}>Change</button>
                      </div>
                    )}

                    {processError && (
                      <p style={{ color: "#E05C7A", fontSize: "12px", marginBottom: "12px" }}>{processError}</p>
                    )}

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={handleProcess} disabled={processing || !selectedClient} className="btn-gold">
                        {processing ? "Processing..." : "Process Buyback"}
                      </button>
                      <button onClick={() => window.print()} className="btn-outline">Print Estimate</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Past buybacks ─────────────────────────────── */}
        {records.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "48px 0 32px" }}>
              <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
              <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
            </div>

            <p className="label-caps" style={{ marginBottom: "20px" }}>Processed Buybacks</p>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
              <table className="table-luxury">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Client</th>
                    <th>Weight · Purity</th>
                    <th>Gold Rate at Sale</th>
                    <th>Buyback Rate</th>
                    <th>Buyback Value</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.transaction_id}>
                      <td>
                        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)" }}>{r.product?.name ?? "—"}</p>
                        {r.product?.barcode && (
                          <p style={{ margin: "2px 0 0", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>{r.product.barcode}</p>
                        )}
                      </td>
                      <td>{r.client?.full_name ?? "—"}</td>
                      <td style={{ fontSize: "12px" }}>
                        {r.gold_weight ? `${r.gold_weight}g` : (r.product?.weight ? `${r.product.weight}g` : "—")}
                        {" · "}{r.gold_purity ?? r.product?.purity ?? "—"}
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {r.product?.gold_rate_snapshot ? `₹${fmt(r.product.gold_rate_snapshot)}/g` : "—"}
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {r.gold_rate_snapshot ? `₹${fmt(r.gold_rate_snapshot)}/g` : "—"}
                      </td>
                      <td style={{ color: "var(--gold)", fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 600 }}>
                        ₹{fmt(r.amount)}
                      </td>
                      <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
