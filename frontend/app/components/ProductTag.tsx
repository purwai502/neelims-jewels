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

// Real label: 100mm long x 15mm tall, printed horizontally (Landscape).
// Layout, left to right: barcode (32.5%) — logo (32.5%) — blank tail
// (35%, loops through the piece, left unprinted). Zone widths are
// percentages of the parent rather than fixed pixels on purpose: the
// parent's own width switches from a pixel value on screen to a millimeter
// value in print (see @media print below), and fixed-pixel children don't
// rescale when that happens — they stayed a fixed absolute size while the
// parent became 100mm, throwing off the whole layout only when printed.
// In this orientation the barcode's own reading direction lines up with
// the zone's width too, so it doesn't need to be rotated like the portrait
// version did.
const SCALE   = 7;
const LABEL_W = 100 * SCALE;
const LABEL_H = 15  * SCALE;

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
          /* The on-screen modal centers the label in the viewport, which
             looks right on screen but centers it inside the print canvas
             too — pushing the barcode/logo off the left edge and the
             blank tail into the middle instead of the end. Pin it to the
             page's top-left origin for print instead. */
          #tag-print-root {
            align-items: flex-start !important;
            justify-content: flex-start !important;
          }
          .sticker-label { width: 100mm !important; height: 15mm !important; }
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
          display: "flex", flexDirection: "row", position: "relative",
          background: "#FAFAF8", overflow: "hidden",
        }}>
          {/* Barcode — first 32.5mm */}
          <div style={{
            width: "32.5%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            <svg ref={barcodeRef} style={{ maxWidth: "92%", maxHeight: "82%", transform: "translateY(12%)" }} />
          </div>

          {/* Logo — next 32.5mm, centered, upright */}
          <div style={{
            width: "32.5%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src="/neelima-logo.png"
              alt="Neelima Jewels"
              style={{ height: "78%", width: "auto", objectFit: "contain" }}
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
          }}>100 × 15 mm · barcode 32.5mm + logo 32.5mm + 35mm blank tail · print in Landscape</p>

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
