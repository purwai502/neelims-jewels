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

// Preview scale: 10px per mm → 450×150px cards
const W = 450;
const H = 150;

export default function ProductTag({ product, onClose }: ProductTagProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      import("jsbarcode").then((JsBarcode) => {
        JsBarcode.default(barcodeRef.current, product.barcode, {
          format:        "CODE128",
          width:         1.4,
          height:        36,
          displayValue:  true,
          font:          "Didact Gothic",
          textAlign:     "center",
          textPosition:  "bottom",
          textMargin:    3,
          fontSize:      9,
          background:    "transparent",
          lineColor:     "#1A0622",
          margin:        0,
        });
      });
    }
  }, [product.barcode]);

  const cardBase: React.CSSProperties = {
    width:    W,
    height:   H,
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  };

  // Hole indicator circle — left side, vertically centered
  const holeCircle: React.CSSProperties = {
    position:    "absolute",
    left:        28,
    top:         "50%",
    transform:   "translateY(-50%)",
    width:       14,
    height:      14,
    borderRadius:"50%",
    zIndex:      2,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Didact+Gothic&display=swap');

        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: fixed !important;
            top: 10mm !important;
            left: 10mm !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6mm !important;
          }
          .tag-card {
            width: 45mm !important;
            height: 15mm !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Overlay */}
      <div style={{
        position:        "fixed",
        inset:           0,
        background:      "rgba(0,0,0,0.85)",
        zIndex:          1000,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        flexDirection:   "column",
        gap:             "36px",
      }}>

        <div className="print-area" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* ── FRONT ── */}
          <div>
            <p className="no-print" style={{ fontFamily: "'Didact Gothic', sans-serif", fontSize: "9px", letterSpacing: "0.25em", color: "rgba(201,168,76,0.5)", textTransform: "uppercase", marginBottom: "8px" }}>
              Front · Print on cardstock
            </p>
            <div className="tag-card" style={{ ...cardBase, background: "#1A0622" }}>
              {/* Gold edge lines */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #C9A84C 20%, #C9A84C 80%, transparent)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #C9A84C 20%, #C9A84C 80%, transparent)" }} />

              {/* Hole indicator */}
              <div style={{ ...holeCircle, border: "1.5px dashed rgba(201,168,76,0.45)" }} />

              {/* Brand — centred in area after hole */}
              <div style={{
                position:      "absolute",
                left:          60,
                right:         0,
                top:           0,
                bottom:        0,
                display:       "flex",
                flexDirection: "column",
                alignItems:    "center",
                justifyContent:"center",
              }}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize:   "34px",
                  fontWeight: 400,
                  fontStyle:  "italic",
                  color:      "#C9A84C",
                  lineHeight: 1,
                  marginBottom: "4px",
                }}>Neelima</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "20px", height: "0.5px", background: "rgba(201,168,76,0.5)" }} />
                  <span style={{ color: "#C9A84C", fontSize: "7px", opacity: 0.7 }}>✦</span>
                  <p style={{
                    fontFamily:    "'Playfair Display', serif",
                    fontSize:      "13px",
                    fontWeight:    600,
                    color:         "#E8CC7A",
                    letterSpacing: "0.22em",
                  }}>JEWELS</p>
                  <span style={{ color: "#C9A84C", fontSize: "7px", opacity: 0.7 }}>✦</span>
                  <div style={{ width: "20px", height: "0.5px", background: "rgba(201,168,76,0.5)" }} />
                </div>
              </div>

              {/* Corner ornaments */}
              <span style={{ position: "absolute", top: "8px", right: "12px", color: "#C9A84C", fontSize: "8px", opacity: 0.35 }}>✦</span>
              <span style={{ position: "absolute", bottom: "8px", right: "12px", color: "#C9A84C", fontSize: "8px", opacity: 0.35 }}>✦</span>
            </div>
          </div>

          {/* ── BACK ── */}
          <div>
            <p className="no-print" style={{ fontFamily: "'Didact Gothic', sans-serif", fontSize: "9px", letterSpacing: "0.25em", color: "rgba(201,168,76,0.5)", textTransform: "uppercase", marginBottom: "8px" }}>
              Back · Flip &amp; print on reverse
            </p>
            <div className="tag-card" style={{ ...cardBase, background: "#FAFAF8" }}>
              {/* Inner border */}
              <div style={{ position: "absolute", inset: "3px", border: "0.5px solid rgba(201,168,76,0.3)", pointerEvents: "none" }} />

              {/* Hole indicator */}
              <div style={{ ...holeCircle, border: "1.5px dashed rgba(201,168,76,0.6)" }} />

              {/* Content after hole */}
              <div style={{
                position:   "absolute",
                left:       60,
                right:      8,
                top:        8,
                bottom:     8,
                display:    "flex",
                alignItems: "center",
                gap:        "12px",
              }}>
                {/* Barcode */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <svg ref={barcodeRef} style={{ maxWidth: "100%", maxHeight: "100%" }} />
                </div>

                {/* Purity + Weight */}
                <div style={{ flexShrink: 0, paddingLeft: "12px", borderLeft: "1px solid rgba(201,168,76,0.25)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <p style={{ fontSize: "7px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#C9A84C", marginBottom: "1px" }}>Purity</p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#1A0622", lineHeight: 1 }}>{product.purity}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "7px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#C9A84C", marginBottom: "1px" }}>Weight</p>
                    <p style={{ fontSize: "13px", color: "#1A0622", lineHeight: 1, fontFamily: "'Playfair Display', serif" }}>{Number(product.weight).toFixed(3)}g</p>
                  </div>
                  {product.stones && product.stones.length > 0 && (
                    <div>
                      <p style={{ fontSize: "7px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#C9A84C", marginBottom: "1px" }}>Stone</p>
                      <p style={{ fontSize: "10px", color: "#1A0622", lineHeight: 1 }}>{product.stones.map(s => s.stone_name).join(", ")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Instructions + buttons */}
        <div className="no-print" style={{ textAlign: "center" }}>
          <p style={{
            fontFamily:  "'Cormorant', serif",
            fontSize:    "14px",
            fontStyle:   "italic",
            color:       "rgba(201,168,76,0.55)",
            marginBottom:"6px",
          }}>Print both on cardstock · Cut · Glue back-to-back · Punch hole · Add thread</p>
          <p style={{
            fontFamily:  "'Didact Gothic', sans-serif",
            fontSize:    "10px",
            color:       "rgba(255,255,255,0.25)",
            letterSpacing:"0.06em",
            marginBottom:"20px",
          }}>Tag size 45 × 15 mm</p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={() => window.print()} className="btn-gold">
              Print Tag
            </button>
            <button onClick={onClose} style={{
              background:    "transparent",
              color:         "rgba(201,168,76,0.7)",
              border:        "1px solid rgba(201,168,76,0.3)",
              padding:       "12px 32px",
              fontFamily:    "'Didact Gothic', sans-serif",
              fontSize:      "11px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor:        "pointer",
            }}>Close</button>
          </div>
        </div>

      </div>
    </>
  );
}
