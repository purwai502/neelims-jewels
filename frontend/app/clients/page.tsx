"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setClients(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div style={{ maxWidth: "1000px" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Studio Clients</p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "40px",
            fontWeight: 400,
            color: "var(--text-primary)",
          }}>Client Registry</h1>
        </div>
        <Link href="/clients/new" style={{ textDecoration: "none" }}>
          <button className="btn-gold">+ Add Client</button>
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "32px" }}>
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-luxury"
          style={{ maxWidth: "360px" }}
        />
      </div>

      {/* Ornate divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
        <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontFamily: "'Cormorant', serif", fontSize: "18px" }}>
          Loading clients...
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontFamily: "'Cormorant', serif", fontSize: "18px" }}>
          No clients found.
        </p>
      ) : (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-gold)",
          overflow: "hidden",
        }}>
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id}>
                  <td>
                    <span style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "15px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}>{client.full_name}</span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{client.phone || "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{client.email || "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{client.address || "—"}</td>
                  <td>
                    <Link href={`/clients/${client.id}`} style={{ textDecoration: "none" }}>
                      <button className="btn-outline" style={{ padding: "6px 16px", fontSize: "10px" }}>
                        View
                      </button>
                    </Link>
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
