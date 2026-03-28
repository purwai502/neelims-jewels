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
    email:          "",
    address:        "",
    vendor_type:    "",
    notes:          "",
    gst_number:     "",
    tin_number:     "",
    pan_number:     "",
  });
  const [phones, setPhones] = useState<string[]>([""]);

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
        phone:          phones.filter(p => p.trim()).join(", ") || null,
        email:          form.email || null,
        address:        form.address || null,
        notes:          form.vendor_type
          ? `[${form.vendor_type}]${form.notes ? " " + form.notes : ""}`
          : form.notes || null,
        gst_number:     form.gst_number || null,
        tin_number:     form.tin_number || null,
        pan_number:     form.pan_number || null,
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <p className="label-caps">Phone</p>
            <button type="button" onClick={() => setPhones(prev => [...prev, ""])}
              style={{ background: "transparent", border: "1px solid var(--gold)", color: "var(--gold)", padding: "4px 12px", fontSize: "10px", letterSpacing: "0.08em", cursor: "pointer", fontFamily: "'Didact Gothic', sans-serif" }}>
              + Add Number
            </button>
          </div>
          {phones.map((ph, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                type="text"
                placeholder={i === 0 ? "Primary number" : "Additional number"}
                value={ph}
                onChange={e => setPhones(prev => prev.map((p, j) => j === i ? e.target.value : p))}
                className="input-luxury"
                style={{ flex: 1 }}
              />
              {phones.length > 1 && (
                <button type="button" onClick={() => setPhones(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "8px 12px", cursor: "pointer", fontSize: "14px" }}>
                  ✕
                </button>
              )}
            </div>
          ))}
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div>
            <p className="label-caps" style={{ marginBottom: "10px" }}>GST Number</p>
            <input type="text" placeholder="e.g. 22ABCDE1234F1Z5" value={form.gst_number}
              onChange={e => update("gst_number", e.target.value)} className="input-luxury" />
          </div>
          <div>
            <p className="label-caps" style={{ marginBottom: "10px" }}>TIN Number</p>
            <input type="text" placeholder="Tax Identification No." value={form.tin_number}
              onChange={e => update("tin_number", e.target.value)} className="input-luxury" />
          </div>
          <div>
            <p className="label-caps" style={{ marginBottom: "10px" }}>PAN Number</p>
            <input type="text" placeholder="e.g. ABCDE1234F" value={form.pan_number}
              onChange={e => update("pan_number", e.target.value)} className="input-luxury" />
          </div>
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