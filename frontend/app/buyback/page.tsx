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

const fmt = (n: number) => n.toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
      fetch("http://localhost:8000/products/",  { headers: { "Authorization": `Bearer ${token}` } }).then(r => r.json()),
      fetch("http://localhost:8000/clients/",   { headers: { "Authorization": `Bearer ${token}` } }).then(r => r.json()),
      fetch("http://localhost:8000/buybacks/",  { headers: { "Authorization": `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([p, c, b]) => {
      setProducts(Array.isArray(p) ? p : []);
      setClients(Array.isArray(c) ? c : []);
      setRecords(Array.isArray(b) ? b : []);
    });
  }, [router]);

  const refreshRecords = (token: string) => {
    fetch("http://localhost:8000/buybacks/", { headers: { "Authorization": `Bearer ${token}` } })
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
    fetch(`http://localhost:8000/buybacks/calculate/${selectedProduct}`, {
      headers: { "Authorization": `Bearer ${token}` }
    }).then(r => {
      if (!r.ok) throw new Error("Failed");
      return r.json();
    }).then(data => {
      setCalc(data);
      if (data.client_id) setSelectedClient(data.client_id);
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
        `http://localhost:8000/buybacks/process/${calc.product_id}/${selectedClient}`,
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
          body > * { display: none !important; }
          #buyback-receipt { display: block !important; }
        }
        #buyback-receipt { display: none; }
      `}</style>

      {/* ── Printable receipt ────────────────────────────── */}
      {calc && (
        <div id="buyback-receipt">
          <div style={{ fontFamily: "Georgia, serif", maxWidth: "600px", margin: "0 auto", color: "#000" }}>
            <div style={{ textAlign: "center", marginBottom: "28px", borderBottom: "2px solid #000", paddingBottom: "20px" }}>
              <h1 style={{ fontSize: "26px", margin: 0, letterSpacing: "0.12em" }}>NEELIMA JEWELS</h1>
              <p style={{ fontSize: "11px", margin: "6px 0 0", letterSpacing: "0.2em" }}>BUYBACK RECEIPT</p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", fontSize: "13px" }}>
              <div><strong>Date:</strong> {today}</div>
              <div><strong>Client:</strong> {clientName}</div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #000" }}>
                  <th style={{ textAlign: "left", padding: "6px 0" }}>Item</th>
                  <th style={{ textAlign: "right", padding: "6px 0" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ padding: "5px 0" }}>Product</td><td style={{ textAlign: "right" }}>{calc.product_name}</td></tr>
                {calc.barcode && <tr><td style={{ padding: "5px 0" }}>Barcode</td><td style={{ textAlign: "right" }}>{calc.barcode}</td></tr>}
                <tr><td style={{ padding: "5px 0" }}>Weight</td><td style={{ textAlign: "right" }}>{calc.weight}g</td></tr>
                <tr><td style={{ padding: "5px 0" }}>Purity</td><td style={{ textAlign: "right" }}>{calc.purity}</td></tr>
              </tbody>
            </table>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #000" }}>
                  <th style={{ textAlign: "left", padding: "6px 0" }}>Calculation</th>
                  <th style={{ textAlign: "right", padding: "6px 0" }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "5px 0" }}>Original price paid</td>
                  <td style={{ textAlign: "right" }}>₹{fmt(calc.original_price)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "5px 0" }}>Less 20% studio deduction</td>
                  <td style={{ textAlign: "right" }}>− ₹{fmt(calc.deduction_20_pct)}</td>
                </tr>
                <tr style={{ borderTop: "1px solid #ddd" }}>
                  <td style={{ padding: "5px 0" }}>Base buyback value (80%)</td>
                  <td style={{ textAlign: "right" }}>₹{fmt(calc.buyback_base)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "5px 0" }}>Gold rate at purchase (₹{fmt(calc.original_gold_rate)}/g × {calc.weight}g)</td>
                  <td style={{ textAlign: "right" }}>₹{fmt(calc.original_gold_value)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "5px 0" }}>Gold rate today (₹{fmt(calc.current_gold_rate)}/g × {calc.weight}g)</td>
                  <td style={{ textAlign: "right" }}>₹{fmt(calc.current_gold_value)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "5px 0" }}>Gold rate variance</td>
                  <td style={{ textAlign: "right" }}>{calc.gold_variance >= 0 ? "+ " : "− "}₹{fmt(Math.abs(calc.gold_variance))}</td>
                </tr>
                <tr style={{ borderTop: "2px solid #000", fontWeight: "bold" }}>
                  <td style={{ padding: "10px 0", fontSize: "15px" }}>Total Buyback Value</td>
                  <td style={{ textAlign: "right", fontSize: "15px" }}>₹{fmt(calc.buyback_value)}</td>
                </tr>
              </tbody>
            </table>

            <p style={{ fontSize: "11px", color: "#555", lineHeight: 1.7, marginBottom: "40px" }}>
              Buyback value is calculated at 80% of the original purchase price, adjusted for the change
              in gold rates between the date of purchase and today. Both parties agree to the above valuation.
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "48px" }}>
              <div style={{ textAlign: "center", width: "200px" }}>
                <div style={{ borderTop: "1px solid #000", paddingTop: "6px", fontSize: "11px" }}>Client Signature</div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>{clientName}</div>
              </div>
              <div style={{ textAlign: "center", width: "200px" }}>
                <div style={{ borderTop: "1px solid #000", paddingTop: "6px", fontSize: "11px" }}>Authorised by</div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>Neelima Jewels</div>
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
                <p className="label-caps" style={{ marginBottom: "8px" }}>Client *</p>
                <select
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                  className="input-luxury"
                  style={{ cursor: "pointer", marginBottom: "16px" }}
                >
                  <option value="">— Select Client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>

                {processError && (
                  <p style={{ color: "#E05C7A", fontSize: "12px", marginBottom: "12px" }}>{processError}</p>
                )}

                {done ? (
                  <>
                    <p style={{ color: "#5CB87A", fontSize: "12px", marginBottom: "14px" }}>
                      ✓ Buyback processed — ₹{fmt(calc.buyback_value)} credited to {clientName}
                    </p>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => window.print()} className="btn-gold">Print Receipt</button>
                      <button onClick={() => {
                        setSelectedProduct(""); setCalc(null);
                        setSelectedClient(""); setDone(false); setSearch("");
                      }} className="btn-outline">New Buyback</button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={handleProcess}
                      disabled={processing || !selectedClient}
                      className="btn-gold"
                    >
                      {processing ? "Processing..." : "Process Buyback"}
                    </button>
                    <button onClick={() => window.print()} className="btn-outline">
                      Print Estimate
                    </button>
                  </div>
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
