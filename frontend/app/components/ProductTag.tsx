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

// Real label size: 100mm x 15mm, folding at the 50mm midpoint (dotted
// perforation on the physical label) into two 50mm x 15mm halves — the
// half nearer the tail is the front (logo), the far half is the back
// (barcode). Preview scale: 7px per mm → 700x105px on screen.
const SCALE = 7;
const LABEL_W = 100 * SCALE;
const LABEL_H = 15 * SCALE;
const HALF_W  = 50 * SCALE;

export default function ProductTag({ product, onClose }: ProductTagProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Portal this whole modal straight onto document.body, outside the page's
  // own DOM tree entirely. Without this, hiding "everything except the tag"
  // via visibility/overflow tricks still leaves the rest of this (much
  // taller) product page in the layout, and at a 15mm page height that
  // leftover space gets sliced into dozens of blank printed pages — a
  // browser print-pagination quirk that isn't fixable with CSS alone once
  // the tag is nested inside the page. Portaling makes it a direct sibling
  // of the page root, so `body > *:not(#tag-print-root)` below can remove
  // literally everything else from the print render in one shot.
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
          width:         1.3,
          height:        34,
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

          /* Hard backstop: clamp html/body themselves to exactly the label's
             height with no margin and no overflow, so even a stray pixel of
             leftover spacing (scrollbar reservation, a rounding difference,
             anything not caught by the rule above) can't spill onto a
             second page. */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 15mm !important;
            overflow: hidden !important;
          }

          #tag-print-root {
            position: static !important;
            inset: auto !important;
            background: none !important;
            display: block !important;
            height: 15mm !important;
            overflow: hidden !important;
          }
          .sticker-label {
            width: 100mm !important;
            height: 15mm !important;
          }
          .no-print { display: none !important; }
        }

        @page {
          size: 100mm 15mm;
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
          display: "flex", position: "relative",
          background: "#FAFAF8", overflow: "hidden",
        }}>
          {/* Front half — nearer the tail — logo */}
          <div style={{
            width: HALF_W, height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src="/neelima-logo.png"
              alt="Neelima Jewels"
              style={{ height: "78%", width: "auto", objectFit: "contain" }}
            />
          </div>

          {/* Fold guide — lines up with the label's physical perforation */}
          <div style={{
            position: "absolute", left: HALF_W, top: 0, bottom: 0,
            borderLeft: "1px dashed rgba(26,6,34,0.35)",
          }} />

          {/* Back half — far side of the fold — barcode only */}
          <div style={{
            width: HALF_W, height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
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
          }}>Peel · Fold at the dotted line · Front (logo) and back (barcode) stick together</p>
          <p style={{
            fontFamily:  "'Didact Gothic', sans-serif",
            fontSize:    "10px",
            color:       "rgba(255,255,255,0.25)",
            letterSpacing:"0.06em",
            marginBottom:"20px",
          }}>Label size 100 × 15 mm</p>

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
