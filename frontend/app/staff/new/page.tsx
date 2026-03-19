"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STAFF_TYPES  = ["EMPLOYEE", "KARIGAR", "CONTRACTOR"];
const STAFF_COLORS: Record<string, string> = {
  EMPLOYEE: "#C9A84C", KARIGAR: "#7A9BC9", CONTRACTOR: "#C97A9B",
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

export default function NewStaffPage() {
  const router = useRouter();

  const [fullName,      setFullName]      = useState("");
  const [phone,         setPhone]         = useState("");
  const [email,         setEmail]         = useState("");
  const [address,       setAddress]       = useState("");
  const [joinDate,      setJoinDate]      = useState("");
  const [staffType,     setStaffType]     = useState("EMPLOYEE");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [dayRate,       setDayRate]       = useState("");
  const [notes,         setNotes]         = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const isOwner = role === "OWNER";

  const [linkUserId, setLinkUserId] = useState("");

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError("Full name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const body: Record<string, unknown> = {
        full_name:      fullName.trim(),
        phone:          phone   || null,
        email:          email   || null,
        address:        address || null,
        join_date:      joinDate || null,
        staff_type:     staffType,
        monthly_salary: staffType === "EMPLOYEE" ? (parseFloat(monthlySalary) || 0) : 0,
        day_rate:       staffType !== "EMPLOYEE" ? (parseFloat(dayRate) || null) : null,
        salary_type:    staffType === "EMPLOYEE" ? "MONTHLY" : "PER_PIECE",
        notes:          notes || null,
      };
      if (isOwner && linkUserId.trim()) {
        body.user_id = linkUserId.trim();
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed");
      }
      router.push("/staff");
    } catch (e: any) {
      setError(e.message || "Could not add staff member");
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: "640px" }}>

      <div style={{ marginBottom: "36px" }}>
        <Link href="/staff" style={{ textDecoration: "none" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px", cursor: "pointer" }}>
            ← Back to Staff
          </p>
        </Link>
        <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Staff</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", fontWeight: 400, color: "var(--text-primary)" }}>
          Add Staff Member
        </h1>
      </div>

      <div className="card-ornate" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Name */}
        <div>
          <FieldLabel>Full Name *</FieldLabel>
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Ramesh Kumar" style={inputStyle} />
        </div>

        {/* Staff Type */}
        <div>
          <FieldLabel>Staff Type *</FieldLabel>
          <div style={{ display: "flex", gap: "8px" }}>
            {STAFF_TYPES.map(t => (
              <button key={t} onClick={() => setStaffType(t)} style={{
                flex: 1, padding: "12px",
                border: `1px solid ${staffType === t ? STAFF_COLORS[t] : "var(--border)"}`,
                background: staffType === t ? `${STAFF_COLORS[t]}15` : "transparent",
                color: staffType === t ? STAFF_COLORS[t] : "var(--text-muted)",
                fontFamily: "'Didact Gothic', sans-serif", fontSize: "11px",
                letterSpacing: "0.08em", cursor: "pointer",
              }}>{t}</button>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", fontStyle: "italic", fontFamily: "'Cormorant', serif" }}>
            {staffType === "EMPLOYEE"   && "Fixed monthly salary. Attendance tracked daily."}
            {staffType === "KARIGAR"    && "Craftsman paid per piece or job. Payments logged separately."}
            {staffType === "CONTRACTOR" && "External contractor. Paid per job or day rate."}
          </p>
        </div>

        {/* Phone + Email */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 9876543210" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="e.g. ramesh@email.com" style={inputStyle} />
          </div>
        </div>

        {/* Join Date + Salary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <FieldLabel>Join Date</FieldLabel>
            <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)}
              style={inputStyle} />
          </div>
          <div>
            {staffType === "EMPLOYEE" ? (
              <>
                <FieldLabel>Monthly Salary (₹)</FieldLabel>
                <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)}
                  placeholder="e.g. 25000" style={inputStyle} />
              </>
            ) : (
              <>
                <FieldLabel>{staffType === "KARIGAR" ? "Rate per Piece (₹)" : "Day Rate (₹)"}</FieldLabel>
                <input type="number" value={dayRate} onChange={e => setDayRate(e.target.value)}
                  placeholder="e.g. 500" style={inputStyle} />
              </>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <FieldLabel>Address</FieldLabel>
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Optional" style={inputStyle} />
        </div>

        {/* Notes */}
        <div>
          <FieldLabel>Notes</FieldLabel>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }} />
        </div>

        {/* Owner only — link to user account */}
        {isOwner && (
          <div style={{
            padding: "16px", border: "1px solid var(--border)",
            background: "var(--surface)",
          }}>
            <FieldLabel>Link to User Account (Owner Only)</FieldLabel>
            <input value={linkUserId} onChange={e => setLinkUserId(e.target.value)}
              placeholder="Paste user UUID to link login access"
              style={inputStyle} />
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "6px", fontStyle: "italic" }}>
              Leave blank — staff members do not get software access by default.
            </p>
          </div>
        )}

        {error && <p style={{ color: "#E05C7A", fontSize: "12px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSubmit} disabled={saving} className="btn-gold">
            {saving ? "Saving…" : "Add Staff Member"}
          </button>
          <Link href="/staff">
            <button className="btn-outline">Cancel</button>
          </Link>
        </div>

      </div>
    </div>
  );
}
