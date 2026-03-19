"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VENDOR_TYPES = [
  "Gold Supplier",
  "Stone / Diamond Supplier",
  "Raw Materials",
  "Finished Jewelry Wholesale",
  "Repair Services",
];

export default function NewVendorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    business_name:  "",
    contact_person: "",
    phone:          "",
    email:          "",
    address:        "",
    vendor_type:    "",
    notes:          "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role !== "OWNER") { router.push("/dashboard"); return; }
  }, [router]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.business_name) { setError("Business name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const body = {
        business_name:  form.business_name,
        contact_person: form.contact_person || null,
        phone:          form.phone || null,
        email:          form.email || null,
        address:        form.address || null,
        notes:          form.vendor_type
          ? `[${form.vendor_type}]${form.notes ? " " + form.notes : ""}`
          : form.notes || null,
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendors/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/vendors");
    } catch {
      setError("Could not save vendor. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: "600px" }}>

      <div style={{ marginBottom: "40px" }}>
        <Link href="/vendors" style={{ textDecoration: "none" }}>
          <p style={{
            fontSize: "11px", letterSpacing: "0.15em",
            color: "var(--text-muted)", textTransform: "uppercase",
            marginBottom: "12px", cursor: "pointer",
          }}>← Back to Vendors</p>
        </Link>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; New Vendor</p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "40px", fontWeight: 400,
          color: "var(--text-primary)",
        }}>Add Vendor</h1>
      </div>

      <div className="card-ornate">

        <div style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Business Name *</p>
          <input
            type="text"
            placeholder="Vendor or business name"
            value={form.business_name}
            onChange={(e) => update("business_name", e.target.value)}
            className="input-luxury"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Contact Person (optional)</p>
          <input
            type="text"
            placeholder="Name of primary contact"
            value={form.contact_person}
            onChange={(e) => update("contact_person", e.target.value)}
            className="input-luxury"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Vendor Type</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {VENDOR_TYPES.map(t => (
              <button
                key={t}
                onClick={() => update("vendor_type", t)}
                style={{
                  padding: "8px 16px",
                  border: `1px solid ${form.vendor_type === t ? "var(--gold)" : "var(--border)"}`,
                  background: form.vendor_type === t ? "var(--gold-subtle)" : "transparent",
                  color: form.vendor_type === t ? "var(--gold)" : "var(--text-muted)",
                  fontFamily: "'Didact Gothic', sans-serif",
                  fontSize: "11px", letterSpacing: "0.08em",
                  cursor: "pointer", transition: "all 0.2s ease",
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Phone</p>
          <input
            type="text"
            placeholder="Mobile or office number"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="input-luxury"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Email (optional)</p>
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="input-luxury"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Address</p>
          <textarea
            placeholder="Full address"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="input-luxury"
            style={{ minHeight: "80px", resize: "vertical" }}
          />
        </div>

        <div style={{ marginBottom: "32px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Notes</p>
          <textarea
            placeholder="Payment terms, specialities, contact preferences..."
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="input-luxury"
            style={{ minHeight: "80px", resize: "vertical" }}
          />
        </div>

        {error && (
          <p style={{ color: "#E05C7A", fontSize: "12px", marginBottom: "16px" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSubmit} disabled={saving} className="btn-gold">
            {saving ? "Saving..." : "Add Vendor"}
          </button>
          <Link href="/vendors" style={{ textDecoration: "none" }}>
            <button className="btn-outline">Cancel</button>
          </Link>
        </div>

      </div>
    </div>
  );
}