"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Vendor {
  id: string;
  business_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

interface VendorBalance {
  total_goods_received: number;
  total_paid: number;
  balance_due: number;
}

interface VendorProduct {
  id: string;
  barcode: string | null;
  name: string;
  description: string | null;
  weight: number;
  purity: string | null;
  cost_price: number | null;
  total_price: number | null;
  is_sold: boolean;
  created_at: string;
}

const fmt = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [vendor,   setVendor]   = useState<Vendor | null>(null);
  const [balance,  setBalance]  = useState<VendorBalance | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role !== "OWNER") { router.push("/dashboard"); return; }

    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendors/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendors/${id}/balance`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendors/${id}/products`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
    ]).then(([vendorData, balanceData, productsData]) => {
      setVendor(vendorData);
      setBalance({
        total_goods_received: balanceData.total_goods_received ?? 0,
        total_paid:           balanceData.total_paid           ?? 0,
        balance_due:          balanceData.balance_due          ?? 0,
      });
      setProducts(Array.isArray(productsData) ? productsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
      Loading...
    </p>
  );

  if (!vendor) return <p style={{ color: "#E05C7A" }}>Vendor not found.</p>;

  const vendorTypeMatch = vendor.notes?.match(/^\[(.+?)\]/);
  const vendorType = vendorTypeMatch ? vendorTypeMatch[1] : null;
  const cleanNotes = vendor.notes?.replace(/^\[.+?\]\s*/, "") || null;

  const balanceDue = balance?.balance_due ?? 0;

  return (
    <div style={{ maxWidth: "900px" }}>

      <div style={{ marginBottom: "40px" }}>
        <Link href="/vendors" style={{ textDecoration: "none" }}>
          <p style={{
            fontSize: "11px", letterSpacing: "0.15em",
            color: "var(--text-muted)", textTransform: "uppercase",
            marginBottom: "12px", cursor: "pointer",
          }}>← Back to Vendors</p>
        </Link>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Vendor Profile</p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "42px", fontWeight: 400, fontStyle: "italic",
          color: "var(--text-primary)",
        }}>{vendor.business_name}</h1>
        {vendorType && (
          <span style={{
            display: "inline-block", marginTop: "8px",
            padding: "4px 14px",
            border: "1px solid var(--border-gold)",
            color: "var(--gold)",
            fontSize: "10px", letterSpacing: "0.15em",
            fontFamily: "'Didact Gothic', sans-serif",
          }}>{vendorType}</span>
        )}
      </div>

      {/* Account Summary */}
      <div style={{
        border: "1px solid var(--border-gold)",
        marginBottom: "32px",
        overflow: "hidden",
      }}>
        <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
          <p className="label-caps" style={{ fontSize: "9px" }}>Vendor Account</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
          {/* Goods Received */}
          <div style={{ padding: "20px 24px", borderRight: "1px solid var(--border)" }}>
            <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8A45A", marginBottom: "8px" }}>
              Total Goods Received
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", color: "#E8A45A" }}>
              ₹{fmt(balance?.total_goods_received ?? 0)}
            </p>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
              Sum of cost prices of products from this vendor
            </p>
          </div>
          {/* Total Paid */}
          <div style={{ padding: "20px 24px", borderRight: "1px solid var(--border)" }}>
            <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#5CB87A", marginBottom: "8px" }}>
              Total Paid
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", color: "#5CB87A" }}>
              ₹{fmt(balance?.total_paid ?? 0)}
            </p>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
              Payments recorded to this vendor
            </p>
          </div>
          {/* Balance Due */}
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: balanceDue > 0 ? "#E05C7A" : "#5CB87A", marginBottom: "8px" }}>
              Balance Due
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", color: balanceDue > 0 ? "#E05C7A" : "#5CB87A" }}>
              ₹{fmt(Math.abs(balanceDue))}
            </p>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
              {balanceDue > 0 ? "Studio still owes vendor" : balanceDue < 0 ? "Vendor has credit" : "Fully settled"}
            </p>
          </div>
        </div>
        <div style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn-gold" style={{ padding: "8px 20px", fontSize: "10px" }}>
            Record Payment
          </button>
        </div>
      </div>

      {/* Products from this vendor */}
      {products.length > 0 && (
        <div style={{ border: "1px solid var(--border-gold)", marginBottom: "32px", overflow: "hidden" }}>
          <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
            <p className="label-caps" style={{ fontSize: "9px" }}>Products Sourced from this Vendor ({products.length})</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 80px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            {["Barcode / Name", "Purity / Weight", "Studio Cost", "Sale Price", "Status"].map(h => (
              <div key={h} style={{ padding: "8px 14px", fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", borderRight: "1px solid var(--border)" }}>{h}</div>
            ))}
          </div>
          {products.map(p => (
            <Link key={p.id} href={`/products/${p.id}`} style={{ textDecoration: "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 80px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.04)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", color: "var(--text-primary)" }}>{p.name}</p>
                  {p.barcode && <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{p.barcode}</p>}
                </div>
                <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{p.purity || "—"}</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{p.weight?.toFixed(3)} g</p>
                </div>
                <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", color: "#E8A45A" }}>
                    {p.cost_price ? `₹${fmt(p.cost_price)}` : "—"}
                  </p>
                </div>
                <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", color: "var(--gold)" }}>
                    {p.total_price ? `₹${fmt(p.total_price)}` : "—"}
                  </p>
                  {p.cost_price && p.total_price && (
                    <p style={{ fontSize: "10px", color: "#5CB87A", marginTop: "2px" }}>
                      +₹{fmt(p.total_price - p.cost_price)} margin
                    </p>
                  )}
                </div>
                <div style={{ padding: "10px 14px", display: "flex", alignItems: "center" }}>
                  <span style={{
                    fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase",
                    padding: "3px 8px",
                    border: `1px solid ${p.is_sold ? "rgba(92,184,122,0.4)" : "rgba(201,168,76,0.4)"}`,
                    color: p.is_sold ? "#5CB87A" : "var(--gold)",
                    fontFamily: "'Didact Gothic', sans-serif",
                  }}>{p.is_sold ? "Sold" : "In Stock"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Details */}
      <div className="card-ornate">
        <p className="label-caps" style={{ marginBottom: "24px" }}>Contact Details</p>

        {[
          { label: "Contact", value: vendor.contact_person },
          { label: "Phone",   value: vendor.phone          },
          { label: "Email",   value: vendor.email          },
          { label: "Address", value: vendor.address        },
          { label: "Notes",   value: cleanNotes            },
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", gap: "24px",
            paddingBottom: "16px", marginBottom: "16px",
            borderBottom: "1px solid var(--border-light)",
          }}>
            <p style={{
              fontSize: "10px", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--gold)",
              width: "80px", flexShrink: 0, paddingTop: "2px",
            }}>{label}</p>
            <p style={{
              color: value ? "var(--text-primary)" : "var(--text-muted)",
              fontStyle: value ? "normal" : "italic",
              fontSize: "14px", lineHeight: 1.5,
            }}>{value || "Not provided"}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
