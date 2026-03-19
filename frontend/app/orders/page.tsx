"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  client_id: string | null;
  status: string;
  estimated_weight: number;
  estimated_purity: string;
  estimated_price: number;
  final_price: number;
  notes: string;
  locked_at: string | null;
}

const statusColors: Record<string, string> = {
  DRAFT:     "#C9A84C",
  LOCKED:    "#7A9EE0",
  COMPLETED: "#5CB87A",
  CANCELLED: "#E05C7A",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const filtered = filter === "ALL" ? orders : orders.filter(o => o.status === filter);

  return (
    <div style={{ maxWidth: "1000px" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Orders</p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "40px",
            fontWeight: 400,
            color: "var(--text-primary)",
          }}>Order Registry</h1>
        </div>
        <Link href="/orders/new" style={{ textDecoration: "none" }}>
          <button className="btn-gold">+ New Order</button>
        </Link>
      </div>

      {/* Status Filter */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "32px", flexWrap: "wrap" }}>
        {["ALL", "DRAFT", "LOCKED", "COMPLETED", "CANCELLED"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "8px 20px",
              border: `1px solid ${filter === s ? "var(--gold)" : "var(--border)"}`,
              background: filter === s ? "var(--gold-subtle)" : "transparent",
              color: filter === s ? "var(--gold)" : "var(--text-muted)",
              fontFamily: "'Didact Gothic', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >{s}</button>
        ))}
      </div>

      {/* Ornate divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
        <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontFamily: "'Cormorant', serif", fontSize: "18px" }}>
          Loading orders...
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontFamily: "'Cormorant', serif", fontSize: "18px" }}>
          No orders found.
        </p>
      ) : (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-gold)",
          overflow: "hidden",
        }}>
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Status</th>
                <th>Purity</th>
                <th>Weight</th>
                <th>Final Price</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      border: `1px solid ${statusColors[order.status]}`,
                      color: statusColors[order.status],
                      fontSize: "10px",
                      letterSpacing: "0.15em",
                      fontFamily: "'Didact Gothic', sans-serif",
                    }}>{order.status}</span>
                  </td>
                  <td style={{ color: "var(--gold)", fontFamily: "'Playfair Display', serif" }}>
                    {order.estimated_purity || "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {order.estimated_weight ? `${order.estimated_weight}g` : "—"}
                  </td>
                  <td style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}>
                    {order.final_price ? `₹${Number(order.final_price).toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    {order.notes || "—"}
                  </td>
                  <td>
                    <Link href={`/orders/${order.id}`} style={{ textDecoration: "none" }}>
                      <button className="btn-outline" style={{ padding: "6px 16px", fontSize: "10px" }}>
                        View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}