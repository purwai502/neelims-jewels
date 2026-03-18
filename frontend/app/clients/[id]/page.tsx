"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
const canViewBalance = role === "OWNER" || role === "MANAGER";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    Promise.all([
      fetch(`http://localhost:8000/clients/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`http://localhost:8000/clients/${id}/balance`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
    ]).then(([clientData, balanceData]) => {
      setClient(clientData);
      setBalance(balanceData.balance ?? balanceData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
      Loading...
    </p>
  );

  if (!client) return (
    <p style={{ color: "#E05C7A" }}>Client not found.</p>
  );

  const balanceColor = balance === null ? "var(--text-muted)"
    : balance > 0 ? "#E05C7A"
    : balance < 0 ? "#5CB87A"
    : "var(--text-muted)";

  const balanceLabel = balance === null ? "—"
    : balance > 0 ? "Amount Due"
    : balance < 0 ? "Credit"
    : "Settled";

  return (
    <div style={{ maxWidth: "720px" }}>

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
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Client Profile</p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "42px",
          fontWeight: 400,
          fontStyle: "italic",
          color: "var(--text-primary)",
        }}>{client.full_name}</h1>
      </div>

      {/* Balance Card */}
      {canViewBalance && (
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
          <p className="label-caps" style={{ marginBottom: "8px" }}>Account Balance</p>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "36px",
            fontWeight: 600,
            color: balanceColor,
          }}>
            ₹{Math.abs(balance ?? 0).toLocaleString("en-IN")}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{
            fontFamily: "'Cormorant', serif",
            fontSize: "16px",
            fontStyle: "italic",
            color: balanceColor,
          }}>{balanceLabel}</p>
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <Link href={`/orders/new?client=${id}`} style={{ textDecoration: "none" }}>
              <button className="btn-gold" style={{ padding: "8px 20px", fontSize: "10px" }}>
                New Order
              </button>
            </Link>
            <Link href={`/payments?client=${id}`} style={{ textDecoration: "none" }}>
              <button className="btn-outline" style={{ padding: "8px 20px", fontSize: "10px" }}>
                Add Payment
              </button>
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* Details */}
      <div className="card-ornate">
        <p className="label-caps" style={{ marginBottom: "24px" }}>Contact Details</p>

        {[
          { label: "Phone",   value: client.phone   },
          { label: "Email",   value: client.email   },
          { label: "Address", value: client.address },
          { label: "Notes",   value: client.notes   },
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: "flex",
            gap: "24px",
            paddingBottom: "16px",
            marginBottom: "16px",
            borderBottom: "1px solid var(--border-light)",
          }}>
            <p style={{
              fontFamily: "'Didact Gothic', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--gold)",
              width: "80px",
              flexShrink: 0,
              paddingTop: "2px",
            }}>{label}</p>
            <p style={{
              color: value ? "var(--text-primary)" : "var(--text-muted)",
              fontStyle: value ? "normal" : "italic",
              fontSize: "14px",
              lineHeight: 1.5,
            }}>{value || "Not provided"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
