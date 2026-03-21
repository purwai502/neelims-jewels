"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["EMPLOYEE", "MANAGER", "OWNER"];

export default function AddUserPage() {
  const router = useRouter();

  const [fullName,  setFullName]  = useState("");
  const [username,  setUsername]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [role,      setRole]      = useState("EMPLOYEE");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const r     = localStorage.getItem("role");
    if (!token) { router.push("/login"); return; }
    if (r !== "OWNER") { router.push("/dashboard"); return; }
  }, [router]);

  const reset = () => {
    setFullName(""); setUsername(""); setEmail(""); setPassword(""); setRole("EMPLOYEE");
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError("Full name is required"); return; }
    if (!username.trim()) { setError("Username is required"); return; }
    if (!password)        { setError("Password is required"); return; }

    setSaving(true); setError(""); setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username:  username.trim(),
          email:     email.trim() || null,
          password,
          role,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create user");
      }
      const created = await res.json();
      setSuccess(`User "${created.username}" (${created.role}) created successfully.`);
      reset();
    } catch (e: unknown) {
      setError((e as Error).message || "Could not create user");
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
    <div style={{ maxWidth: "520px" }}>

      <div style={{ marginBottom: "40px" }}>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; User Management</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "38px", fontWeight: 400, color: "var(--text-primary)" }}>
          Add User
        </h1>
        <p style={{ fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic", color: "var(--text-muted)", marginTop: "6px" }}>
          New users can log in immediately with their credentials.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        <div>
          <FieldLabel>Full Name *</FieldLabel>
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Priya Sharma" style={inputStyle} />
        </div>

        <div>
          <FieldLabel>Username *</FieldLabel>
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="e.g. priya.sharma" style={inputStyle} />
        </div>

        <div>
          <FieldLabel>Email (optional)</FieldLabel>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="e.g. priya@neelimajwels.com" style={inputStyle} />
        </div>

        <div>
          <FieldLabel>Password *</FieldLabel>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Set a strong password" style={inputStyle} />
        </div>

        <div>
          <FieldLabel>Role *</FieldLabel>
          <div style={{ display: "flex", gap: "8px" }}>
            {ROLES.map(r => (
              <button key={r} onClick={() => setRole(r)} style={pillStyle(role === r)}>{r}</button>
            ))}
          </div>
        </div>

      </div>

      {error && (
        <p style={{ marginTop: "20px", color: "#E05C7A", fontSize: "12px" }}>{error}</p>
      )}

      {success && (
        <div style={{
          marginTop: "20px", padding: "14px 18px",
          background: "rgba(92,184,122,0.08)", border: "1px solid rgba(92,184,122,0.3)",
        }}>
          <p style={{ color: "#5CB87A", fontSize: "13px", fontFamily: "'Didact Gothic', sans-serif" }}>
            ✓ {success}
          </p>
        </div>
      )}

      <div style={{ marginTop: "28px", display: "flex", gap: "12px" }}>
        <button onClick={handleSubmit} disabled={saving} className="btn-gold">
          {saving ? "Creating…" : "Create User"}
        </button>
        <button onClick={() => router.push("/dashboard")} className="btn-outline">
          Done
        </button>
      </div>

    </div>
  );
}
