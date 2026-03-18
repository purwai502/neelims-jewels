"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Vendor {
  id: string;
  business_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (role !== "OWNER") { router.push("/dashboard"); return; }

    fetch("http://localhost:8000/vendors/", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setVendors(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const filtered = vendors.filter(v =>
    v.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.includes(search) ||
    v.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: "1000px" }}>

      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Vendors</p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "40px", fontWeight: 400,
            color: "var(--text-primary)",
          }}>Vendor Registry</h1>
        </div>
        <Link href="/vendors/new" style={{ textDecoration: "none" }}>
          <button className="btn-gold">+ Add Vendor</button>
        </Link>
      </div>

      <div style={{ marginBottom: "32px" }}>
        <input
          type="text"
          placeholder="Search by name or contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-luxury"
          style={{ maxWidth: "360px" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
        <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
          Loading vendors...
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>
          No vendors found.
        </p>
      ) : (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <span style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "15px", fontWeight: 500,
                      color: "var(--text-primary)",
                    }}>{vendor.business_name}</span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{vendor.contact_person || "—"}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{vendor.phone || "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{vendor.email || "—"}</td>
                  <td>
                    <Link href={`/vendors/${vendor.id}`} style={{ textDecoration: "none" }}>
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