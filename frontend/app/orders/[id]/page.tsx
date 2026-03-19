"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Order {
  id: string;
  client_id: string | null;
  status: string;
  estimated_weight: number | null;
  estimated_gold_weight: number | null;
  estimated_purity: string | null;
  estimated_price: number | null;
  final_price: number | null;
  notes: string | null;
  locked_at: string | null;
  created_at: string | null;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  weight: number;
  gold_weight: number | null;
  purity: string;
  making_charges: number;
  gold_rate_snapshot: number;
  total_price: number;
  description: string;
  stones: Stone[];
}

interface Stone {
  id: string;
  stone_name: string;
  weight: number;
  price_per_carat: number;
  total_price: number;
  notes: string;
}

interface Client {
  id: string;
  full_name: string;
  phone: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#C9A84C", LOCKED: "#7A9EE0", COMPLETED: "#5CB87A", CANCELLED: "#E05C7A",
};

const PURITY_MULT: Record<string, number> = {
  "24K": 1.0, "22K": 0.9167, "18K": 0.75, "14K": 0.5833,
};

const fmt  = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id     = params.id as string;

  const [order,      setOrder]      = useState<Order | null>(null);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [client,     setClient]     = useState<Client | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [finalPrice, setFinalPrice] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  const role      = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const canManage = role === "OWNER" || role === "MANAGER";

  const fetchAll = () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const h = { "Authorization": `Bearer ${token}` };

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`, { headers: h })
      .then(r => r.json())
      .then(async (orderData) => {
        setOrder(orderData);
        setFinalPrice(orderData.final_price?.toString() || "");

        // fetch client if exists
        if (orderData.client_id) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${orderData.client_id}`, { headers: h })
            .then(r => r.json()).then(setClient).catch(() => {});
        }

        // fetch products linked to this order
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/?order_id=${id}`, { headers: h })
          .then(r => r.json())
          .then(p => setProducts(Array.isArray(p) ? p : []))
          .catch(() => {});

        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleSetFinalPrice = async () => {
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ final_price: parseFloat(finalPrice) }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchAll();
    } catch { setError("Could not update price."); }
    setSaving(false);
  };

  const handleLock = async () => {
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}/lock`, {
        method: "POST", headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      fetchAll();
    } catch { setError("Could not lock order."); }
    setSaving(false);
  };

  const handleComplete = async () => {
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}/complete`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      fetchAll();
    } catch { setError("Could not complete order."); }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}/cancel`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      fetchAll();
    } catch { setError("Could not cancel order."); }
    setSaving(false);
  };

  if (loading) return (
    <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>Loading...</p>
  );
  if (!order) return <p style={{ color: "#E05C7A" }}>Order not found.</p>;

  // parse metal type from notes
  const metalMatch = order.notes?.match(/^\[(.+?)\]/);
  const metalType  = metalMatch ? metalMatch[1] : "Gold";
  const cleanNotes = order.notes?.replace(/^\[.+?\]\s*/, "") || "";

  // products totals
  const productsStonesTotal   = products.reduce((s, p) => s + (p.stones?.reduce((ss, st) => ss + Number(st.total_price || 0), 0) || 0), 0);
  const productsMakingCharges = products.reduce((s, p) => s + Number(p.making_charges || 0), 0);
  const productsTotal         = products.reduce((s, p) => s + Number(p.total_price || 0), 0);

  return (
    <div style={{ maxWidth: "900px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Link href="/orders" style={{ textDecoration: "none" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px", cursor: "pointer" }}>
            ← Back to Orders
          </p>
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p className="label-caps" style={{ marginBottom: "6px" }}>✦ &nbsp; Order Detail</p>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "6px" }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 400, color: "var(--text-primary)" }}>
                {metalType} Order
              </h1>
              <span style={{
                padding: "5px 14px",
                border: `1px solid ${STATUS_COLORS[order.status]}`,
                color: STATUS_COLORS[order.status],
                fontSize: "9px", letterSpacing: "0.15em",
                fontFamily: "'Didact Gothic', sans-serif",
              }}>{order.status}</span>
            </div>
            {cleanNotes && (
              <p style={{ fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic", color: "var(--text-muted)" }}>
                {cleanNotes}
              </p>
            )}
          </div>
          <Link href={`/products/new?order_id=${id}`}>
            <button className="btn-outline" style={{ fontSize: "11px", marginTop: "8px" }}>+ Add Product</button>
          </Link>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "8px", fontFamily: "'Didact Gothic', sans-serif" }}>
          {id}
          {order.created_at && ` · Created ${new Date(order.created_at).toLocaleDateString("en-IN")}`}
        </p>
      </div>

      {/* Client + Order info strip */}
      <div style={{
        padding: "16px 20px", marginBottom: "24px",
        background: "var(--bg-card)", border: "1px solid var(--border-gold)",
        display: "flex", gap: "40px", flexWrap: "wrap",
      }}>
        <div>
          <p style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>Client</p>
          <p style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "'Playfair Display', serif" }}>
            {client ? client.full_name : order.client_id ? "—" : "Stock Order"}
          </p>
          {client?.phone && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{client.phone}</p>}
        </div>
        <div>
          <p style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>Metal</p>
          <p style={{ fontSize: "13px", color: "var(--text-primary)" }}>{metalType}</p>
        </div>
        {order.estimated_purity && (
          <div>
            <p style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>Purity</p>
            <p style={{ fontSize: "13px", color: "var(--text-primary)" }}>{order.estimated_purity}</p>
          </div>
        )}
        {order.estimated_weight && (
          <div>
            <p style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>Est. Gross Weight</p>
            <p style={{ fontSize: "13px", color: "var(--text-primary)" }}>{order.estimated_weight} g</p>
          </div>
        )}
        {order.estimated_gold_weight && (
          <div>
            <p style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>Est. Gold Weight</p>
            <p style={{ fontSize: "13px", color: "var(--text-primary)" }}>{order.estimated_gold_weight} g</p>
          </div>
        )}
        {order.locked_at && (
          <div>
            <p style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>Locked At</p>
            <p style={{ fontSize: "13px", color: "var(--text-primary)" }}>{new Date(order.locked_at).toLocaleDateString("en-IN")}</p>
          </div>
        )}
      </div>

      {/* Products costing sheet */}
      {products.length > 0 && (
        <div style={{ marginBottom: "24px", border: "1px solid var(--border-gold)", overflow: "hidden" }}>

          <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
            <p className="label-caps" style={{ fontSize: "9px" }}>Products in this Order</p>
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            {["Product", "Weight / Stones", "Rate / Details", "Value"].map(h => (
              <div key={h} style={{ padding: "8px 14px", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", borderRight: "1px solid var(--border)" }}>{h}</div>
            ))}
          </div>

          {products.map(p => {
            const pk     = p.purity?.includes("24") ? "24K" : p.purity?.includes("22") ? "22K" : p.purity?.includes("18") ? "18K" : "14K";
            const goldW  = p.gold_weight != null ? Number(p.gold_weight) : Number(p.weight) * (PURITY_MULT[pk] || 1);
            const gv     = goldW * Number(p.gold_rate_snapshot);
            const st     = p.stones?.reduce((s, st) => s + Number(st.total_price || 0), 0) || 0;
            const metalM = p.description?.match(/^\[(.+?)\]/);
            const mType  = metalM ? metalM[1] : "Gold";

            return (
              <div key={p.id}>
                {/* Product header row */}
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(201,168,76,0.04)",
                }}>
                  <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                    <Link href={`/products/${p.id}`} style={{ textDecoration: "none" }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: "var(--gold)", cursor: "pointer" }}>{p.name}</p>
                    </Link>
                    <p style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px", letterSpacing: "0.1em" }}>{p.barcode} · {mType} {pk}</p>
                  </div>
                  <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Gross: {Number(p.weight).toFixed(3)} g</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Gold: {goldW.toFixed(3)} g</p>
                  </div>
                  <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>₹{fmt0(p.gold_rate_snapshot)}/g</p>
                  </div>
                  <div style={{ padding: "10px 14px" }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: "var(--gold)" }}>₹{fmt(gv)}</p>
                  </div>
                </div>

                {/* Stones for this product */}
                {p.stones?.map(stone => (
                  <div key={stone.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ padding: "8px 14px 8px 24px", borderRight: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "'Playfair Display', serif" }}>{stone.stone_name}</p>
                    </div>
                    <div style={{ padding: "8px 14px", borderRight: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{stone.weight ? `${Number(stone.weight).toFixed(2)} ct` : "—"}</p>
                    </div>
                    <div style={{ padding: "8px 14px", borderRight: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{stone.price_per_carat ? `₹${fmt0(stone.price_per_carat)}/ct` : "—"}</p>
                    </div>
                    <div style={{ padding: "8px 14px" }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", color: "var(--text-primary)" }}>₹{fmt(Number(stone.total_price || 0))}</p>
                    </div>
                  </div>
                ))}

                {/* Making charges for this product */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ padding: "8px 14px 8px 24px", gridColumn: "1 / 4", borderRight: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Labour / Making Charges</p>
                  </div>
                  <div style={{ padding: "8px 14px" }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", color: "#5CB87A" }}>₹{fmt(Number(p.making_charges || 0))}</p>
                  </div>
                </div>

                {/* Product total */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "2px solid var(--border-gold)" }}>
                  <div style={{ padding: "10px 14px", gridColumn: "1 / 4", borderRight: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      {p.name} — Final Price
                    </p>
                  </div>
                  <div style={{ padding: "10px 14px" }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", color: "var(--text-primary)", fontWeight: 600 }}>₹{fmt(Number(p.total_price))}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Order totals summary */}
          {products.length > 1 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <div style={{ padding: "10px 14px", gridColumn: "1 / 4", borderRight: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>All Making Charges</p>
                </div>
                <div style={{ padding: "10px 14px" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: "#5CB87A" }}>₹{fmt(productsMakingCharges)}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--gold-subtle)" }}>
                <div style={{ padding: "14px 20px", gridColumn: "1 / 4", borderRight: "1px solid var(--border-gold)" }}>
                  <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>All Products Total</p>
                </div>
                <div style={{ padding: "14px 20px" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "var(--gold)", fontWeight: 600 }}>₹{fmt(productsTotal)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {products.length === 0 && (
        <div style={{
          marginBottom: "24px", padding: "24px",
          border: "1px dashed var(--border)", textAlign: "center",
        }}>
          <p style={{ fontFamily: "'Cormorant', serif", fontSize: "16px", fontStyle: "italic", color: "var(--text-muted)" }}>
            No products added yet.
          </p>
          <Link href={`/products/new?order_id=${id}`}>
            <button className="btn-outline" style={{ marginTop: "12px", fontSize: "11px" }}>+ Add First Product</button>
          </Link>
        </div>
      )}

      {/* Final price + actions — managers/owners only */}
      {canManage && order.status === "DRAFT" && (
        <div className="card-ornate" style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "16px" }}>Set Final Price & Lock</p>

          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <input
              type="number"
              placeholder="Final order price in ₹"
              value={finalPrice}
              onChange={e => setFinalPrice(e.target.value)}
              className="input-luxury"
              style={{ flex: 1, fontSize: "18px", fontFamily: "'Playfair Display', serif" }}
            />
            <button onClick={handleSetFinalPrice} disabled={saving || !finalPrice} className="btn-gold">
              {saving ? "Saving…" : "Set Price"}
            </button>
          </div>

          {order.final_price && (
            <div style={{
              background: "var(--gold-subtle)", border: "1px solid var(--border-gold)",
              padding: "14px 20px", marginBottom: "20px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <p style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)" }}>Final Price</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", color: "var(--gold)", fontWeight: 600 }}>
                ₹{fmt(order.final_price)}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={handleLock} disabled={saving || !order.final_price} className="btn-gold"
              style={{ opacity: !order.final_price ? 0.5 : 1 }}>
              Lock Order
            </button>
            <button onClick={handleCancel} disabled={saving} className="btn-outline">Cancel Order</button>
          </div>
        </div>
      )}

      {canManage && order.status === "LOCKED" && (
        <div className="card-ornate">
          <div style={{
            background: "var(--gold-subtle)", border: "1px solid var(--border-gold)",
            padding: "14px 20px", marginBottom: "20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)" }}>Final Price</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", color: "var(--gold)", fontWeight: 600 }}>
              ₹{fmt(order.final_price || 0)}
            </p>
          </div>
          <p className="label-caps" style={{ marginBottom: "16px" }}>Actions</p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={handleComplete} disabled={saving} className="btn-gold">Mark Complete</button>
            <button onClick={handleCancel} disabled={saving} className="btn-outline">Cancel Order</button>
          </div>
        </div>
      )}

      {order.status === "COMPLETED" && (
        <div style={{
          padding: "20px 24px",
          background: "rgba(92,184,122,0.08)",
          border: "1px solid rgba(92,184,122,0.3)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <p style={{ fontFamily: "'Cormorant', serif", fontSize: "16px", color: "#5CB87A", fontStyle: "italic" }}>
            ✓ Order completed
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", color: "#5CB87A", fontWeight: 600 }}>
            ₹{fmt(order.final_price || 0)}
          </p>
        </div>
      )}

      {error && <p style={{ color: "#E05C7A", fontSize: "12px", marginTop: "16px" }}>{error}</p>}

    </div>
  );
}