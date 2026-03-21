"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Order { id: string; status: string; notes: string | null; }
interface GoldRates { "24K": number; "22K": number; "18K": number; "14K": number; }
interface Vendor { id: string; business_name: string; }

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
const GOLD_PURITIES = ["24K", "22K", "18K", "14K"];
const CATEGORIES    = ["Jewellery", "Art", "Other"];
const SUB_CATEGORIES = ["Ring", "Earring", "Neck Piece", "Bracelet", "Other"];

const fmt  = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let stoneCounter = 0;

export default function NewProductPage() {
  const router = useRouter();

  // form state
  const [name,          setName]          = useState("");
  const [metalType,     setMetalType]     = useState("Gold");
  const [purity,        setPurity]        = useState("22K");      // unified purity string
  const [grossWeight,   setGrossWeight]   = useState("");
  const [goldWeight,    setGoldWeight]    = useState("");
  const [goldRate,      setGoldRate]      = useState("");
  const [makingCharges, setMakingCharges] = useState("");
  const [finalPrice,    setFinalPrice]    = useState("");
  const [description,   setDescription]  = useState("");
  const [orderId,       setOrderId]       = useState("");
  const [category,      setCategory]      = useState("");
  const [subCategory,   setSubCategory]   = useState("");
  const [stones,        setStones]        = useState<StoneRow[]>([]);
  const [costPrice,        setCostPrice]        = useState("");
  const [vendorId,         setVendorId]         = useState("");
  const [imageFile,        setImageFile]        = useState<File | null>(null);
  const [imagePreview,     setImagePreview]     = useState<string | null>(null);
  const [manualFinalPrice, setManualFinalPrice] = useState(false);

  // data
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [vendors,   setVendors]   = useState<Vendor[]>([]);
  const [goldRates, setGoldRates] = useState<GoldRates | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const h = { "Authorization": `Bearer ${token}` };
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/`,           { headers: h }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/gold-rates/today`,  { headers: h }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendors/`,          { headers: h }).then(r => r.json()),
    ]).then(([ordData, rateData, vendData]) => {
      setOrders(Array.isArray(ordData) ? ordData.filter((o: Order) => o.status === "DRAFT") : []);
      if (rateData?.["22K"]) {
        setGoldRate(String(rateData["22K"]));
        setGoldRates(rateData);
      }
      setVendors(Array.isArray(vendData) ? vendData : []);
    });
  }, [router]);

  // when metal type changes
  const handleMetalChange = (m: string) => {
    setMetalType(m);
    if (m === "Gold") {
      setPurity("22K");
      if (goldRates?.["22K"]) setGoldRate(String(goldRates["22K"]));
    } else {
      setPurity("");
      setGoldWeight("");
      setGoldRate("");
    }
  };

  // when gold purity button changes
  const handleGoldPurityChange = (key: string) => {
    setPurity(key);
    if (goldRates?.[key as keyof GoldRates]) {
      setGoldRate(String(goldRates[key as keyof GoldRates]));
    }
  };

  // derived values (live preview)
  const goldValue   = metalType === "Gold" ? (parseFloat(goldWeight) || 0) * (parseFloat(goldRate) || 0) : 0;
  const stonesTotal = stones.reduce((s, st) => s + (parseFloat(st.total_price) || 0), 0);
  const costing     = goldValue + stonesTotal;
  const autoFinal   = costing + (parseFloat(makingCharges) || 0);

  // keep final price in sync unless user has overridden it
  useEffect(() => {
    if (!manualFinalPrice) {
      setFinalPrice(autoFinal > 0 ? String(autoFinal.toFixed(2)) : "");
    }
  }, [autoFinal, manualFinalPrice]);

  // stone helpers
  const addStone = () => {
    stoneCounter++;
    setStones(prev => [...prev, {
      id: stoneCounter, stone_name: "", weight: "", price_per_carat: "", total_price: "", notes: "", manual_total: false,
    }]);
  };

  const updateStone = (id: number, field: string, value: string) => {
    setStones(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      if ((field === "weight" || field === "price_per_carat") && !updated.manual_total) {
        const w = parseFloat(field === "weight" ? value : s.weight) || 0;
        const r = parseFloat(field === "price_per_carat" ? value : s.price_per_carat) || 0;
        updated.total_price = w && r ? String((w * r).toFixed(2)) : updated.total_price;
      }
      if (field === "total_price") updated.manual_total = true;
      return updated;
    }));
  };

  const removeStone = (id: number) => setStones(prev => prev.filter(s => s.id !== id));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const applyImageFile = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (file) applyImageFile(file);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleSubmit = async () => {
    if (!name.trim())   { setError("Product name is required"); return; }
    if (!grossWeight)   { setError("Gross weight is required"); return; }
    if (metalType === "Gold" && !goldWeight) { setError("Gold weight is required"); return; }
    if (metalType === "Gold" && !goldRate)   { setError("Gold rate is required"); return; }
    if (!finalPrice)    { setError("Final price is required"); return; }

    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const body = {
        name:               name.trim(),
        description:        `[${metalType}]${description ? " " + description.trim() : ""}`,
        weight:             parseFloat(grossWeight),
        gold_weight:        metalType === "Gold" ? (parseFloat(goldWeight) || null) : null,
        purity:             purity || null,
        category:           category || null,
        sub_category:       subCategory || null,
        making_charges:     parseFloat(makingCharges) || 0,
        cost_price:         parseFloat(costPrice) || null,
        vendor_id:          vendorId || null,
        total_price:        parseFloat(finalPrice),
        order_id:           orderId || null,
        stones: stones.map(s => ({
          stone_name:      s.stone_name,
          weight:          parseFloat(s.weight) || null,
          price_per_carat: parseFloat(s.price_per_carat) || null,
          total_price:     parseFloat(s.total_price) || 0,
          notes:           s.notes || null,
        })).filter(s => s.stone_name.trim()),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create product");
      }

      const created = await res.json();

      if (imageFile && created.id) {
        const formData = new FormData();
        formData.append("file", imageFile);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${created.id}/image`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        });
      }

      router.push(`/products/${created.id}`);
    } catch (e: unknown) {
      setError((e as Error).message || "Could not create product");
    }
    setSaving(false);
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px",
    background: "var(--surface)", border: "1px solid var(--border)",
    color: "var(--text-primary)", fontFamily: "'Didact Gothic', sans-serif",
    fontSize: "13px", outline: "none", boxSizing: "border-box" as const,
  };

  const pillStyle = (active: boolean) => ({
    flex: 1, padding: "10px",
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    background: active ? "var(--gold-subtle)" : "transparent",
    color: active ? "var(--gold)" : "var(--text-muted)",
    fontFamily: "'Didact Gothic', sans-serif", fontSize: "11px",
    letterSpacing: "0.06em", cursor: "pointer",
  });

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "8px", fontFamily: "'Didact Gothic', sans-serif" }}>
      {children}
    </p>
  );

  return (
    <div style={{ maxWidth: "900px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <Link href="/products" style={{ textDecoration: "none" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px", cursor: "pointer" }}>
            ← Back to Products
          </p>
        </Link>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; New Product</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "38px", fontWeight: 400, color: "var(--text-primary)" }}>
          Add Product
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "24px", alignItems: "start" }}>

        {/* Image upload */}
        <div>
          <label style={{ cursor: "pointer", display: "block" }}>
            <div style={{
              aspectRatio: "1", background: "var(--bg-card)",
              border: "1px dashed var(--border-gold)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              overflow: "hidden", marginBottom: "8px",
            }}>
              {imagePreview ? (
                <img src={imagePreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <p style={{ color: "var(--gold)", fontSize: "28px", marginBottom: "8px" }}>◇</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>Click to upload</p>
                  <p style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: "4px" }}>or paste (Ctrl+V)</p>
                </>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </label>
          {imagePreview && (
            <button onClick={() => { setImageFile(null); setImagePreview(null); }}
              style={{ width: "100%", padding: "6px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "10px", cursor: "pointer", letterSpacing: "0.1em" }}>
              Remove Image
            </button>
          )}
        </div>

        {/* Main form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Name */}
          <div>
            <FieldLabel>Product Name *</FieldLabel>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. 1 Line Ruby Emerald Necklace"
              style={inputStyle} />
          </div>

          {/* Metal type */}
          <div>
            <FieldLabel>Metal Type</FieldLabel>
            <div style={{ display: "flex", gap: "8px" }}>
              {METAL_TYPES.map(m => (
                <button key={m} onClick={() => handleMetalChange(m)} style={pillStyle(metalType === m)}>{m}</button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <FieldLabel>Category</FieldLabel>
            <div style={{ display: "flex", gap: "8px" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => { setCategory(c === category ? "" : c); if (c !== "Jewellery") setSubCategory(""); }}
                  style={pillStyle(category === c)}>{c}</button>
              ))}
            </div>
          </div>

          {/* Sub-category — only for Jewellery */}
          {category === "Jewellery" && (
            <div>
              <FieldLabel>Type</FieldLabel>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {SUB_CATEGORIES.map(s => (
                  <button key={s} onClick={() => setSubCategory(s === subCategory ? "" : s)}
                    style={{ ...pillStyle(subCategory === s), flex: "unset", padding: "8px 14px" }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Purity — Gold: karat buttons; Silver/Platinum: text input; Other: hidden */}
          {metalType === "Gold" && (
            <div>
              <FieldLabel>Purity</FieldLabel>
              <div style={{ display: "flex", gap: "8px" }}>
                {GOLD_PURITIES.map(p => (
                  <button key={p} onClick={() => handleGoldPurityChange(p)} style={{ ...pillStyle(purity === p), fontSize: "13px" }}>{p}</button>
                ))}
              </div>
            </div>
          )}

          {(metalType === "Silver" || metalType === "Platinum") && (
            <div>
              <FieldLabel>Purity (optional, e.g. {metalType === "Silver" ? "925" : "950"})</FieldLabel>
              <input value={purity} onChange={e => setPurity(e.target.value)}
                placeholder={metalType === "Silver" ? "e.g. 925" : "e.g. 950"}
                style={inputStyle} />
            </div>
          )}

          {/* Weight row */}
          <div style={{ display: "grid", gridTemplateColumns: metalType === "Gold" ? "1fr 1fr 1fr" : "1fr", gap: "16px" }}>
            <div>
              <FieldLabel>Gross Weight (g) *</FieldLabel>
              <input type="number" value={grossWeight} onChange={e => setGrossWeight(e.target.value)}
                placeholder="e.g. 59.63" style={inputStyle} />
            </div>
            {metalType === "Gold" && (
              <>
                <div>
                  <FieldLabel>Gold Weight (g) *</FieldLabel>
                  <input type="number" value={goldWeight} onChange={e => setGoldWeight(e.target.value)}
                    placeholder="e.g. 52.00" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Gold Rate ₹/g * (auto-filled, editable)</FieldLabel>
                  <input type="number" value={goldRate} onChange={e => setGoldRate(e.target.value)}
                    placeholder="e.g. 12160" style={inputStyle} />
                </div>
              </>
            )}
          </div>

          {/* Live gold value preview (Gold only) */}
          {metalType === "Gold" && goldValue > 0 && (
            <div style={{
              padding: "12px 16px", background: "rgba(201,168,76,0.06)",
              border: "1px solid var(--border-gold)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <p style={{ fontSize: "10px", color: "var(--gold)", letterSpacing: "0.1em" }}>GOLD VALUE PREVIEW</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "var(--gold)" }}>
                ₹{fmt(goldValue)}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <FieldLabel>Description (optional)</FieldLabel>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Traditional bridal necklace with floral motif"
              style={inputStyle} />
          </div>

          {/* Link to order */}
          <div>
            <FieldLabel>Link to Order (optional)</FieldLabel>
            <select value={orderId} onChange={e => setOrderId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Stock item (no order) —</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.notes || o.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor */}
          <div>
            <FieldLabel>Vendor / Supplier (optional)</FieldLabel>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— No vendor —</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.business_name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Stones Section */}
      <div style={{ marginTop: "32px", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
        <div style={{
          background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)",
          padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <p className="label-caps" style={{ fontSize: "9px" }}>Stones & Materials</p>
          <button onClick={addStone} style={{
            padding: "6px 16px", background: "transparent",
            border: "1px solid var(--gold)", color: "var(--gold)",
            fontFamily: "'Didact Gothic', sans-serif", fontSize: "10px",
            letterSpacing: "0.08em", cursor: "pointer",
          }}>+ Add Stone</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 32px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          {["Stone / Material", "Weight (ct)", "Rate / ct (₹)", "Total (₹)", "Notes", ""].map(h => (
            <div key={h} style={{ padding: "8px 12px", fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", borderRight: "1px solid var(--border)" }}>{h}</div>
          ))}
        </div>

        {stones.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Cormorant', serif", fontSize: "14px", fontStyle: "italic", color: "var(--text-muted)" }}>
              No stones added — click "+ Add Stone" to add diamonds, rubies, emeralds, etc.
            </p>
          </div>
        ) : (
          stones.map(stone => (
            <div key={stone.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 32px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
                <input value={stone.stone_name} onChange={e => updateStone(stone.id, "stone_name", e.target.value)}
                  placeholder="e.g. Rubies" style={{ ...inputStyle, padding: "6px 10px", fontSize: "12px" }} />
              </div>
              <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
                <input type="number" value={stone.weight} onChange={e => updateStone(stone.id, "weight", e.target.value)}
                  placeholder="23.9" style={{ ...inputStyle, padding: "6px 10px", fontSize: "12px" }} />
              </div>
              <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
                <input type="number" value={stone.price_per_carat} onChange={e => updateStone(stone.id, "price_per_carat", e.target.value)}
                  placeholder="1800" style={{ ...inputStyle, padding: "6px 10px", fontSize: "12px" }} />
              </div>
              <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
                <input type="number" value={stone.total_price} onChange={e => updateStone(stone.id, "total_price", e.target.value)}
                  placeholder="auto"
                  style={{ ...inputStyle, padding: "6px 10px", fontSize: "12px", color: stone.manual_total ? "var(--gold)" : "var(--text-primary)" }} />
              </div>
              <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
                <input value={stone.notes} onChange={e => updateStone(stone.id, "notes", e.target.value)}
                  placeholder="optional notes" style={{ ...inputStyle, padding: "6px 10px", fontSize: "12px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <button onClick={() => removeStone(stone.id)} style={{
                  background: "transparent", border: "none",
                  color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", padding: "4px",
                }}>✕</button>
              </div>
            </div>
          ))
        )}

        {stonesTotal > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 32px", background: "var(--surface)", borderTop: "1px solid var(--border-gold)" }}>
            <div style={{ padding: "10px 12px", gridColumn: "1 / 5", borderRight: "1px solid var(--border)" }}>
              <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>Stones Total</p>
            </div>
            <div style={{ padding: "10px 12px" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: "var(--text-primary)" }}>₹{fmt(stonesTotal)}</p>
            </div>
            <div />
          </div>
        )}
      </div>

      {/* Pricing Section */}
      <div style={{ marginTop: "24px", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
        <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
          <p className="label-caps" style={{ fontSize: "9px" }}>Pricing</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ padding: "12px 20px", borderRight: "1px solid var(--border)" }}>
            <p style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Costing {metalType === "Gold" ? "(Gold + Stones)" : "(Stones)"} — reference only
            </p>
          </div>
          <div style={{ padding: "12px 20px" }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", color: "var(--text-secondary)" }}>₹{fmt(costing)}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", borderBottom: "1px solid var(--border)" }}>
          <div style={{ padding: "14px 20px", borderRight: "1px solid var(--border)" }}>
            <p style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>
              Labour / Making Charges *
            </p>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic" }}>Enter manually</p>
          </div>
          <div style={{ padding: "10px 16px" }}>
            <input type="number" value={makingCharges} onChange={e => setMakingCharges(e.target.value)}
              placeholder="e.g. 96788"
              style={{ ...inputStyle, fontSize: "15px", fontFamily: "'Playfair Display', serif", color: "#5CB87A" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", borderBottom: "1px solid var(--border)" }}>
          <div style={{ padding: "14px 20px", borderRight: "1px solid var(--border)" }}>
            <p style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>
              Studio Cost Price (optional)
            </p>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic" }}>What the studio paid for this product</p>
          </div>
          <div style={{ padding: "10px 16px" }}>
            <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)}
              placeholder="e.g. 750000"
              style={{ ...inputStyle, fontSize: "15px", fontFamily: "'Playfair Display', serif", color: "#E8A45A" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", background: "var(--gold-subtle)", borderTop: "2px solid var(--border-gold)" }}>
          <div style={{ padding: "16px 20px", borderRight: "1px solid var(--border-gold)" }}>
            <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>
              Final Price *
            </p>
            {manualFinalPrice ? (
              <button onClick={() => setManualFinalPrice(false)} style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontSize: "10px", color: "var(--gold)", fontStyle: "italic", textDecoration: "underline",
                fontFamily: "'Didact Gothic', sans-serif",
              }}>↩ Reset to auto ({autoFinal > 0 ? `₹${autoFinal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"})</button>
            ) : (
              <p style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic" }}>Auto-calculated · edit to override</p>
            )}
          </div>
          <div style={{ padding: "12px 16px" }}>
            <input type="number" value={finalPrice}
              onChange={e => { setManualFinalPrice(true); setFinalPrice(e.target.value); }}
              placeholder="e.g. 936620"
              style={{ ...inputStyle, fontSize: "20px", fontFamily: "'Playfair Display', serif", color: "var(--gold)", background: "transparent",
                outline: manualFinalPrice ? "1px solid var(--gold)" : "none" }} />
          </div>
        </div>
      </div>

      {error && (
        <p style={{ marginTop: "20px", color: "#E05C7A", fontSize: "12px" }}>{error}</p>
      )}

      <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
        <button onClick={handleSubmit} disabled={saving} className="btn-gold">
          {saving ? "Saving…" : "Create Product"}
        </button>
        <Link href="/products">
          <button className="btn-outline">Cancel</button>
        </Link>
      </div>

    </div>
  );
}
