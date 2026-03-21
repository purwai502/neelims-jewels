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
  description: string | null;
  weight: number;
  purity: string | null;
  category: string | null;
  sub_category: string | null;
  making_charges: number;
  gold_rate_snapshot: number;
  total_price: number;
  barcode: string | null;
  image_path: string | null;
  order_id: string | null;
  is_sold: boolean;
  stones: Stone[];
}

const CATEGORIES     = ["Jewellery", "Art", "Other"];
const SUB_CATEGORIES = ["Ring", "Earring", "Neck Piece", "Bracelet", "Other"];
const PURITIES       = ["24K", "22K", "18K", "14K"];

export default function ProductsPage() {
  const router = useRouter();
  const [products,          setProducts]          = useState<Product[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [search,            setSearch]            = useState("");
  const [statusFilter,      setStatusFilter]      = useState<"all" | "available" | "sold">("all");
  const [filterCategory,    setFilterCategory]    = useState("");
  const [filterSubCategory, setFilterSubCategory] = useState("");
  const [filterPurity,      setFilterPurity]      = useState("");
  const [filterStone,       setFilterStone]       = useState("");
  const [showFilters,       setShowFilters]       = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setProducts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const handleCategoryFilter = (c: string) => {
    const next = filterCategory === c ? "" : c;
    setFilterCategory(next);
    if (next !== "Jewellery") setFilterSubCategory("");
  };

  const filtered = products.filter(p => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.purity ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "sold"      &&  p.is_sold) ||
      (statusFilter === "available" && !p.is_sold);
    const matchCategory    = !filterCategory    || p.category    === filterCategory;
    const matchSubCategory = !filterSubCategory || p.sub_category === filterSubCategory;
    const matchPurity      = !filterPurity      || p.purity       === filterPurity;
    const matchStone       = !filterStone       || p.stones?.some(s =>
      s.stone_name.toLowerCase().includes(filterStone.toLowerCase())
    );
    return matchSearch && matchStatus && matchCategory && matchSubCategory && matchPurity && matchStone;
  });

  const activeFilters = [filterCategory, filterSubCategory, filterPurity, filterStone].filter(Boolean).length;

  const filterPill = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} style={{
      padding: "6px 14px",
      border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
      background: active ? "var(--gold-subtle)" : "transparent",
      color: active ? "var(--gold)" : "var(--text-muted)",
      fontFamily: "'Didact Gothic', sans-serif",
      fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" as const,
      cursor: "pointer", whiteSpace: "nowrap" as const,
    }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Inventory</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", fontWeight: 400, color: "var(--text-primary)" }}>
            Product Inventory
          </h1>
        </div>
        <Link href="/products/new" style={{ textDecoration: "none" }}>
          <button className="btn-gold">+ Add Product</button>
        </Link>
      </div>

      {/* Search bar + filter toggle */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by name, barcode or purity..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-luxury"
          style={{ maxWidth: "400px" }}
        />
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            padding: "10px 16px", cursor: "pointer",
            border: `1px solid ${(showFilters || activeFilters > 0) ? "var(--gold)" : "var(--border)"}`,
            background: (showFilters || activeFilters > 0) ? "var(--gold-subtle)" : "transparent",
            color: (showFilters || activeFilters > 0) ? "var(--gold)" : "var(--text-muted)",
            fontFamily: "'Didact Gothic', sans-serif", fontSize: "11px",
            letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "7px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="1" y1="3.5" x2="13" y2="3.5"/>
            <line x1="1" y1="7" x2="13" y2="7"/>
            <line x1="1" y1="10.5" x2="13" y2="10.5"/>
            <circle cx="4" cy="3.5" r="1.5" fill="var(--bg-card)" strokeWidth="1.5"/>
            <circle cx="9" cy="7" r="1.5" fill="var(--bg-card)" strokeWidth="1.5"/>
            <circle cx="4" cy="10.5" r="1.5" fill="var(--bg-card)" strokeWidth="1.5"/>
          </svg>
          Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
      </div>

      {/* Filter rows — collapsible */}
      {showFilters && (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px", padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border-gold)" }}>

        {/* Row 1: Category + Status */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", minWidth: "64px" }}>Category</span>
          {CATEGORIES.map(c => filterPill(c, filterCategory === c, () => handleCategoryFilter(c)))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase" }}>Status</span>
          {(["all", "available", "sold"] as const).map(f =>
            filterPill(f, statusFilter === f, () => setStatusFilter(f))
          )}
        </div>

        {/* Row 2: Sub-category (Jewellery only) */}
        {filterCategory === "Jewellery" && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", minWidth: "64px" }}>Type</span>
            {SUB_CATEGORIES.map(s => filterPill(s, filterSubCategory === s, () => setFilterSubCategory(filterSubCategory === s ? "" : s)))}
          </div>
        )}

        {/* Row 3: Purity + Stone */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", minWidth: "64px" }}>Purity</span>
          {PURITIES.map(p => filterPill(p, filterPurity === p, () => setFilterPurity(filterPurity === p ? "" : p)))}
          <div style={{ width: "24px" }} />
          <span style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase" }}>Stone</span>
          <input
            type="text"
            placeholder="e.g. Ruby"
            value={filterStone}
            onChange={e => setFilterStone(e.target.value)}
            style={{
              padding: "6px 12px", background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--text-primary)", fontFamily: "'Didact Gothic', sans-serif",
              fontSize: "12px", outline: "none", width: "140px",
            }}
          />
          {activeFilters > 0 && (
            <button onClick={() => { setFilterCategory(""); setFilterSubCategory(""); setFilterPurity(""); setFilterStone(""); }} style={{
              padding: "6px 12px", background: "transparent", border: "1px solid var(--border)",
              color: "var(--text-muted)", fontFamily: "'Didact Gothic', sans-serif",
              fontSize: "10px", letterSpacing: "0.08em", cursor: "pointer",
            }}>✕ Clear filters ({activeFilters})</button>
          )}
        </div>
      </div>
      )}

      {/* Ornate divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
        <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
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
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
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

                {/* Thumbnail image */}
                {product.image_path ? (
                  <div style={{ height: "180px", overflow: "hidden" }}>
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}/${product.image_path}`}
                      alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                ) : (
                  <div style={{
                    height: "80px", background: "var(--surface)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ color: "var(--gold)", fontSize: "24px", opacity: 0.3 }}>◇</span>
                  </div>
                )}

                <div style={{ padding: "18px 20px" }}>
                  {/* Barcode + status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--gold)", fontFamily: "'Didact Gothic', sans-serif", margin: 0 }}>
                      {product.barcode}
                    </p>
                    <span style={{
                      fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase",
                      padding: "3px 8px",
                      border: `1px solid ${product.is_sold ? "rgba(92,184,122,0.4)" : "rgba(201,168,76,0.4)"}`,
                      color: product.is_sold ? "#5CB87A" : "var(--gold)",
                      fontFamily: "'Didact Gothic', sans-serif",
                    }}>{product.is_sold ? "Sold" : "Available"}</span>
                  </div>

                  {/* Category badge */}
                  {(product.category || product.sub_category) && (
                    <p style={{ fontSize: "9px", letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", margin: "0 0 6px" }}>
                      {[product.category, product.sub_category].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  {/* Name */}
                  <h3 style={{
                    fontFamily: "'Playfair Display', serif", fontSize: "17px", fontWeight: 600,
                    color: "var(--text-primary)", marginBottom: "6px",
                  }}>{product.name}</h3>

                  {/* Description */}
                  {product.description && (
                    <p style={{
                      fontFamily: "'Cormorant', serif", fontSize: "13px", fontStyle: "italic",
                      color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.4,
                    }}>{product.description.replace(/^\[.*?\]\s*/, "")}</p>
                  )}

                  {/* Details row */}
                  <div style={{ display: "flex", gap: "16px", marginBottom: "14px" }}>
                    {product.purity && (
                      <div>
                        <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>Purity</p>
                        <p style={{ color: "var(--gold)", fontFamily: "'Playfair Display', serif", fontSize: "14px" }}>{product.purity}</p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>Weight</p>
                      <p style={{ color: "var(--text-primary)", fontSize: "13px" }}>{product.weight}g</p>
                    </div>
                    {product.stones?.length > 0 && (
                      <div>
                        <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>Stones</p>
                        <p style={{ color: "var(--text-primary)", fontSize: "13px" }}>
                          {product.stones.map(s => s.stone_name).filter(Boolean).join(", ") || product.stones.length}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div style={{
                    borderTop: "1px solid var(--border-light)", paddingTop: "12px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Total Value
                    </p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>
                      ₹{Number(product.total_price).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <span style={{ position: "absolute", bottom: "8px", right: "10px", color: "var(--gold)", fontSize: "7px", opacity: 0.4 }}>✦</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
