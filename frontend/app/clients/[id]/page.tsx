"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

interface SoldProduct {
  id: string;
  barcode: string | null;
  name: string;
  total_price: number | null;
  created_at: string;
}

interface ClientPayment {
  id: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

interface Balance {
  total_billed: number;
  total_paid: number;
  balance_due: number;
}

const fmt = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const METHODS = ["CASH", "BANK", "UPI", "CHEQUE"];

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [client,   setClient]   = useState<Client | null>(null);
  const [balance,  setBalance]  = useState<Balance | null>(null);
  const [products, setProducts] = useState<SoldProduct[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [loading,  setLoading]  = useState(true);

  // payment form state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNotes,  setPayNotes]  = useState("");
  const [paying,    setPaying]    = useState(false);
  const [payError,  setPayError]  = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const h = { "Authorization": `Bearer ${token}` };

  const fetchBalance = useCallback(async () => {
    try {
      const [bal, prods, pays] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}/balance`, { headers: h }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}/sold-products`, { headers: h }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}/payments`, { headers: h }).then(r => r.json()),
      ]);
      setBalance(bal);
      setProducts(Array.isArray(prods) ? prods : []);
      setPayments(Array.isArray(pays) ? pays : []);
    } catch {
      // balance fetch failures don't block the page
    }
  }, [id]);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }

    // fetch client independently so balance failures don't hide the client
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}`, { headers: h })
      .then(r => r.json())
      .then(data => {
        if (data.detail) return; // not found
        setClient(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchBalance();
  }, [id, router]);

  const handlePay = async (amount: number) => {
    if (!amount || amount <= 0) { setPayError("Enter a valid amount"); return; }
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}/pay`, {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, payment_method: payMethod, notes: payNotes || null }),
      });
      if (!res.ok) throw new Error("Failed");
      setPayAmount("");
      setPayNotes("");
      await fetchBalance();
    } catch {
      setPayError("Could not record payment. Please try again.");
    }
    setPaying(false);
  };

  if (loading) return (
    <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>Loading...</p>
  );

  if (!client) return <p style={{ color: "#E05C7A" }}>Client not found.</p>;

  const balanceDue = balance?.balance_due ?? 0;
  const balanceColor = balanceDue > 0 ? "#E05C7A" : balanceDue < 0 ? "#5CB87A" : "var(--text-muted)";
  const balanceLabel = balanceDue > 0 ? "Balance Due" : balanceDue < 0 ? "Credit" : "Fully Settled";

  return (
    <div style={{ maxWidth: "860px" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <Link href="/clients" style={{ textDecoration: "none" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px", cursor: "pointer" }}>
            ← Back to Clients
          </p>
        </Link>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Client Profile</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "42px", fontWeight: 400, fontStyle: "italic", color: "var(--text-primary)" }}>
          {client.full_name}
        </h1>
      </div>

      {/* Balance Summary */}
      <div style={{ border: "1px solid var(--border-gold)", marginBottom: "32px", overflow: "hidden" }}>
        <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
          <p className="label-caps" style={{ fontSize: "9px" }}>Account Summary</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div style={{ padding: "20px 24px", borderRight: "1px solid var(--border)" }}>
            <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8A45A", marginBottom: "8px" }}>Total Billed</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#E8A45A" }}>₹{fmt(balance?.total_billed ?? 0)}</p>
          </div>
          <div style={{ padding: "20px 24px", borderRight: "1px solid var(--border)" }}>
            <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#5CB87A", marginBottom: "8px" }}>Total Paid</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#5CB87A" }}>₹{fmt(balance?.total_paid ?? 0)}</p>
          </div>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: balanceColor, marginBottom: "8px" }}>{balanceLabel}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: balanceColor }}>₹{fmt(Math.abs(balanceDue))}</p>
          </div>
        </div>
      </div>

      {/* Record Payment */}
      {balanceDue > 0 && (
        <div style={{ border: "1px solid var(--border-gold)", marginBottom: "32px", overflow: "hidden" }}>
          <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
            <p className="label-caps" style={{ fontSize: "9px" }}>Record Payment</p>
          </div>
          <div style={{ padding: "20px 24px" }}>
            {/* Method selector */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {METHODS.map(m => (
                <button key={m} onClick={() => setPayMethod(m)} style={{
                  padding: "8px 16px", fontSize: "11px", letterSpacing: "0.06em",
                  border: `1px solid ${payMethod === m ? "var(--gold)" : "var(--border)"}`,
                  background: payMethod === m ? "var(--gold-subtle)" : "transparent",
                  color: payMethod === m ? "var(--gold)" : "var(--text-muted)",
                  cursor: "pointer", fontFamily: "'Didact Gothic', sans-serif",
                }}>{m}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "6px" }}>Amount (₹)</p>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "'Playfair Display', serif", fontSize: "16px", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "6px" }}>Notes (optional)</p>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. Advance, Cheque no."
                  style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "'Didact Gothic', sans-serif", fontSize: "13px", outline: "none", boxSizing: "border-box" as const }} />
              </div>
            </div>

            {payError && <p style={{ color: "#E05C7A", fontSize: "12px", marginBottom: "10px" }}>{payError}</p>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => handlePay(parseFloat(payAmount))} disabled={paying}
                style={{ padding: "10px 24px", background: "var(--gold)", border: "none", color: "#000", fontFamily: "'Didact Gothic', sans-serif", fontSize: "11px", letterSpacing: "0.1em", cursor: paying ? "not-allowed" : "pointer", opacity: paying ? 0.6 : 1 }}>
                {paying ? "Recording…" : "Record Payment"}
              </button>
              {balanceDue > 0 && (
                <button onClick={() => { setPayAmount(balanceDue.toFixed(2)); }} style={{
                  padding: "10px 24px", background: "transparent", border: "1px solid var(--gold)", color: "var(--gold)",
                  fontFamily: "'Didact Gothic', sans-serif", fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer",
                }}>
                  Pay in Full (₹{fmt(balanceDue)})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sold Products */}
      {products.length > 0 && (
        <div style={{ border: "1px solid var(--border-gold)", marginBottom: "32px", overflow: "hidden" }}>
          <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
            <p className="label-caps" style={{ fontSize: "9px" }}>Purchases ({products.length})</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            {["Product", "Barcode", "Price"].map(h => (
              <div key={h} style={{ padding: "8px 14px", fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", borderRight: "1px solid var(--border)" }}>{h}</div>
            ))}
          </div>
          {products.map(p => (
            <Link key={p.id} href={`/products/${p.id}`} style={{ textDecoration: "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.04)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", color: "var(--text-primary)" }}>{p.name}</p>
                </div>
                <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.barcode || "—"}</p>
                </div>
                <div style={{ padding: "10px 14px" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", color: "var(--gold)" }}>
                    {p.total_price ? `₹${fmt(p.total_price)}` : "—"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div style={{ border: "1px solid var(--border-gold)", marginBottom: "32px", overflow: "hidden" }}>
          <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
            <p className="label-caps" style={{ fontSize: "9px" }}>Payment History</p>
          </div>
          {payments.map(p => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{p.notes || "Payment"}</p>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{new Date(p.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                <p style={{ fontSize: "11px", letterSpacing: "0.06em", color: "var(--text-muted)", textTransform: "uppercase" }}>{p.payment_method}</p>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", color: "#5CB87A" }}>₹{fmt(p.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Details */}
      <div className="card-ornate">
        <p className="label-caps" style={{ marginBottom: "24px" }}>Contact Details</p>
        {[
          { label: "Phone",   value: client.phone   },
          { label: "Email",   value: client.email   },
          { label: "Address", value: client.address },
          { label: "Notes",   value: client.notes   },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", gap: "24px", paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid var(--border-light)" }}>
            <p style={{ fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", width: "80px", flexShrink: 0, paddingTop: "2px" }}>{label}</p>
            <p style={{ color: value ? "var(--text-primary)" : "var(--text-muted)", fontStyle: value ? "normal" : "italic", fontSize: "14px", lineHeight: 1.5 }}>
              {value || "Not provided"}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
