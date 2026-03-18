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

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role !== "OWNER") { router.push("/dashboard"); return; }

    Promise.all([
      fetch(`http://localhost:8000/vendors/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`http://localhost:8000/vendors/${id}/balance`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
    ]).then(([vendorData, balanceData]) => {
      setVendor(vendorData);
      setBalance(balanceData.balance ?? 0);
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

  return (
    <div style={{ maxWidth: "720px" }}>

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

      {/* Balance Card */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-gold)",
        padding: "28px 32px",
        marginBottom: "32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative",
      }}>
        <span style={{ position: "absolute", top: "8px", left: "12px", color: "var(--gold)", fontSize: "8px", opacity: 0.5 }}>✦</span>
        <span style={{ position: "absolute", bottom: "8px", right: "12px", color: "var(--gold)", fontSize: "8px", opacity: 0.5 }}>✦</span>

        <div>
          <p className="label-caps" style={{ marginBottom: "8px" }}>Outstanding Balance</p>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "36px", fontWeight: 600,
            color: (balance ?? 0) > 0 ? "#E05C7A" : (balance ?? 0) < 0 ? "#5CB87A" : "var(--text-muted)",
          }}>
            {balance === null ? "—" : `₹${Math.abs(balance).toLocaleString("en-IN")}`}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{
            fontFamily: "'Cormorant', serif",
            fontSize: "16px", fontStyle: "italic",
            color: "var(--text-muted)",
          }}>
            {balance === null ? "" : (balance ?? 0) > 0 ? "Studio owes vendor" : (balance ?? 0) < 0 ? "Vendor has credit" : "Settled"}
          </p>
          <button className="btn-gold" style={{ marginTop: "16px", padding: "8px 20px", fontSize: "10px" }}>
            Record Payment
          </button>
        </div>
      </div>

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