"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Client { id: string; full_name: string; phone: string; }
interface GoldRates { "24K": number; "22K": number; "18K": number; "14K": number; }

interface StoneRow {
  id: number;
  stone_name: string;
  weight: string;
  price_per_carat: string;
  total_price: string;
  notes: string;
  manual_total: boolean;
}

const METAL_TYPES   = ["Gold", "Silver", "Platinum", "Other"];
const PURITY_KEYS   = ["24K", "22K", "18K", "14K"];

const fmt  = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

let stoneCounter = 0;

function NewOrderForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const prefilledClient = searchParams.get("client");

  const [clients,    setClients]    = useState<Client[]>([]);
  const [goldRates,  setGoldRates]  = useState<GoldRates | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [stones,     setStones]     = useState<StoneRow[]>([]);

  const [clientId,       setClientId]       = useState(prefilledClient || "");
  const [metalType,      setMetalType]      = useState("Gold");
  const [purityKey,      setPurityKey]      = useState("22K");
  const [grossWeight,    setGrossWeight]    = useState("");
  const [goldWeight,     setGoldWeight]     = useState("");
  const [goldRate,       setGoldRate]       = useState("");
  const [makingCharges,  setMakingCharges]  = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [notes,          setNotes]          = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const h = { "Authorization": `Bearer ${token}` };
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/`,          { headers: h }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/gold-rates/today`,  { headers: h }).then(r => r.json()),
    ]).then(([clientsData, ratesData]) => {
      setClients(Array.isArray(clientsData) ? clientsData : []);
      if (ratesData?.["22K"]) {
        setGoldRates(ratesData);
        setGoldRate(String(ratesData["22K"]));
      }
    });
  }, [router]);

  const handlePurityChange = (key: string) => {
    setPurityKey(key);
    if (goldRates?.[key as keyof GoldRates]) {
      setGoldRate(String(goldRates[key as keyof GoldRates]));
    }
  };

  const isGold    = metalType === "Gold";
  const goldValue = (parseFloat(goldWeight) || 0) * (parseFloat(goldRate) || 0);
  const stonesTotal   = stones.reduce((s, st) => s + (parseFloat(st.total_price) || 0), 0);
  const costing       = goldValue + stonesTotal;

  const addStone = () => {
    stoneCounter++;
    setStones(prev => [...prev, {
      id: stoneCounter, stone_name: "", weight: "",
      price_per_carat: "", total_price: "", notes: "", manual_total: false,
    }]);
  };

  const updateStone = (id: number, field: string, value: string) => {
    setStones(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      if ((field === "weight" || field === "price_per_carat") && !updated.manual_total) {
        const w = parseFloat(field === "weight" ? value : s.weight) || 0;
        const r = parseFloat(field === "price_per_carat" ? value : s.price_per_carat) || 0;
        if (w && r) updated.total_price = String((w * r).toFixed(2));
      }
      if (field === "total_price") updated.manual_total = true;
      return updated;
    }));
  };

  const removeStone = (id: number) => setStones(prev => prev.filter(s => s.id !== id));

  const handleSubmit = async () => {
    if (!estimatedPrice) { setError("Estimated price is required"); return; }
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const stonesPayload = stones
        .filter(s => s.stone_name.trim())
        .map(s => ({
          stone_name:      s.stone_name,
          weight:          parseFloat(s.weight) || null,
          price_per_carat: parseFloat(s.price_per_carat) || null,
          total_price:     parseFloat(s.total_price) || 0,
          notes:           s.notes || null,
        }));

      const body: Record<string, unknown> = {
        client_id:             clientId || null,
        estimated_weight:      grossWeight ? parseFloat(grossWeight) : null,
        estimated_gold_weight: goldWeight ? parseFloat(goldWeight) : null,
        estimated_purity:      isGold ? purityKey : null,
        estimated_price:  parseFloat(estimatedPrice),
        notes:            `[${metalType}]${notes ? " " + notes.trim() : ""}`,
        // pass extra fields for reference
        gold_rate_snapshot: parseFloat(goldRate) || null,
        making_charges:     parseFloat(makingCharges) || null,
        stones:             stonesPayload,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      router.push(`/orders/${data.id}`);
    } catch {
      setError("Could not create order. Please try again.");
    }
    setSaving(false);
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px",
    background: "var(--surface)", border: "1px solid var(--border)",
    color: "var(--text-primary)", fontFamily: "'Didact Gothic', sans-serif",
    fontSize: "13px", outline: "none", boxSizing: "border-box" as const,
  };

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "8px", fontFamily: "'Didact Gothic', sans-serif" }}>
      {children}
    </p>
  );

  return (
    <div style={{ maxWidth: "900px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <Link href="/orders" style={{ textDecoration: "none" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px", cursor: "pointer" }}>
            ← Back to Orders
          </p>
        </Link>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; New Order</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", fontWeight: 400, color: "var(--text-primary)" }}>
          Create Order
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Client + Metal */}
        <div className="card-ornate">
          <p className="label-caps" style={{ marginBottom: "20px" }}>Order Info</p>

          <div style={{ marginBottom: "20px" }}>
            <FieldLabel>Client</FieldLabel>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Stock Order (No Client) —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ""}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <FieldLabel>Metal Type</FieldLabel>
            <div style={{ display: "flex", gap: "8px" }}>
              {METAL_TYPES.map(m => (
                <button key={m} onClick={() => setMetalType(m)} style={{
                  flex: 1, padding: "10px",
                  border: `1px solid ${metalType === m ? "var(--gold)" : "var(--border)"}`,
                  background: metalType === m ? "var(--gold-subtle)" : "transparent",
                  color: metalType === m ? "var(--gold)" : "var(--text-muted)",
                  fontFamily: "'Didact Gothic', sans-serif", fontSize: "11px",
                  letterSpacing: "0.06em", cursor: "pointer",
                }}>{m}</button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Notes / Description</FieldLabel>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Design instructions, client requirements..."
              style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }} />
          </div>
        </div>

        {/* Costing estimate */}
        <div style={{ border: "1px solid var(--border-gold)", overflow: "hidden" }}>

          <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
            <p className="label-caps" style={{ fontSize: "9px" }}>Costing Estimate</p>
            <p style={{ fontFamily: "'Cormorant', serif", fontSize: "13px", fontStyle: "italic", color: "var(--text-muted)", marginTop: "4px" }}>
              Used for reference — actual pricing is set when locking the order
            </p>
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            {["Item", "Weight / Qty", "Rate", "Est. Cost"].map(h => (
              <div key={h} style={{ padding: "8px 14px", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", borderRight: "1px solid var(--border)" }}>{h}</div>
            ))}
          </div>

          {/* Gross weight row */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Gross Weight</p>
            </div>
            <div style={{ padding: "6px 10px", borderRight: "1px solid var(--border)" }}>
              <input type="number" value={grossWeight} onChange={e => setGrossWeight(e.target.value)}
                placeholder="e.g. 59.63"
                style={{ ...inputStyle, padding: "6px 10px", fontSize: "13px" }} />
            </div>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
              {isGold ? (
                <div style={{ display: "flex", gap: "4px" }}>
                  {PURITY_KEYS.map(p => (
                    <button key={p} onClick={() => handlePurityChange(p)} style={{
                      flex: 1, padding: "6px 2px",
                      border: `1px solid ${purityKey === p ? "var(--gold)" : "var(--border)"}`,
                      background: purityKey === p ? "var(--gold-subtle)" : "transparent",
                      color: purityKey === p ? "var(--gold)" : "var(--text-muted)",
                      fontFamily: "'Didact Gothic', sans-serif", fontSize: "9px", cursor: "pointer",
                    }}>{p}</button>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px 0" }}>{metalType}</p>
              )}
            </div>
            <div style={{ padding: "10px 14px" }} />
          </div>

          {/* Gold weight row */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Gold Weight</p>
            </div>
            <div style={{ padding: "6px 10px", borderRight: "1px solid var(--border)" }}>
              <input type="number" value={goldWeight} onChange={e => setGoldWeight(e.target.value)}
                placeholder="e.g. 52.00"
                style={{ ...inputStyle, padding: "6px 10px", fontSize: "13px" }} />
            </div>
            <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }} />
            <div style={{ padding: "10px 14px" }} />
          </div>

          {/* Gold row */}
          {isGold && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)", background: "rgba(201,168,76,0.04)" }}>
              <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "'Playfair Display', serif" }}>Gold</p>
              </div>
              <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{parseFloat(goldWeight) > 0 ? `${parseFloat(goldWeight).toFixed(3)} g` : "—"}</p>
              </div>
              <div style={{ padding: "6px 10px", borderRight: "1px solid var(--border)" }}>
                <input type="number" value={goldRate} onChange={e => setGoldRate(e.target.value)}
                  placeholder="Rate ₹/g"
                  style={{ ...inputStyle, padding: "6px 10px", fontSize: "12px" }} />
              </div>
              <div style={{ padding: "10px 14px" }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: "var(--gold)" }}>
                  {goldValue > 0 ? `₹${fmt(goldValue)}` : "—"}
                </p>
              </div>
            </div>
          )}

          {/* Stone rows */}
          {stones.map(stone => (
            <div key={stone.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)", position: "relative" }}>
              <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
                <input value={stone.stone_name} onChange={e => updateStone(stone.id, "stone_name", e.target.value)}
                  placeholder="Stone name" style={{ ...inputStyle, padding: "6px 10px", fontSize: "12px" }} />
              </div>
              <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
                <input type="number" value={stone.weight} onChange={e => updateStone(stone.id, "weight", e.target.value)}
                  placeholder="ct" style={{ ...inputStyle, padding: "6px 10px", fontSize: "12px" }} />
              </div>
              <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
                <input type="number" value={stone.price_per_carat} onChange={e => updateStone(stone.id, "price_per_carat", e.target.value)}
                  placeholder="₹/ct" style={{ ...inputStyle, padding: "6px 10px", fontSize: "12px" }} />
              </div>
              <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <input type="number" value={stone.total_price} onChange={e => updateStone(stone.id, "total_price", e.target.value)}
                  placeholder="total"
                  style={{ ...inputStyle, padding: "6px 8px", fontSize: "12px", flex: 1, color: stone.manual_total ? "var(--gold)" : "var(--text-primary)" }} />
                <button onClick={() => removeStone(stone.id)} style={{
                  background: "transparent", border: "none",
                  color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", flexShrink: 0,
                }}>✕</button>
              </div>
            </div>
          ))}

          {/* Add stone */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
            <button onClick={addStone} style={{
              background: "transparent", border: "1px dashed var(--border)",
              color: "var(--text-muted)", padding: "6px 16px",
              fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px",
              letterSpacing: "0.08em", cursor: "pointer",
            }}>+ Add Stone / Material</button>
          </div>

          {/* Costing subtotal */}
          {costing > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ padding: "11px 14px", gridColumn: "1 / 4", borderRight: "1px solid var(--border)" }}>
                <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>Costing (Material Total)</p>
              </div>
              <div style={{ padding: "11px 14px" }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", color: "var(--text-secondary)" }}>₹{fmt(costing)}</p>
              </div>
            </div>
          )}

          {/* Making charges — manual */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
            <div style={{ padding: "11px 14px", gridColumn: "1 / 4", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Labour / Making Charges</p>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "2px" }}>Enter manually</p>
            </div>
            <div style={{ padding: "8px 10px" }}>
              <input type="number" value={makingCharges} onChange={e => setMakingCharges(e.target.value)}
                placeholder="e.g. 96788"
                style={{ ...inputStyle, padding: "6px 10px", fontSize: "14px", fontFamily: "'Playfair Display', serif", color: "#5CB87A" }} />
            </div>
          </div>

          {/* Estimated final price — manual */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--gold-subtle)", borderTop: "2px solid var(--border-gold)" }}>
            <div style={{ padding: "16px 20px", gridColumn: "1 / 4", borderRight: "1px solid var(--border-gold)" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>Estimated Price *</p>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "4px" }}>
                Enter the expected final price manually
              </p>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <input type="number" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)}
                placeholder="e.g. 936620"
                style={{ ...inputStyle, fontSize: "20px", fontFamily: "'Playfair Display', serif", color: "var(--gold)", background: "transparent" }} />
            </div>
          </div>

        </div>

        {error && <p style={{ color: "#E05C7A", fontSize: "12px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSubmit} disabled={saving} className="btn-gold">
            {saving ? "Creating…" : "Create Order"}
          </button>
          <Link href="/orders">
            <button className="btn-outline">Cancel</button>
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrderForm />
    </Suspense>
  );
}