"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Stone {
  id: string;
  stone_name: string;
  weight: number;
  price_per_carat: number;
  total_price: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  weight: number;
  purity: string;
  making_charges: number;
  gold_rate_snapshot: number;
  total_price: number;
  barcode: string;
  order_id: string | null;
  is_sold: boolean;
  stones: Stone[];
}

export default function ProductsPage() {
  const router = useRouter();
  const [products,      setProducts]      = useState<Product[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<"all" | "available" | "sold">("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch("http://localhost:8000/products/", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setProducts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const filtered = products.filter(p => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      p.purity?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "sold"      &&  p.is_sold) ||
      (statusFilter === "available" && !p.is_sold);
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: "1000px" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Inventory</p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "40px", fontWeight: 400,
            color: "var(--text-primary)",
          }}>Product Inventory</h1>
        </div>
        <Link href="/products/new" style={{ textDecoration: "none" }}>
          <button className="btn-gold">+ Add Product</button>
        </Link>
      </div>

      {/* Search + Filter */}
      <div style={{ marginBottom: "32px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name, barcode or purity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-luxury"
          style={{ maxWidth: "360px" }}
        />
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "available", "sold"] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: "8px 16px",
              border: `1px solid ${statusFilter === f ? "var(--gold)" : "var(--border)"}`,
              background: statusFilter === f ? "var(--gold-subtle)" : "transparent",
              color: statusFilter === f ? "var(--gold)" : "var(--text-muted)",
              fontFamily: "'Didact Gothic', sans-serif",
              fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Ornate divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
        <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
          Loading inventory...
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
          No products found.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {filtered.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                padding: "24px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--gold)";
                el.style.transform = "translateY(-3px)";
                el.style.boxShadow = "var(--shadow-gold)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--border)";
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}>
                {/* Barcode + status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <p style={{
                    fontSize: "10px", letterSpacing: "0.2em",
                    color: "var(--gold)", fontFamily: "'Didact Gothic', sans-serif",
                    margin: 0,
                  }}>{product.barcode}</p>
                  <span style={{
                    fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase",
                    padding: "3px 8px",
                    border: `1px solid ${product.is_sold ? "rgba(92,184,122,0.4)" : "rgba(201,168,76,0.4)"}`,
                    color: product.is_sold ? "#5CB87A" : "var(--gold)",
                    fontFamily: "'Didact Gothic', sans-serif",
                  }}>{product.is_sold ? "Sold" : "Available"}</span>
                </div>

                {/* Name */}
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}>{product.name}</h3>

                {/* Description */}
                {product.description && (
                  <p style={{
                    fontFamily: "'Cormorant', serif",
                    fontSize: "14px",
                    fontStyle: "italic",
                    color: "var(--text-muted)",
                    marginBottom: "16px",
                    lineHeight: 1.4,
                  }}>{product.description}</p>
                )}

                {/* Details row */}
                <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>Purity</p>
                    <p style={{ color: "var(--gold)", fontFamily: "'Playfair Display', serif", fontSize: "15px" }}>{product.purity}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>Weight</p>
                    <p style={{ color: "var(--text-primary)", fontSize: "14px" }}>{product.weight}g</p>
                  </div>
                  {product.stones?.length > 0 && (
                    <div>
                      <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>Stones</p>
                      <p style={{ color: "var(--text-primary)", fontSize: "14px" }}>{product.stones.length}</p>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div style={{
                  borderTop: "1px solid var(--border-light)",
                  paddingTop: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    Total Value
                  </p>
                  <p style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}>₹{Number(product.total_price).toLocaleString("en-IN")}</p>
                </div>

                {/* Corner mark */}
                <span style={{
                  position: "absolute", bottom: "8px", right: "10px",
                  color: "var(--gold)", fontSize: "7px", opacity: 0.4,
                }}>✦</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}