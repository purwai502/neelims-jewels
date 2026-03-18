"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  debit_account_id: string;
  credit_account_id: string;
  reference_type: string;
  gold_weight: number | null;
  gold_purity: string | null;
  gold_rate_snapshot: number | null;
  notes: string | null;
}

interface Account {
  id: string;
  name: string;
  account_type: string;
}

const fmt = (n: number) => n.toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role === "EMPLOYEE") { router.push("/dashboard"); return; }

    Promise.all([
      fetch("http://localhost:8000/transactions/", {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
      fetch("http://localhost:8000/accounts/", {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(r => r.json()),
    ]).then(([txData, accData]) => {
      setTransactions(Array.isArray(txData) ? txData : []);
      setAccounts(Array.isArray(accData) ? accData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const getAccountName = (id: string) =>
    accounts.find(a => a.id === id)?.name || id.slice(0, 8);

  const FILTERS = ["ALL", "ORDER", "PAYMENT", "BUYBACK", "ADJUSTMENT"];

  const filtered = transactions.filter(t =>
    filter === "ALL" || t.reference_type === filter
  );

  const refColor = (type: string) => {
    switch (type) {
      case "ORDER":      return "#C9A84C";
      case "PAYMENT":    return "#5CB87A";
      case "BUYBACK":    return "#7A9BC9";
      case "ADJUSTMENT": return "#C97A9B";
      default:           return "var(--text-muted)";
    }
  };

  return (
    <div style={{ maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Transactions</p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "40px", fontWeight: 400,
          color: "var(--text-primary)",
        }}>Transaction Ledger</h1>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "32px", flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 20px",
              border: `1px solid ${filter === f ? "var(--gold)" : "var(--border)"}`,
              background: filter === f ? "var(--gold-subtle)" : "transparent",
              color: filter === f ? "var(--gold)" : "var(--text-muted)",
              fontFamily: "'Didact Gothic', sans-serif",
              fontSize: "10px", letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer", transition: "all 0.2s ease",
            }}
          >{f}</button>
        ))}
      </div>

      {/* Ornate divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
        <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
          Loading...
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
          No transactions found.
        </p>
      ) : (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Amount</th>
                <th>Gold</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(tx.date).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </td>
                  <td>
                    <span style={{
                      padding: "3px 10px",
                      border: `1px solid ${refColor(tx.reference_type)}`,
                      color: refColor(tx.reference_type),
                      fontSize: "9px", letterSpacing: "0.1em",
                      fontFamily: "'Didact Gothic', sans-serif",
                    }}>{tx.reference_type}</span>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {getAccountName(tx.debit_account_id)}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {getAccountName(tx.credit_account_id)}
                  </td>
                  <td style={{
                    color: "var(--gold)",
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "15px", fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}>
                    ₹{fmt(Number(tx.amount))}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {tx.gold_weight
                      ? `${tx.gold_weight}g · ${tx.gold_purity}`
                      : "—"}
                  </td>
                 <td style={{
                    fontSize: "12px", color: "var(--text-muted)",
                    fontStyle: "italic", maxWidth: "180px",
                  }}>
                    {tx.notes
                      ? tx.notes.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "").trim().replace(/:\s*$/, "").trim()
                      : "—"}
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