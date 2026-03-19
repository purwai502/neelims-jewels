"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  account_id: string;
  order_id: string | null;
}

interface Client {
  id: string;
  full_name: string;
  account_id: string;
}

interface Vendor {
  id: string;
  business_name: string;
  account_id: string;
}

interface Order {
  id: string;
  status: string;
  notes: string | null;
  final_price: number | null;
}

interface Product {
  id: string;
  name: string;
  total_price: number | null;
}

interface GoldRates {
  "24K": number;
  "22K": number;
  "18K": number;
  "14K": number;
}

interface PaymentLine {
  id: number;
  method: string;
  amount: string;
  gold_description: string;
  gold_weight: string;
  gold_purity: string;
  is_estimated: boolean;
  gold_rate_override: string;
}

const fmt = (n: number) => n.toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CASH_METHODS = ["CASH", "UPI", "BANK", "CHEQUE"];
const PURITIES = ["24K", "22K", "18K", "14K"];

let lineCounter = 0;

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [goldRates, setGoldRates] = useState<GoldRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [payeeType, setPayeeType] = useState<"client" | "vendor">("client");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [linkType, setLinkType] = useState<"none" | "order" | "product">("none");
  const [lines, setLines] = useState<PaymentLine[]>([]);

  // update modal state
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editPurity, setEditPurity] = useState("22K");
  const [editRateOverride, setEditRateOverride] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchData = (token: string) => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendors/`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/gold-rates/today`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
    ]).then(([paymentsData, clientsData, vendorsData, ordersData, ratesData, productsData]) => {
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      setOrders(Array.isArray(ordersData) ? ordersData.filter((o: Order) => o.status === "LOCKED") : []);
      setGoldRates(ratesData);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role === "EMPLOYEE") { router.push("/dashboard"); return; }
    fetchData(token);
  }, [router]);

  // fetch balance whenever payee selection changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (payeeType === "client" && selectedClient) {
      setBalanceLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${selectedClient}/balance`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()).then(d => {
        setBalance(d.balance ?? null);
        setBalanceLoading(false);
      }).catch(() => setBalanceLoading(false));
    } else if (payeeType === "vendor" && selectedVendor) {
      setBalanceLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendors/${selectedVendor}/balance`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()).then(d => {
        setBalance(d.balance ?? null);
        setBalanceLoading(false);
      }).catch(() => setBalanceLoading(false));
    } else {
      setBalance(null);
    }
  }, [payeeType, selectedClient, selectedVendor]);

  const addLine = (method: string) => {
    lineCounter++;
    setLines(prev => [...prev, {
      id: lineCounter, method, amount: "",
      gold_description: "", gold_weight: "", gold_purity: "22K",
      is_estimated: false, gold_rate_override: "",
    }]);
  };

  const updateLine = (id: number, field: string, value: string | boolean) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: number) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const getGoldValue = (line: PaymentLine) => {
    if (line.method !== "GOLD_EXCHANGE") return 0;
    const weight = parseFloat(line.gold_weight) || 0;
    const overrideRate = parseFloat(line.gold_rate_override);
    const rate = overrideRate || goldRates?.[line.gold_purity as keyof GoldRates] || 0;
    return weight * rate;
  };

  const getLineAmount = (line: PaymentLine) => {
    if (line.method === "GOLD_EXCHANGE") return getGoldValue(line);
    return parseFloat(line.amount) || 0;
  };

  const totalAmount = lines.reduce((sum, l) => sum + getLineAmount(l), 0);

  const handleSubmit = async () => {
    if (payeeType === "client" && !selectedClient) { setError("Please select a client"); return; }
    if (payeeType === "vendor" && !selectedVendor) { setError("Please select a vendor"); return; }
    if (lines.length === 0) { setError("Please add at least one payment line"); return; }

    const accountId = payeeType === "client"
      ? clients.find(c => c.id === selectedClient)?.account_id
      : vendors.find(v => v.id === selectedVendor)?.account_id;

    if (!accountId) { setError("Payee not found"); return; }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      for (const line of lines) {
        const amount = getLineAmount(line);
        if (amount <= 0) continue;
        const body: Record<string, unknown> = {
          account_id:     accountId,
          vendor_id:      payeeType === "vendor" ? selectedVendor : null,
          order_id:       linkType === "order" ? selectedOrder || null : null,
          product_id:     linkType === "product" ? selectedProduct || null : null,
          amount,
          payment_method: line.method,
          notes:          null,
        };
        if (line.method === "GOLD_EXCHANGE") {
          body.gold_weight      = parseFloat(line.gold_weight);
          body.gold_purity      = line.gold_purity;
          body.gold_description = line.gold_description || null;
          body.is_estimated     = line.is_estimated;
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed");
      }
      setSuccess(`Payment of ₹${fmt(totalAmount)} recorded successfully`);
      setSelectedClient("");
      setSelectedVendor("");
      setSelectedOrder("");
      setSelectedProduct("");
      setLinkType("none");
      setBalance(null);
      setLines([]);
      setShowForm(false);
      fetchData(token!);
    } catch {
      setError("Could not record payment. Please try again.");
    }
    setSaving(false);
  };

  // open edit modal for a gold exchange payment
  const openEdit = (payment: Payment) => {
    setEditPayment(payment);
    setEditWeight("");
    setEditPurity("22K");
    setEditRateOverride("");
    setEditError("");
  };

  const getEditGoldValue = () => {
    const weight = parseFloat(editWeight) || 0;
    const overrideRate = parseFloat(editRateOverride);
    const rate = overrideRate || goldRates?.[editPurity as keyof GoldRates] || 0;
    return weight * rate;
  };

  const handleUpdate = async () => {
    if (!editWeight) { setEditError("Please enter final weight"); return; }
    setEditSaving(true);
    setEditError("");
    try {
      const token = localStorage.getItem("token");
      const amount = getEditGoldValue();
      const overrideRate = parseFloat(editRateOverride);
      const rate = overrideRate || goldRates?.[editPurity as keyof GoldRates] || 0;

      // parse existing notes to keep description
      const existingNotes = editPayment?.notes || "";
      const descMatch = existingNotes.match(/Gold Exchange — (.+?) ·/);
      const description = descMatch ? descMatch[1] : "Old gold";
      const notes = `Gold Exchange — ${description} · ${editWeight}g · ${editPurity} · Final weight${overrideRate ? ` · Rate ₹${fmt(overrideRate)}/g` : ""}`;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/${editPayment?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, notes }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditPayment(null);
      fetchData(token!);
    } catch {
      setEditError("Could not update payment. Please try again.");
    }
    setEditSaving(false);
  };

  const methodColor = (method: string) => {
    switch (method) {
      case "CASH":          return "#5CB87A";
      case "UPI":           return "#7A9BC9";
      case "BANK":          return "#C9A84C";
      case "CHEQUE":        return "#C97A9B";
      case "GOLD_EXCHANGE": return "#E8A45A";
      default:              return "var(--text-muted)";
    }
  };

  const isEstimated = (payment: Payment) =>
    payment.payment_method === "GOLD_EXCHANGE" &&
    payment.notes?.includes("Expected weight");

  return (
    <div style={{ maxWidth: "1000px" }}>

      {/* Update Modal */}
      {editPayment && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="card-ornate" style={{ width: "500px", background: "var(--bg)" }}>
            <p className="label-caps" style={{ marginBottom: "8px" }}>Update Gold Exchange</p>
            <p style={{
              fontFamily: "'Cormorant', serif", fontSize: "14px",
              fontStyle: "italic", color: "var(--text-muted)", marginBottom: "24px",
            }}>
              Enter the final weight after melting to update this payment.
            </p>

            <div style={{ marginBottom: "16px", padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Original record</p>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{editPayment.notes}</p>
              <p style={{ fontSize: "13px", color: "#E8A45A", marginTop: "4px" }}>₹{fmt(editPayment.amount)}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <p className="label-caps" style={{ marginBottom: "8px" }}>Final Weight (g) *</p>
                <input
                  type="number"
                  placeholder="Weight after melting"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  className="input-luxury"
                />
              </div>
              <div>
                <p className="label-caps" style={{ marginBottom: "8px" }}>Purity</p>
                <div style={{ display: "flex", gap: "4px" }}>
                  {PURITIES.map(p => (
                    <button key={p} onClick={() => setEditPurity(p)} style={{
                      flex: 1, padding: "10px 4px",
                      border: `1px solid ${editPurity === p ? "#E8A45A" : "var(--border)"}`,
                      background: editPurity === p ? "rgba(232,164,90,0.1)" : "transparent",
                      color: editPurity === p ? "#E8A45A" : "var(--text-muted)",
                      fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px", cursor: "pointer",
                    }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p className="label-caps" style={{ marginBottom: "8px" }}>Rate Override (₹/g) — optional</p>
              <input
                type="number"
                placeholder={`Today's rate: ₹${fmt(goldRates?.[editPurity as keyof GoldRates] || 0)}/g`}
                value={editRateOverride}
                onChange={(e) => setEditRateOverride(e.target.value)}
                className="input-luxury"
              />
            </div>

            {editWeight && (
              <div style={{
                padding: "14px 16px", marginBottom: "20px",
                background: "rgba(232,164,90,0.08)", border: "1px solid rgba(232,164,90,0.2)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <p style={{ fontSize: "10px", color: "#E8A45A", letterSpacing: "0.1em" }}>UPDATED FINAL VALUE</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Was: ₹{fmt(editPayment.amount)}
                  </p>
                </div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#E8A45A", fontWeight: 600 }}>
                  ₹{fmt(getEditGoldValue())}
                </p>
              </div>
            )}

            {editError && <p style={{ color: "#E05C7A", fontSize: "12px", marginBottom: "12px" }}>{editError}</p>}

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleUpdate} disabled={editSaving} className="btn-gold">
                {editSaving ? "Updating..." : "Update to Final Weight"}
              </button>
              <button onClick={() => setEditPayment(null)} className="btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Payments</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", fontWeight: 400, color: "var(--text-primary)" }}>
            Payment Register
          </h1>
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }} className="btn-gold">
          {showForm ? "Cancel" : "+ Record Payment"}
        </button>
      </div>

      {/* Payment Form */}
      {showForm && (
        <div className="card-ornate" style={{ marginBottom: "40px" }}>
          <p className="label-caps" style={{ marginBottom: "20px" }}>New Payment</p>

          {/* Payee type toggle */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            {(["client", "vendor"] as const).map(t => (
              <button key={t} onClick={() => { setPayeeType(t); setSelectedClient(""); setSelectedVendor(""); setBalance(null); }} style={{
                padding: "8px 24px",
                border: `1px solid ${payeeType === t ? "var(--gold)" : "var(--border)"}`,
                background: payeeType === t ? "rgba(232,164,90,0.1)" : "transparent",
                color: payeeType === t ? "var(--gold)" : "var(--text-muted)",
                fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px",
                letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase",
              }}>{t === "client" ? "Client Payment" : "Vendor Payment"}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
            <div>
              {/* Payee selector */}
              <p className="label-caps" style={{ marginBottom: "10px" }}>{payeeType === "client" ? "Client" : "Vendor"} *</p>
              {payeeType === "client" ? (
                <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="input-luxury" style={{ cursor: "pointer" }}>
                  <option value="">— Select Client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              ) : (
                <select value={selectedVendor} onChange={(e) => setSelectedVendor(e.target.value)} className="input-luxury" style={{ cursor: "pointer" }}>
                  <option value="">— Select Vendor —</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
                </select>
              )}

              {/* Balance display */}
              {(selectedClient || selectedVendor) && (
                <div style={{
                  marginTop: "10px", padding: "10px 14px",
                  background: "var(--surface)", border: "1px solid var(--border-gold)",
                }}>
                  {balanceLoading ? (
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Loading balance...</p>
                  ) : balance !== null ? (
                    <>
                      <p style={{ fontSize: "9px", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "4px" }}>
                        {payeeType === "client" ? "OUTSTANDING BALANCE" : "AMOUNT WE OWE"}
                      </p>
                      <p style={{
                        fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 600,
                        color: balance !== 0 ? "#E05C7A" : "#5CB87A",
                      }}>
                        ₹{fmt(Math.abs(balance))}
                        {balance === 0 && <span style={{ fontSize: "11px", marginLeft: "8px", color: "#5CB87A" }}>Settled</span>}
                      </p>
                      {totalAmount > 0 && balance !== 0 && (
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                          After payment: <span style={{
                            color: (Math.abs(balance) - totalAmount) <= 0 ? "#5CB87A" : "#E8A45A",
                            fontWeight: 600,
                          }}>
                            ₹{fmt(Math.max(0, Math.abs(balance) - totalAmount))}
                            {(Math.abs(balance) - totalAmount) <= 0 ? " — Fully settled" : " remaining"}
                          </span>
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
            <div>
              <p className="label-caps" style={{ marginBottom: "10px" }}>Link To (optional)</p>
              <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                {(["none", "order", "product"] as const).map(t => (
                  <button key={t} onClick={() => setLinkType(t)} style={{
                    flex: 1, padding: "8px 4px",
                    border: `1px solid ${linkType === t ? "var(--gold)" : "var(--border)"}`,
                    background: linkType === t ? "rgba(232,164,90,0.1)" : "transparent",
                    color: linkType === t ? "var(--gold)" : "var(--text-muted)",
                    fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px",
                    letterSpacing: "0.08em", cursor: "pointer", textTransform: "uppercase",
                  }}>{t === "none" ? "None" : t === "order" ? "Order" : "Product"}</button>
                ))}
              </div>
              {linkType === "order" && (
                <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)} className="input-luxury" style={{ cursor: "pointer" }}>
                  <option value="">— Select Order —</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.notes || o.id.slice(0, 8)} {o.final_price ? `· ₹${fmt(o.final_price)}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {linkType === "product" && (
                <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="input-luxury" style={{ cursor: "pointer" }}>
                  <option value="">— Select Product —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.total_price ? `· ₹${fmt(p.total_price)}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <p className="label-caps" style={{ marginBottom: "16px" }}>Payment Lines</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {CASH_METHODS.map(m => (
                <button key={m} onClick={() => addLine(m)} style={{
                  padding: "8px 16px", border: "1px solid var(--border)", background: "transparent",
                  color: "var(--text-muted)", fontFamily: "'Didact Gothic', sans-serif",
                  fontSize: "11px", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gold)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--gold)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                }}>+ {m}</button>
              ))}
              <button onClick={() => addLine("GOLD_EXCHANGE")} style={{
                padding: "8px 16px", border: "1px solid #E8A45A",
                background: "rgba(232,164,90,0.08)", color: "#E8A45A",
                fontFamily: "'Didact Gothic', sans-serif", fontSize: "11px",
                letterSpacing: "0.08em", cursor: "pointer",
              }}>+ Gold Exchange</button>
            </div>

            {lines.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic", padding: "16px 0" }}>
                Add payment lines above — cash, UPI, or gold exchange.
              </p>
            )}

            {lines.map((line) => (
              <div key={line.id} style={{
                background: "var(--surface)",
                border: `1px solid ${line.method === "GOLD_EXCHANGE" ? "rgba(232,164,90,0.3)" : "var(--border)"}`,
                padding: "16px", marginBottom: "12px", position: "relative",
              }}>
                <button onClick={() => removeLine(line.id)} style={{
                  position: "absolute", top: "8px", right: "10px",
                  background: "transparent", border: "none",
                  color: "var(--text-muted)", cursor: "pointer", fontSize: "14px",
                }}>✕</button>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{
                    padding: "3px 10px", border: `1px solid ${methodColor(line.method)}`,
                    color: methodColor(line.method), fontSize: "9px", letterSpacing: "0.1em",
                    fontFamily: "'Didact Gothic', sans-serif",
                  }}>{line.method.replace("_", " ")}</span>
                </div>

                {line.method === "GOLD_EXCHANGE" ? (
                  <div>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                      {["Expected Weight", "Final Weight"].map((label, i) => (
                        <button key={label} onClick={() => updateLine(line.id, "is_estimated", i === 0)} style={{
                          padding: "6px 14px",
                          border: `1px solid ${line.is_estimated === (i === 0) ? "#E8A45A" : "var(--border)"}`,
                          background: line.is_estimated === (i === 0) ? "rgba(232,164,90,0.1)" : "transparent",
                          color: line.is_estimated === (i === 0) ? "#E8A45A" : "var(--text-muted)",
                          fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px", cursor: "pointer",
                        }}>{label}</button>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                      <div>
                        <p className="label-caps" style={{ marginBottom: "6px", fontSize: "9px" }}>Description</p>
                        <input type="text" placeholder="e.g. Gold bangles" value={line.gold_description}
                          onChange={(e) => updateLine(line.id, "gold_description", e.target.value)}
                          className="input-luxury" style={{ fontSize: "13px" }} />
                      </div>
                      <div>
                        <p className="label-caps" style={{ marginBottom: "6px", fontSize: "9px" }}>
                          {line.is_estimated ? "Expected Weight (g)" : "Final Weight (g)"}
                        </p>
                        <input type="number" placeholder="e.g. 12.5" value={line.gold_weight}
                          onChange={(e) => updateLine(line.id, "gold_weight", e.target.value)}
                          className="input-luxury" style={{ fontSize: "13px" }} />
                      </div>
                      <div>
                        <p className="label-caps" style={{ marginBottom: "6px", fontSize: "9px" }}>Purity</p>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {PURITIES.map(p => (
                            <button key={p} onClick={() => updateLine(line.id, "gold_purity", p)} style={{
                              flex: 1, padding: "8px 4px",
                              border: `1px solid ${line.gold_purity === p ? "#E8A45A" : "var(--border)"}`,
                              background: line.gold_purity === p ? "rgba(232,164,90,0.1)" : "transparent",
                              color: line.gold_purity === p ? "#E8A45A" : "var(--text-muted)",
                              fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px", cursor: "pointer",
                            }}>{p}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="label-caps" style={{ marginBottom: "6px", fontSize: "9px" }}>Rate Override (₹/g)</p>
                        <input type="number" placeholder="Today's rate"
                          value={line.gold_rate_override}
                          onChange={(e) => updateLine(line.id, "gold_rate_override", e.target.value)}
                          className="input-luxury" style={{ fontSize: "13px" }} />
                      </div>
                    </div>

                    {line.gold_weight && goldRates && (
                      <div style={{
                        marginTop: "12px", padding: "10px 14px",
                        background: "rgba(232,164,90,0.08)", border: "1px solid rgba(232,164,90,0.2)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <p style={{ fontSize: "11px", color: "#E8A45A", letterSpacing: "0.1em" }}>
                          {line.is_estimated ? "ESTIMATED VALUE" : "FINAL VALUE"}
                          {line.gold_rate_override && <span style={{ marginLeft: "8px", opacity: 0.7 }}>(custom rate)</span>}
                        </p>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#E8A45A", fontWeight: 600 }}>
                          ₹{fmt(getGoldValue(line))}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="label-caps" style={{ marginBottom: "6px", fontSize: "9px" }}>Amount (₹)</p>
                    <input type="number" placeholder="e.g. 25000" value={line.amount}
                      onChange={(e) => updateLine(line.id, "amount", e.target.value)}
                      className="input-luxury" />
                  </div>
                )}
              </div>
            ))}

            {lines.length > 0 && totalAmount > 0 && (
              <div style={{
                background: "var(--gold-subtle)", border: "1px solid var(--border-gold)",
                padding: "16px 20px", display: "flex", justifyContent: "space-between",
                alignItems: "center", marginTop: "8px",
              }}>
                <p style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>
                  Total Payment
                </p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", color: "var(--gold)", fontWeight: 600 }}>
                  ₹{fmt(totalAmount)}
                </p>
              </div>
            )}
          </div>

          {error   && <p style={{ color: "#E05C7A", fontSize: "12px", marginBottom: "12px" }}>{error}</p>}
          {success && <p style={{ color: "#5CB87A", fontSize: "12px", marginBottom: "12px" }}>✓ {success}</p>}

          <button onClick={handleSubmit} disabled={saving || lines.length === 0} className="btn-gold">
            {saving ? "Saving..." : "Record Payment"}
          </button>
        </div>
      )}

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
        <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
          Loading...
        </p>
      ) : payments.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
          No payments recorded yet.
        </p>
      ) : (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Method</th>
                <th>Amount</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        padding: "3px 10px",
                        border: `1px solid ${methodColor(payment.payment_method)}`,
                        color: methodColor(payment.payment_method),
                        fontSize: "9px", letterSpacing: "0.1em",
                        fontFamily: "'Didact Gothic', sans-serif",
                      }}>{payment.payment_method.replace("_", " ")}</span>
                      {isEstimated(payment) && (
                        <span style={{
                          padding: "2px 8px", fontSize: "8px",
                          background: "rgba(232,164,90,0.15)",
                          border: "1px solid rgba(232,164,90,0.4)",
                          color: "#E8A45A", letterSpacing: "0.1em",
                        }}>ESTIMATED</span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "var(--gold)", fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 600 }}>
                    ₹{fmt(Number(payment.amount))}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    {payment.notes || "—"}
                  </td>
                  <td>
                    {isEstimated(payment) && (
                      <button
                        onClick={() => openEdit(payment)}
                        className="btn-outline"
                        style={{ padding: "5px 14px", fontSize: "10px", color: "#E8A45A", borderColor: "#E8A45A" }}
                      >
                        Update to Final
                      </button>
                    )}
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