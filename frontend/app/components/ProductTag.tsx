"use client";
import { useEffect, useRef } from "react";

interface ProductTagProps {
  product: {
    name: string;
    barcode: string;
    weight: number;
    purity: string;
    description?: string;
    stones?: { stone_name: string; weight: number }[];
  };
  onClose: () => void;
}

export default function ProductTag({ product, onClose }: ProductTagProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      import("jsbarcode").then((JsBarcode) => {
        JsBarcode.default(barcodeRef.current, product.barcode, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          font: "Didact Gothic",
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 4,
          fontSize: 12,
          background: "#ffffff",
          lineColor: "#1A0622",
          margin: 8,
        });
      });
    }
  }, [product.barcode]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Didact+Gothic&display=swap');
        @media print {
          body * { visibility: hidden !important; }
          .print-tag, .print-tag * { visibility: visible !important; }
          .print-tag {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Overlay */}
      <div style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "32px",
      }}>

        {/* Tag */}
        <div className="print-tag" style={{
          display: "flex",
          filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.4))",
        }}>

          {/* SIDE A — Brand only */}
          <div style={{
            width: "160px",
            height: "240px",
            background: "#1A0622",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            borderRight: "1px solid rgba(201,168,76,0.3)",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
            <span style={{ position: "absolute", top: "10px", left: "12px", color: "#C9A84C", fontSize: "7px", opacity: 0.6 }}>✦</span>
            <span style={{ position: "absolute", top: "10px", right: "12px", color: "#C9A84C", fontSize: "7px", opacity: 0.6 }}>✦</span>
            <span style={{ position: "absolute", bottom: "10px", left: "12px", color: "#C9A84C", fontSize: "7px", opacity: 0.6 }}>✦</span>
            <span style={{ position: "absolute", bottom: "10px", right: "12px", color: "#C9A84C", fontSize: "7px", opacity: 0.6 }}>✦</span>

            <div style={{ textAlign: "center", padding: "0 20px" }}>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "20px",
                fontWeight: 400,
                fontStyle: "italic",
                color: "#C9A84C",
                lineHeight: 1.2,
                marginBottom: "6px",
              }}>Neelima</p>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "18px",
                fontWeight: 600,
                color: "#E8CC7A",
                letterSpacing: "0.12em",
              }}>Jewels</p>
            </div>
          </div>

          {/* SIDE B — Product Info */}
          <div style={{
            width: "200px",
            height: "240px",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", inset: "4px",
              border: "1px solid rgba(201,168,76,0.25)",
              pointerEvents: "none",
            }} />

            <div style={{ flex: 1, paddingTop: "8px" }}>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#1A0622",
                lineHeight: 1.2,
                marginBottom: "8px",
              }}>{product.name}</p>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.4)" }} />
                <span style={{ color: "#C9A84C", fontSize: "6px" }}>✦</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <p style={{ fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#C9A84C" }}>Purity</p>
                  <p style={{ fontSize: "11px", fontFamily: "'Playfair Display', serif", color: "#1A0622" }}>{product.purity}</p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <p style={{ fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#C9A84C" }}>Weight</p>
                  <p style={{ fontSize: "11px", color: "#1A0622" }}>{product.weight}g</p>
                </div>
                {product.stones && product.stones.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <p style={{ fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#C9A84C" }}>Stones</p>
                    <p style={{ fontSize: "11px", color: "#1A0622" }}>{product.stones.map(s => s.stone_name).join(", ")}</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <svg ref={barcodeRef} />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="no-print" style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => window.print()} className="btn-gold">
            Print Tag
          </button>
          <button onClick={onClose} style={{
            background: "transparent",
            color: "rgba(201,168,76,0.7)",
            border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: "2px",
            padding: "12px 32px",
            fontFamily: "'Didact Gothic', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}>
            Close
          </button>
        </div>

      </div>
    </>
  );
}