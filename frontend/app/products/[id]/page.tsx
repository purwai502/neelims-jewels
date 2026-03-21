"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ProductTag from "../../components/ProductTag";

interface BuybackRecord {
  transaction_id:     string;
  date:               string;
  amount:             number;
  gold_rate_snapshot: number | null;
  notes:              string | null;
  client: { id: string; full_name: string; phone: string | null } | null;
}

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
  cost_price: number | null;
  vendor_id: string | null;
  barcode: string;
  order_id: string | null;
  image_path: string | null;
  stones: Stone[];
}

const fmt  = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const PURITY_MULTIPLIER: Record<string, number> = {
  "24K": 1.0, "22K": 0.9167, "18K": 0.75, "14K": 0.5833,
};

export default function ProductDetailPage() {
  const router    = useRouter();
  const params    = useParams();
  const id        = params.id as string;

  const [product,      setProduct]      = useState<Product | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [showTag,      setShowTag]      = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [markingSold,  setMarkingSold]  = useState(false);
  const [buybacks,     setBuybacks]     = useState<BuybackRecord[]>([]);
  const [vendorName,   setVendorName]   = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const h = { "Authorization": `Bearer ${token}` };
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`, { headers: h }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/buybacks/product/${id}`, { headers: h }).then(r => r.json()),
    ]).then(([productData, buybackData]) => {
      setProduct(productData);
      setBuybacks(Array.isArray(buybackData) ? buybackData : []);
      setLoading(false);
      if (productData?.vendor_id) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendors/${productData.vendor_id}`, { headers: h })
          .then(r => r.json())
          .then(v => setVendorName(v?.business_name || null))
          .catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, [id, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    setUploading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${product.id}/image`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const updated = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json());
      setProduct(updated);
    }
    setUploading(false);
  };

  const handleMarkSold = async () => {
    if (!product) return;
    setMarkingSold(true);
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${product.id}/mark-sold`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (res.ok) {
      const updated = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json());
      setProduct(updated);
    }
    setMarkingSold(false);
  };

  if (loading) return (
    <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
      Loading...
    </p>
  );
  if (!product) return <p style={{ color: "#E05C7A" }}>Product not found.</p>;

  const purityKey     = product.purity?.includes("24") ? "24K"
                      : product.purity?.includes("22") ? "22K"
                      : product.purity?.includes("18") ? "18K"
                      : product.purity?.includes("14") ? "14K" : "22K";
  const multiplier    = PURITY_MULTIPLIER[purityKey] || 1;
  const netGoldWeight = product.gold_weight != null
                      ? Number(product.gold_weight)
                      : Number(product.weight) * multiplier;
  const goldValue     = netGoldWeight * Number(product.gold_rate_snapshot);
  const stonesTotal   = product.stones?.reduce((s, st) => s + Number(st.total_price || 0), 0) || 0;
  const costing       = goldValue + stonesTotal;
  const makingCharges = Number(product.making_charges) || 0;
  const finalPrice    = Number(product.total_price) || 0;

  const metalMatch = product.description?.match(/^\[(.+?)\]/);
  const metalType  = metalMatch ? metalMatch[1] : "Gold";
  const cleanDesc  = product.description?.replace(/^\[.+?\]\s*/, "") || "";

  return (
    <div style={{ maxWidth: "900px" }}>
      {showTag && <ProductTag product={product} onClose={() => setShowTag(false)} />}

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Link href="/products" style={{ textDecoration: "none" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px", cursor: "pointer" }}>
            ← Back to Products
          </p>
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <p className="label-caps" style={{ margin: 0 }}>✦ &nbsp; {product.barcode}</p>
              <span style={{
                fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase",
                padding: "3px 10px",
                border: `1px solid ${product.is_sold ? "rgba(92,184,122,0.4)" : "rgba(201,168,76,0.4)"}`,
                color: product.is_sold ? "#5CB87A" : "var(--gold)",
                fontFamily: "'Didact Gothic', sans-serif",
              }}>{product.is_sold ? "Sold" : "Available"}</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "38px", fontWeight: 400, fontStyle: "italic", color: "var(--text-primary)", lineHeight: 1.1 }}>
              {product.name}
            </h1>
            {cleanDesc && (
              <p style={{ fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic", color: "var(--text-muted)", marginTop: "6px" }}>
                {cleanDesc}
              </p>
            )}
          </div>
          <button onClick={() => setShowTag(true)} className="btn-outline" style={{ fontSize: "11px", marginTop: "8px", flexShrink: 0 }}>
            Generate Tag
          </button>
        </div>
      </div>

      {/* Image + Costing Sheet */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "24px", alignItems: "start" }}>

        {/* Image */}
        <div>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-gold)",
            aspectRatio: "1", display: "flex", alignItems: "center",
            justifyContent: "center", overflow: "hidden", marginBottom: "12px",
          }}>
            {product.image_path ? (
              <img src={`${process.env.NEXT_PUBLIC_API_URL}/${product.image_path}`} alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--gold)", fontSize: "32px", marginBottom: "8px" }}>◇</p>
                <p style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em" }}>No image</p>
              </div>
            )}
          </div>
          <label style={{
            display: "block", textAlign: "center", padding: "8px",
            border: "1px dashed var(--border)", cursor: "pointer",
            fontSize: "10px", letterSpacing: "0.1em", color: "var(--text-muted)",
          }}>
            {uploading ? "Uploading…" : product.image_path ? "Replace Image" : "+ Upload Image"}
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
        </div>

        {/* Costing Sheet */}
        <div style={{ border: "1px solid var(--border-gold)", overflow: "hidden" }}>

          {/* Sheet header */}
          <div style={{
            background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)",
            padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {product.image_path && (
                <div style={{
                  width: "64px", height: "64px", flexShrink: 0,
                  border: "1px solid var(--border-gold)", overflow: "hidden",
                }}>
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}/${product.image_path}`}
                    alt={product.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}
              <div>
                <p className="label-caps" style={{ fontSize: "8px", marginBottom: "4px" }}>Costing Sheet</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", color: "var(--text-primary)" }}>{product.name}</p>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "2px" }}>PURITY</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "var(--gold)" }}>{purityKey}</p>
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            {["Item", "Weight / Qty", "Rate", "Cost"].map(h => (
              <div key={h} style={{ padding: "8px 14px", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", borderRight: "1px solid var(--border)" }}>{h}</div>
            ))}
          </div>

          {/* Gross weight */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)", background: "rgba(201,168,76,0.03)" }}>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Gross Weight</p>
            </div>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: "var(--text-primary)" }}>{Number(product.weight).toFixed(3)} g</p>
            </div>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{purityKey}</p>
            </div>
            <div style={{ padding: "10px 14px" }} />
          </div>

          {/* Gold weight */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)", background: "rgba(201,168,76,0.03)" }}>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Gold Weight</p>
            </div>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: "var(--text-primary)" }}>{netGoldWeight.toFixed(3)} g</p>
            </div>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }} />
            <div style={{ padding: "10px 14px" }} />
          </div>

          {/* Gold row */}
          <CostRow
            label={metalType}
            weight={`${netGoldWeight.toFixed(3)} g`}
            rate={`₹${fmt0(product.gold_rate_snapshot)}/g`}
            cost={goldValue}
            highlight
          />

          {/* Stones */}
          {product.stones?.map(stone => (
            <CostRow
              key={stone.id}
              label={stone.stone_name}
              weight={stone.weight ? `${Number(stone.weight).toFixed(2)} ct` : "—"}
              rate={stone.price_per_carat ? `₹${fmt0(stone.price_per_carat)}/ct` : "—"}
              cost={Number(stone.total_price || 0)}
              notes={stone.notes}
            />
          ))}

          {/* Costing subtotal */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderTop: "2px solid var(--border-gold)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ padding: "11px 14px", gridColumn: "1 / 4", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>Costing (Material Total)</p>
            </div>
            <div style={{ padding: "11px 14px" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", color: "var(--text-primary)", fontWeight: 600 }}>₹{fmt(costing)}</p>
            </div>
          </div>

          {/* Labour */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
            <div style={{ padding: "11px 14px", gridColumn: "1 / 4", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Labour / Making Charges</p>
            </div>
            <div style={{ padding: "11px 14px" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", color: "#5CB87A" }}>₹{fmt(makingCharges)}</p>
            </div>
          </div>

          {/* Final Price */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--gold-subtle)", borderTop: "2px solid var(--border-gold)" }}>
            <div style={{ padding: "16px 20px", gridColumn: "1 / 4", borderRight: "1px solid var(--border-gold)" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>Final Price</p>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "var(--gold)", fontWeight: 600 }}>₹{fmt(finalPrice)}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Info strip */}
      <div style={{
        marginTop: "20px", padding: "16px 20px",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        display: "flex", gap: "40px", flexWrap: "wrap",
      }}>
        {[
          { label: "Barcode",     value: product.barcode },
          { label: "Gold Rate",   value: `₹${fmt0(product.gold_rate_snapshot)}/g (at creation)` },
          { label: "Order",       value: product.order_id ? product.order_id.slice(0, 8) + "…" : "Stock item" },
          ...(vendorName ? [{ label: "Vendor", value: vendorName }] : []),
          ...(product.cost_price ? [{ label: "Studio Cost", value: `₹${fmt(product.cost_price)}` }] : []),
          ...(product.cost_price && product.is_sold
            ? [{ label: "Gross Profit", value: `₹${fmt(finalPrice - product.cost_price)}` }]
            : []),
        ].map(({ label, value }) => (
          <div key={label}>
            <p style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: label === "Gross Profit" ? "#5CB87A" : label === "Studio Cost" ? "#E8A45A" : "var(--gold)", marginBottom: "4px" }}>{label}</p>
            <p style={{ fontSize: "12px", color: label === "Gross Profit" ? "#5CB87A" : label === "Studio Cost" ? "#E8A45A" : "var(--text-secondary)", fontFamily: "'Didact Gothic', sans-serif" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Process Sale */}
{!product.is_sold && (
  <div style={{ marginTop: "24px" }}>
    <Link href={`/products/${product.id}/sale`}>
      <button className="btn-gold">Process Sale</button>
    </Link>
  </div>
)}
{product.is_sold && (
  <div style={{ marginTop: "24px", padding: "14px 20px", background: "rgba(92,184,122,0.08)", border: "1px solid rgba(92,184,122,0.3)" }}>
    <p style={{ color: "#5CB87A", fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic" }}>
      ✓ This piece has been sold
    </p>
  </div>
)}

      {/* Buyback History */}
      {buybacks.length > 0 && (
        <div style={{ marginTop: "32px", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
          <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
            <p className="label-caps" style={{ fontSize: "9px" }}>Buyback History</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            {["Client", "Gold Rate", "Buyback Value", "Date"].map(h => (
              <div key={h} style={{ padding: "8px 14px", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", borderRight: "1px solid var(--border)" }}>{h}</div>
            ))}
          </div>
          {buybacks.map(b => (
            <div key={b.transaction_id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
              <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "'Playfair Display', serif" }}>{b.client?.full_name ?? "—"}</p>
                {b.client?.phone && <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{b.client.phone}</p>}
              </div>
              <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{b.gold_rate_snapshot ? `₹${fmt0(b.gold_rate_snapshot)}/g` : "—"}</p>
              </div>
              <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: "var(--gold)" }}>₹{fmt(b.amount)}</p>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

function CostRow({ label, sublabel, weight, rate, cost, notes, highlight }: {
  label: string; sublabel?: string; weight: string; rate: string;
  cost: number; notes?: string; highlight?: boolean;
}) {
  const fmt = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
      borderBottom: "1px solid var(--border)",
      background: highlight ? "rgba(201,168,76,0.06)" : "transparent",
    }}>
      <div style={{ padding: "11px 14px", borderRight: "1px solid var(--border)" }}>
        <p style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "'Playfair Display', serif" }}>{label}</p>
        {sublabel && <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{sublabel}</p>}
        {notes    && <p style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "2px" }}>{notes}</p>}
      </div>
      <div style={{ padding: "11px 14px", borderRight: "1px solid var(--border)" }}>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{weight}</p>
      </div>
      <div style={{ padding: "11px 14px", borderRight: "1px solid var(--border)" }}>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{rate}</p>
      </div>
      <div style={{ padding: "11px 14px" }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: highlight ? "var(--gold)" : "var(--text-primary)" }}>
          ₹{fmt(cost)}
        </p>
      </div>
    </div>
  );
}