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

// Real label: a 15mm wide x 100mm long strip, printed in Portrait (confirmed
// by a physical test print — Landscape fed blank labels through entirely).
// Of that 100mm length: the first 35mm is the tail (loops through the
// piece, printed blank), and the remaining 65mm is the actual tag area,
// split evenly in half by the label's built-in fold perforation — the
// 32.5mm nearer the tail is the front (logo), the 32.5mm at the far end is
// the back (barcode). Preview scale: 7px per mm.
const SCALE    = 7;
const LABEL_W  = 15   * SCALE;
const LABEL_H  = 100  * SCALE;
const TAIL_LEN = 35   * SCALE;
const HALF_LEN = 32.5 * SCALE; // front and back are each half of the 65mm tag area

export default function ProductTag({ product, onClose }: ProductTagProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Portal this whole modal straight onto document.body, outside the page's
  // own DOM tree entirely. Without this, hiding "everything except the tag"
  // via visibility tricks still leaves the rest of this (much taller)
  // product page in the layout, and at this page's tiny height that
  // leftover space gets sliced into dozens of blank printed pages.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // `mounted` is a dependency on purpose: the very first render (before
    // the portal's real DOM exists) has barcodeRef.current === null, so
    // this effect fires once and no-ops. Without `mounted` in the deps it
    // would never run again — product.barcode doesn't change — leaving the
    // barcode blank forever, on screen and in print alike.
    if (barcodeRef.current) {
      import("jsbarcode").then((JsBarcode) => {
        if (!barcodeRef.current) return;
        JsBarcode.default(barcodeRef.current, product.barcode, {
          format:        "CODE128",
          width:         1.4,
          height:        40,
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
          /* This is the only thing allowed to print — everything else on
             the page (which #tag-print-root is now a sibling of, thanks to
             the portal) is fully removed from the render tree, not just
             hidden, so it can't contribute any extra blank pages. */
          body > *:not(#tag-print-root) { display: none !important; }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100mm !important;
            overflow: hidden !important;
          }

          #tag-print-root {
            position: static !important;
            inset: auto !important;
            background: none !important;
            display: block !important;
            height: 100mm !important;
            overflow: hidden !important;
          }
          .sticker-label {
            width: 15mm !important;
            height: 100mm !important;
          }
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
          {/* Tail — first 35mm, blank, loops through the piece */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: TAIL_LEN }} />

          {/* Front — 32.5mm nearer the tail — logo (kept upright) */}
          <div style={{
            position: "absolute", top: TAIL_LEN, left: 0, width: "100%", height: HALF_LEN,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src="/neelima-logo.png"
              alt="Neelima Jewels"
              style={{ width: "78%", height: "auto", objectFit: "contain" }}
            />
          </div>

          {/* Fold guide — between front and back, lines up with the
              label's physical perforation */}
          <div style={{
            position: "absolute", top: TAIL_LEN + HALF_LEN, left: 0, right: 0,
            borderTop: "1px dashed rgba(26,6,34,0.35)",
          }} />

          {/* Back — far 32.5mm — barcode, displayed normally/horizontally
              like the logo (not rotated). It's visually small given only
              15mm of width to work with, but that's the intended tradeoff. */}
          <div style={{
            position: "absolute", top: TAIL_LEN + HALF_LEN, left: 0, width: "100%", height: HALF_LEN,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            <svg ref={barcodeRef} style={{ maxWidth: "92%", maxHeight: "88%" }} />
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
          }}>Peel · Loop the tail through · Fold front (logo) and back (barcode) together</p>
          <p style={{
            fontFamily:  "'Didact Gothic', sans-serif",
            fontSize:    "10px",
            color:       "rgba(255,255,255,0.25)",
            letterSpacing:"0.06em",
            marginBottom:"20px",
          }}>15 × 100 mm · 35mm tail + 32.5mm front + 32.5mm back · print in Portrait</p>

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
