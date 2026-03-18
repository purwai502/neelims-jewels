"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.full_name) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/clients/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/clients");
    } catch {
      setError("Could not save client. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: "600px" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <Link href="/clients" style={{ textDecoration: "none" }}>
          <p style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginBottom: "12px",
            cursor: "pointer",
          }}>← Back to Clients</p>
        </Link>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; New Client</p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "40px",
          fontWeight: 400,
          color: "var(--text-primary)",
        }}>Register Client</h1>
      </div>

      {/* Form */}
      <div className="card-ornate">

        <div style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Full Name *</p>
          <input
            type="text"
            placeholder="Client's full name"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            className="input-luxury"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Phone</p>
          <input
            type="text"
            placeholder="Mobile number"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="input-luxury"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p className="label-caps" style={{ marginBottom: "10px" }}>Email</p>
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
            placeholder="Any additional notes about this client"
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
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-gold"
          >
            {saving ? "Saving..." : "Register Client"}
          </button>
          <Link href="/clients" style={{ textDecoration: "none" }}>
            <button className="btn-outline">Cancel</button>
          </Link>
        </div>

      </div>
    </div>
  );
}
