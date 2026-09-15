"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ProductTagProps {
  product: {
    name: string;
    barcode: string;
  };
  onClose: () => void;
}

// Real label: 15mm wide x 100mm long, printed in Portrait (Landscape has
// been confirmed dead on this printer — it feeds blank labels through).
// Layout, top to bottom on the printed label: barcode (32.5mm) — logo
// (32.5mm) — blank tail (35mm, loops through the piece, left unprinted).
const SCALE    = 7;
const LABEL_W  = 15   * SCALE;
const LABEL_H  = 100  * SCALE;
const ZONE_LEN = 32.5 * SCALE;

export default function ProductTag({ product, onClose }: ProductTagProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Portal this modal onto document.body so print CSS can hide the entire
  // rest of the page in one shot (`body > *:not(#tag-print-root)`), rather
  // than nesting it inside the current page where hidden content still
  // counted toward print pagination.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // `mounted` must stay a dependency: on the very first render (before
    // the portal's real DOM exists) barcodeRef.current is null, so this
    // no-ops — and since product.barcode never changes, it would never
    // fire again without `mounted` added.
    if (barcodeRef.current) {
      import("jsbarcode").then((JsBarcode) => {
        if (!barcodeRef.current) return;
        JsBarcode.default(barcodeRef.current, product.barcode, {
          format:        "CODE128",
          width:         1.4,
          height:        60,
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
  }, [product.barcode, mounted]);

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Didact+Gothic&display=swap');

        @media print {
          body > *:not(#tag-print-root) { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; }
          .sticker-label { width: 15mm !important; height: 100mm !important; }
          .no-print { display: none !important; }
        }

        @page {
          size: 15mm 100mm;
          margin: 0;
        }
      `}</style>

      {/* Overlay */}
      <div id="tag-print-root" style={{
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

        <div className="sticker-label" style={{
          width: LABEL_W, height: LABEL_H,
          position: "relative",
          background: "#FAFAF8", overflow: "hidden",
        }}>
          {/* Barcode — first 32.5mm. Its own length runs along this
              32.5mm zone (not squeezed into the label's 15mm width), so
              it's drawn sideways and rotated 90°: bar height fits within
              the 15mm width, barcode length uses the full 32.5mm.
              Scanners read it fine at any angle. */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: ZONE_LEN,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            <div style={{
              width: ZONE_LEN * 0.9, height: LABEL_W * 0.9,
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: "rotate(90deg)",
            }}>
              <svg ref={barcodeRef} style={{ maxWidth: "100%", maxHeight: "100%" }} />
            </div>
          </div>

          {/* Logo — next 32.5mm, centered, upright */}
          <div style={{
            position: "absolute", top: ZONE_LEN, left: 0, width: "100%", height: ZONE_LEN,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src="/neelima-logo.png"
              alt="Neelima Jewels"
              style={{ width: "78%", height: "auto", objectFit: "contain" }}
            />
          </div>

          {/* Remaining 35mm — blank tail, deliberately left empty */}
        </div>

        {/* Instructions + buttons */}
        <div className="no-print" style={{ textAlign: "center" }}>
          <p style={{
            fontFamily:  "'Cormorant', serif",
            fontSize:    "14px",
            fontStyle:   "italic",
            color:       "rgba(201,168,76,0.55)",
            marginBottom:"6px",
          }}>Peel · Loop the tail through</p>
          <p style={{
            fontFamily:  "'Didact Gothic', sans-serif",
            fontSize:    "10px",
            color:       "rgba(255,255,255,0.25)",
            letterSpacing:"0.06em",
            marginBottom:"20px",
          }}>15 × 100 mm · barcode 32.5mm + logo 32.5mm + 35mm blank tail · print in Portrait</p>

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
    </>,
    document.body
  );
}
