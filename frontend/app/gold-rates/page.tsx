"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface GoldRate {
  id: string;
  effective_date: string;
  price_per_gram_24k: number;
  created_at: string;
}

interface RateToday {
  "24K": number;
  "22K": number;
  "18K": number;
  "14K": number;
}

const fmt = (n: number) => n.toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function GoldRatesPage() {
  const router = useRouter();
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [today, setToday] = useState<RateToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [role, setRole] = useState("");

  const fetchData = (token: string) => {
    Promise.all([
      fetch("http://localhost:8000/gold-rates/history", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch("http://localhost:8000/gold-rates/today", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
    ]).then(([ratesData, todayData]) => {
      setRates(Array.isArray(ratesData) ? ratesData : []);
      setToday(todayData);
      setLoading(false);
    }).catch((e) => { console.log(e); setLoading(false); });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const r = localStorage.getItem("role") || "";
    if (!token) { router.push("/login"); return; }
    setRole(r);
    fetchData(token);
  }, [router]);

  const handleSubmit = async () => {
    if (!price) { setError("Please enter a price"); return; }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/gold-rates/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          price_per_gram_24k: parseFloat(price),
          effective_date: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess("Rate updated successfully");
      setPrice("");
      fetchData(token!);
    } catch {
      setError("Could not save rate. Please try again.");
    }
    setSaving(false);
  };

  const canEdit = role === "OWNER" || role === "MANAGER";

  return (
    <div style={{ maxWidth: "800px" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Gold Rates</p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "40px", fontWeight: 400,
          color: "var(--text-primary)",
        }}>Gold Rate Register</h1>
      </div>

      {/* Today's Rates */}
      {today && (
        <div style={{
          background: "var(--gold-subtle)",
          border: "1px solid var(--border-gold)",
          padding: "28px 32px",
          marginBottom: "32px",
          position: "relative",
        }}>
          <span style={{ position: "absolute", top: "10px", left: "14px", color: "var(--gold)", fontSize: "8px", opacity: 0.5 }}>✦</span>
          <span style={{ position: "absolute", top: "10px", right: "14px", color: "var(--gold)", fontSize: "8px", opacity: 0.5 }}>✦</span>
          <span style={{ position: "absolute", bottom: "10px", left: "14px", color: "var(--gold)", fontSize: "8px", opacity: 0.5 }}>✦</span>
          <span style={{ position: "absolute", bottom: "10px", right: "14px", color: "var(--gold)", fontSize: "8px", opacity: 0.5 }}>✦</span>

          <p className="label-caps" style={{ marginBottom: "20px", textAlign: "center" }}>Today's Rates</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {(["24K", "22K", "18K", "14K"] as const).map(purity => (
              <div key={purity} style={{ textAlign: "center" }}>
                <p style={{
                  fontSize: "10px", letterSpacing: "0.2em",
                  textTransform: "uppercase", color: "var(--gold)",
                  marginBottom: "6px",
                }}>{purity}</p>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "22px", fontWeight: 600,
                  color: "var(--text-primary)",
                }}>₹{fmt(Number(today[purity]))}</p>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>per gram</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Set Rate Form */}
      {canEdit && (
        <div className="card-ornate" style={{ marginBottom: "40px" }}>
          <p className="label-caps" style={{ marginBottom: "20px" }}>Set Today's 24K Rate</p>
          <p style={{
            fontFamily: "'Cormorant', serif",
            fontSize: "14px", fontStyle: "italic",
            color: "var(--text-muted)", marginBottom: "20px",
          }}>
            Enter the 24K gold price per gram. All other purities will be calculated automatically.
          </p>

          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <p className="label-caps" style={{ marginBottom: "10px" }}>Price per gram (₹) — 24K</p>
              <input
                type="number"
                placeholder="e.g. 6200"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input-luxury"
              />
            </div>
            <button onClick={handleSubmit} disabled={saving} className="btn-gold" style={{ flexShrink: 0 }}>
              {saving ? "Saving..." : "Set Rate"}
            </button>
          </div>

          {/* Live preview */}
          {price && (
            <div style={{
              marginTop: "20px",
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px",
            }}>
              {[
                { purity: "24K", multiplier: 1.0    },
                { purity: "22K", multiplier: 0.9167 },
                { purity: "18K", multiplier: 0.76   },
                { purity: "14K", multiplier: 0.65   },
              ].map(({ purity, multiplier }) => (
                <div key={purity} style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  padding: "12px", textAlign: "center",
                }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.2em", color: "var(--gold)", marginBottom: "4px" }}>{purity}</p>
                  <p style={{ fontSize: "16px", color: "var(--text-primary)", fontFamily: "'Playfair Display', serif" }}>
                    ₹{fmt(parseFloat(price) * multiplier)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {error && <p style={{ color: "#E05C7A", fontSize: "12px", marginTop: "12px" }}>{error}</p>}
          {success && <p style={{ color: "#5CB87A", fontSize: "12px", marginTop: "12px" }}>✓ {success}</p>}
        </div>
      )}

      {/* History */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
          <p className="label-caps">Rate History</p>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, var(--border-gold), transparent)" }} />
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
            Loading...
          </p>
        ) : rates.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
            No rates recorded yet.
          </p>
        ) : (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
            <table className="table-luxury">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>24K</th>
                  <th>22K</th>
                  <th>18K</th>
                  <th>14K</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate, index) => (
                  <tr key={rate.id} style={{
                    background: index === 0 ? "var(--gold-subtle)" : "transparent",
                  }}>
                    <td>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px" }}>
                        {new Date(rate.effective_date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "long", year: "numeric"
                        })}
                      </span>
                      {index === 0 && (
                        <span style={{
                          marginLeft: "8px", fontSize: "9px",
                          color: "var(--gold)", letterSpacing: "0.1em",
                        }}>TODAY</span>
                      )}
                    </td>
                    <td style={{ color: "var(--gold)", fontFamily: "'Playfair Display', serif" }}>
                      ₹{fmt(Number(rate.price_per_gram_24k))}
                    </td>
                    <td>₹{fmt(rate.price_per_gram_24k * 0.9167)}</td>
                    <td>₹{fmt(rate.price_per_gram_24k * 0.76)}</td>
                    <td>₹{fmt(rate.price_per_gram_24k * 0.65)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}