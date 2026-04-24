"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import JsBarcode from "jsbarcode";

interface Stone {
  id: string;
  stone_name: string;
  weight: number;
  price_per_carat: number;
  total_price: number;
  notes: string;
}
interface Product {
  id: string;
  name: string;
  description: string;
  weight: number;
  gold_weight: number | null;
  purity: string;
  is_sold: boolean;
  making_charges: number;
  gold_rate_snapshot: number;
  total_price: number;
  barcode: string;
  order_id: string | null;
  image_path: string | null;
  stones: Stone[];
}
interface Client {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmt0 = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const PURITY_MULT: Record<string, number> = {
  "24K": 1.0,
  "22K": 0.9167,
  "18K": 0.75,
  "14K": 0.5833,
};

export default function SalePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const barcodeCallbackRef = (node: SVGSVGElement | null) => {
    if (node && product?.barcode) {
      JsBarcode(node, product.barcode, {
        format: "CODE128",
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 4,
        background: "#ffffff",
        lineColor: "#111111",
      });
    }
  };

  const [product, setProduct] = useState<Product | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [buybackPct, setBuybackPct] = useState(80);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const h = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`, { headers: h }).then((r) =>
        r.json(),
      ),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/`, { headers: h }).then((r) =>
        r.json(),
      ),
    ])
      .then(([p, c]) => {
        setProduct(p);
        setClients(Array.isArray(c) ? c : []);
        if (p.is_sold) setDone(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, router]);

  const selectedClient = clients.find((c) => c.id === clientId) || null;

  const handleProcessSale = async () => {
    if (!product) return;
    setProcessing(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/products/${product.id}/mark-sold`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ client_id: clientId || null, buyback_rate: buybackPct / 100 }),
        },
      );
      if (!res.ok) throw new Error("Failed");
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "Could not process sale");
    }
    setProcessing(false);
  };

  const handlePrint = async () => {
    window.scrollTo({ top: 0, behavior: "instant" as any });

    // @ts-ignore
    if (document.fonts?.ready) await document.fonts.ready;

    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    window.print();
  };

  if (loading)
    return (
      <p
        style={{
          color: "var(--text-muted)",
          fontFamily: "'Cormorant', serif",
          fontSize: "18px",
          fontStyle: "italic",
        }}
      >
        Loading...
      </p>
    );

  if (!product) return <p style={{ color: "#E05C7A" }}>Product not found.</p>;

  const purityKey = product.purity?.includes("24")
    ? "24K"
    : product.purity?.includes("22")
      ? "22K"
      : product.purity?.includes("18")
        ? "18K"
        : product.purity?.includes("14")
          ? "14K"
          : "22K";

  const netGoldWeight =
    product.gold_weight != null
      ? Number(product.gold_weight)
      : Number(product.weight) * (PURITY_MULT[purityKey] || 1);

  const goldValue = netGoldWeight * Number(product.gold_rate_snapshot);
  const stonesTotal =
    product.stones?.reduce((s, st) => s + Number(st.total_price || 0), 0) || 0;

  const costing = goldValue + stonesTotal;
  const makingCharges = Number(product.making_charges) || 0;
  const finalPrice = Number(product.total_price) || 0;

  const metalMatch = product.description?.match(/^\[(.+?)\]/);
  const metalType = metalMatch ? metalMatch[1] : "Gold";
  const cleanDesc = product.description?.replace(/^\[.+?\]\s*/, "") || "";

  const saleDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const imageUrl = product.image_path
    ? `${process.env.NEXT_PUBLIC_API_URL}/${product.image_path}`
    : null;

  const G = "#8B6914";
  const GL = "#C4A44A";

  const cellBase = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: "11px 12px",
    borderBottom: "1px solid #e8e8e8",
    ...extra,
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Instrument+Sans:wght@400;500;600;700&display=swap');

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide everything but keep DOM/layout structure intact */
          body * {
            visibility: hidden !important;
          }

          /* Show only certificate */
          #purchase-certificate,
          #purchase-certificate * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Anchor certificate at top-left so hidden layout doesn't push it down */
          #purchase-certificate {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important!;
            margin: 0 auto !important!;

            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;

            overflow: visible !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }

          .no-print { display: none !important; }
        }

        /* Printer-safe margin so borders don't get cut */
        @page { margin: 10mm; size: A4 portrait; }
      `}</style>

      <div style={{ maxWidth: "860px" }}>
        <div className="no-print" style={{ marginBottom: "32px" }}>
          <Link href={`/products/${id}`} style={{ textDecoration: "none" }}>
            <p
              style={{
                fontSize: "11px",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginBottom: "12px",
                cursor: "pointer",
              }}
            >
              ← Back to Product
            </p>
          </Link>
          <p className="label-caps" style={{ marginBottom: "8px" }}>
            ✦ &nbsp; Process Sale
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "36px",
              fontWeight: 400,
              color: "var(--text-primary)",
            }}
          >
            {product.name}
          </h1>
        </div>

        {!done && (
          <div className="no-print card-ornate" style={{ marginBottom: "32px" }}>
            <p className="label-caps" style={{ marginBottom: "12px" }}>
              Link Client
            </p>
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "14px",
                fontStyle: "italic",
                color: "var(--text-muted)",
                marginBottom: "16px",
              }}
            >
              Select the client purchasing this piece. Their name will appear on
              the Detail Breakdown.
            </p>

            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: "13px",
                cursor: "pointer",
                outline: "none",
                marginBottom: "16px",
              }}
            >
              <option value="">— No Client (Walk-in / Cash Sale) —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                  {c.phone ? ` · ${c.phone}` : ""}
                </option>
              ))}
            </select>

            <div style={{ marginBottom: "16px" }}>
              <p style={{
                fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase",
                color: "var(--gold)", marginBottom: "10px",
                fontFamily: "'Didact Gothic', sans-serif",
              }}>
                Buyback Policy
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[70, 75, 80, 85, 90].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setBuybackPct(pct)}
                    style={{
                      padding: "8px 16px",
                      border: `1px solid ${buybackPct === pct ? "var(--gold)" : "var(--border)"}`,
                      background: buybackPct === pct ? "var(--gold-subtle)" : "transparent",
                      color: buybackPct === pct ? "var(--gold)" : "var(--text-muted)",
                      fontFamily: "'Didact Gothic', sans-serif",
                      fontSize: "12px", cursor: "pointer",
                    }}
                  >
                    {pct}%
                  </button>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="number"
                    min={1} max={100}
                    value={buybackPct}
                    onChange={e => setBuybackPct(Math.min(100, Math.max(1, Number(e.target.value))))}
                    style={{
                      width: "64px", padding: "8px 10px",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      color: "var(--text-primary)", fontFamily: "'Didact Gothic', sans-serif",
                      fontSize: "12px", outline: "none",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>%</span>
                </div>
              </div>
            </div>

            {error && (
              <p
                style={{
                  color: "#E05C7A",
                  fontSize: "12px",
                  marginBottom: "12px",
                }}
              >
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleProcessSale}
                disabled={processing}
                className="btn-gold"
              >
                {processing ? "Processing…" : "Confirm Sale & Generate Certificate"}
              </button>

              <Link href={`/products/${id}`}>
                <button className="btn-outline">Cancel</button>
              </Link>
            </div>
          </div>
        )}

        {done && (
          <div
            className="no-print"
            style={{
              marginBottom: "24px",
              padding: "14px 20px",
              background: "rgba(92,184,122,0.08)",
              border: "1px solid rgba(92,184,122,0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p
              style={{
                color: "#5CB87A",
                fontFamily: "'Playfair Display', serif",
                fontSize: "15px",
                fontStyle: "italic",
              }}
            >
              ✓ Sale confirmed — certificate ready to print
            </p>
            <button
              onClick={handlePrint}
              className="btn-gold"
              style={{ fontSize: "11px" }}
            >
              ⎙ Print Certificate
            </button>
          </div>
        )}

        <div
          id="purchase-certificate"
          style={{
            fontFamily: "'Instrument Sans', sans-serif",
            color: "#1a1a1a",
            width: "210mm",
            minHeight: "297mm",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            padding: "12mm",
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              border: `2.5px solid ${G}`,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "4px",
                border: `0.75px solid ${GL}`,
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "28px 36px 20px",
              }}
            >
              <div>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <p
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.55em",
                      color: "#575555ff",
                      textTransform: "uppercase",
                      margin: "0 0 14px",
                      fontWeight: 600,
                    }}
                  >
                    Detail Breakdown
                  </p>

                  <h1
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "30px",
                      fontWeight: 500,
                      color: "#111",
                      margin: 0,
                      letterSpacing: "0.02em",
                      lineHeight: 1,
                    }}
                  >
                    Neelima Jewels
                  </h1>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      margin: "12px 0",
                    }}
                  >
                    <div style={{ width: "60px", height: "1.5px", background: G }} />
                    <span style={{ color: G, fontSize: "5px" }}>◆</span>
                    <div style={{ width: "60px", height: "1.5px", background: G }} />
                  </div>

                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      letterSpacing: "0.06em",
                      margin: 0,
                      fontWeight: 400,
                    }}
                  >
                    {saleDate}
                  </p>
                </div>

                <div
                  style={{
                    height: "1.5px",
                    background: `linear-gradient(90deg, ${GL}, ${G}, ${GL})`,
                    marginBottom: "24px",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ paddingRight: "30px", borderRight: `1px solid #ddd` }}>
                    <p
                      style={{
                        fontSize: "7px",
                        letterSpacing: "0.5em",
                        color: "#aaa",
                        textTransform: "uppercase",
                        margin: "0 0 8px",
                        fontWeight: 700,
                      }}
                    >
                      Presented To
                    </p>

                    {selectedClient ? (
                      <>
                        <p
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: "20px",
                            color: "#111",
                            margin: "0 0 6px",
                            lineHeight: 1.1,
                            fontWeight: 500,
                            fontStyle: "italic",
                          }}
                        >
                          {selectedClient.full_name}
                        </p>
                        <div style={{ fontSize: "11px", color: "#444", lineHeight: 1.6 }}>
                          {selectedClient.phone && <p style={{ margin: 0 }}>{selectedClient.phone}</p>}
                          {selectedClient.email && <p style={{ margin: 0 }}>{selectedClient.email}</p>}
                          {selectedClient.address && (
                            <p style={{ margin: 0 }}>{selectedClient.address}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <p
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "22px",
                          color: "#aaa",
                          fontStyle: "italic",
                          margin: 0,
                        }}
                      >
                        Walk-in Customer
                      </p>
                    )}
                  </div>

                  <div style={{ paddingLeft: "30px" }}>
                    <p
                      style={{
                        fontSize: "7px",
                        letterSpacing: "0.5em",
                        color: "#aaa",
                        textTransform: "uppercase",
                        margin: "0 0 8px",
                        fontWeight: 700,
                      }}
                    >
                      Piece Details
                    </p>

                    <p
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "20px",
                        fontStyle: "italic",
                        color: "#111",
                        margin: "0 0 6px",
                        lineHeight: 1.1,
                        fontWeight: 500,
                      }}
                    >
                      {product.name}
                    </p>

                    {cleanDesc && (
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#444",
                          margin: "0 0 6px",
                          fontWeight: 500,
                          lineHeight: 1.5,
                        }}
                      >
                        {cleanDesc}
                      </p>
                    )}

                    <p
                      style={{
                        fontSize: "11px",
                        color: "#333",
                        letterSpacing: "0.12em",
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      {product.barcode} &nbsp;·&nbsp; {metalType} &nbsp;·&nbsp; {purityKey}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    height: "1.5px",
                    background: `linear-gradient(90deg, ${GL}, ${G}, ${GL})`,
                    marginBottom: "28px",
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  display: "grid",
                  gridTemplateColumns: imageUrl ? "200px 1fr" : "1fr",
                  gap: "32px",
                  alignItems: "stretch",
                  marginBottom: "24px",
                }}
              >
                {imageUrl && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ border: `1.5px solid ${GL}`, padding: "5px" }}>
                      <img
                        src={imageUrl}
                        alt={product.name}
                        style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                      />
                    </div>
                    <svg ref={barcodeCallbackRef} style={{ width: "100%", marginTop: "8px", display: "block" }} />
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <p
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.5em",
                      color: "#595757ff",
                      textTransform: "uppercase",
                      margin: "0 0 12px",
                      fontWeight: 700,
                    }}
                  >
                    Composition &amp; Valuation
                  </p>

                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <thead>
                      <tr>
                        {["Item", "Weight", "Rate", "Value"].map((h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 12px",
                              textAlign: i === 3 ? "right" : "left",
                              fontSize: "8px",
                              letterSpacing: "0.4em",
                              textTransform: "uppercase",
                              color: "#999",
                              fontWeight: 700,
                              borderBottom: `2px solid #222`,
                              width: i === 0 ? "40%" : undefined,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td
                          style={cellBase({
                            fontFamily: "'Playfair Display', serif",
                            fontSize: "15px",
                            color: "#111",
                            fontWeight: 500,
                          })}
                        >
                          Gross Weight
                        </td>
                        <td style={cellBase({ color: "#333", fontSize: "12px", fontWeight: 500 })}>
                          {Number(product.weight).toFixed(3)} g
                        </td>
                        <td style={cellBase({ color: "#333", fontSize: "12px", fontWeight: 500 })}>{purityKey}</td>
                        <td style={cellBase()} />
                      </tr>

                      <tr>
                        <td
                          style={cellBase({
                            fontFamily: "'Playfair Display', serif",
                            fontSize: "15px",
                            color: "#111",
                            fontWeight: 500,
                          })}
                        >
                          Net Gold Wt.
                        </td>
                        <td style={cellBase({ color: "#333", fontSize: "12px", fontWeight: 500 })}>
                          {netGoldWeight.toFixed(3)} g
                        </td>
                        <td colSpan={2} style={cellBase()} />
                      </tr>

                      <tr>
                        <td
                          style={cellBase({
                            fontFamily: "'Playfair Display', serif",
                            fontSize: "15px",
                            color: "#111",
                            fontWeight: 500,
                          })}
                        >
                          {metalType}
                        </td>
                        <td style={cellBase({ color: "#333", fontSize: "12px" })}>
                          {netGoldWeight.toFixed(3)} g
                        </td>
                        <td style={cellBase({ color: "#333", fontSize: "12px" })}>
                          ₹{fmt0(product.gold_rate_snapshot)}/g
                        </td>
                        <td
                          style={cellBase({
                            textAlign: "right",
                            fontFamily: "'Playfair Display', serif",
                            fontSize: "15px",
                            color: "#111",
                            fontWeight: 600,
                          })}
                        >
                          ₹{fmt(goldValue)}
                        </td>
                      </tr>

                      {product.stones?.map((stone) => (
                        <tr key={stone.id}>
                          <td
                            style={cellBase({
                              fontFamily: "'Playfair Display', serif",
                              fontSize: "15px",
                              color: "#111",
                              fontWeight: 500,
                            })}
                          >
                            {stone.stone_name}
                          </td>
                          <td style={cellBase({ color: "#333", fontSize: "12px" })}>
                            {stone.weight ? `${Number(stone.weight).toFixed(2)} ct` : "—"}
                          </td>
                          <td style={cellBase({ color: "#333", fontSize: "12px" })}>
                            {stone.price_per_carat ? `₹${fmt0(stone.price_per_carat)}/ct` : "—"}
                          </td>
                          <td
                            style={cellBase({
                              textAlign: "right",
                              fontFamily: "'Playfair Display', serif",
                              fontSize: "14px",
                              color: "#333",
                            })}
                          >
                            ₹{fmt(Number(stone.total_price || 0))}
                          </td>
                        </tr>
                      ))}

                    </tbody>
                  </table>

                </div>
              </div>

              {/* Full-width summary table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "10px 12px", borderTop: "2px solid #222", borderBottom: "1px solid #e8e8e8", fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 500, color: "#111" }}>
                      Material Costing
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", borderTop: "2px solid #222", borderBottom: "1px solid #e8e8e8", fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 600, color: "#111", whiteSpace: "nowrap" }}>
                      ₹{fmt(costing)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 12px", borderBottom: "2px solid #222", fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 500, color: "#111" }}>
                      Labour / Making Charges
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "2px solid #222", fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 600, color: "#111", whiteSpace: "nowrap" }}>
                      ₹{fmt(makingCharges)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 12px", fontSize: "10px", letterSpacing: "0.4em", color: "#111", textTransform: "uppercase", fontWeight: 700 }}>
                      Total Value
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "'Playfair Display', serif", fontSize: "28px", color: "#111", fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                      ₹{fmt(finalPrice)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div>
                <div
                  style={{
                    borderTop: `1.5px solid ${G}`,
                    borderBottom: `1.5px solid ${G}`,
                    padding: "18px 24px",
                    textAlign: "center",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.6em",
                      color: "#535050ff",
                      textTransform: "uppercase",
                      margin: "0 0 10px",
                      fontWeight: 700,
                    }}
                  >
                    ◆ &nbsp; Buyback Policy &nbsp; ◆
                  </p>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "13px",
                      color: "#444",
                      lineHeight: 1.8,
                      margin: 0,
                      fontStyle: "italic",
                      fontWeight: 400,
                    }}
                  >
                    This piece is eligible for buyback at{" "}
                    <span style={{ fontStyle: "normal", fontWeight: 700, color: "#111" }}>
                      {buybackPct}% of the original sale price
                    </span>
                    , with the gold component adjusted to the prevailing gold rate at the time of return.
                  </p>
                </div>

                <div style={{ height: "1px", background: G, marginBottom: "12px" }} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ color: G, fontSize: "5px" }}>◆</span>
                  <p
                    style={{
                      fontSize: "8px",
                      letterSpacing: "0.55em",
                      color: "#454242ff",
                      textTransform: "uppercase",
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    Neelima Jewels
                  </p>
                  <span style={{ color: G, fontSize: "5px" }}>◆</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {done && (
          <div className="no-print" style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <button onClick={handlePrint} className="btn-gold">
              ⎙ Print Certificate
            </button>
            <Link href={`/products/${id}`}>
              <button className="btn-outline">Back to Product</button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}