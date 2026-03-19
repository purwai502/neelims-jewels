"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface StaffMember {
  id: string; full_name: string; phone: string | null; email: string | null;
  address: string | null; join_date: string | null; staff_type: string;
  monthly_salary: number; day_rate: number | null; salary_type: string;
  is_active: boolean; notes: string | null; user_id: string | null;
}
interface AttendanceRecord { id: string; date: string; status: string; notes: string | null; }
interface SalaryCalc {
  base_salary: number; days_in_month: number; daily_rate: number;
  present: number; half_days: number; absent: number;
  absent_deduction: number; half_day_deduction: number;
  advances: number; net_salary: number; already_paid: boolean; paid_amount: number | null;
}
interface SalaryHistory {
  id: string; month: number; year: number; base_salary: number;
  absent_deduction: number; advances: number; bonus: number;
  final_amount: number; status: string; payment_method: string | null; paid_at: string | null;
}
interface Advance {
  id: string; amount: number; date: string; reason: string | null; notes: string | null; status: string;
}
interface KarigarPayment {
  id: string; amount: number; description: string | null; payment_date: string; notes: string | null;
}

const STAFF_COLORS: Record<string, string> = {
  EMPLOYEE: "#C9A84C", KARIGAR: "#7A9BC9", CONTRACTOR: "#C97A9B",
};
const ATT_COLORS: Record<string, string> = {
  PRESENT: "#5CB87A", HALF_DAY: "#E8A45A", ABSENT: "#E05C7A",
};
const ATT_LABELS: Record<string, string> = {
  PRESENT: "P", HALF_DAY: "H", ABSENT: "A",
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmt  = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: "var(--surface)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontFamily: "'Didact Gothic', sans-serif",
  fontSize: "13px", outline: "none", boxSizing: "border-box" as const,
};

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id     = params.id as string;

  const [staff,       setStaff]       = useState<StaffMember | null>(null);
  const [tab,         setTab]         = useState<"profile"|"attendance"|"salary"|"advances">("profile");
  const [loading,     setLoading]     = useState(true);

  // attendance
  const [attendance,  setAttendance]  = useState<AttendanceRecord[]>([]);
  const [attMonth,    setAttMonth]    = useState(new Date().getMonth() + 1);
  const [attYear,     setAttYear]     = useState(new Date().getFullYear());

  // salary
  const [salaryCalc,    setSalaryCalc]    = useState<SalaryCalc | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [salaryMonth,   setSalaryMonth]   = useState(new Date().getMonth() + 1);
  const [salaryYear,    setSalaryYear]    = useState(new Date().getFullYear());
  const [payingBonus,   setPayingBonus]   = useState("");
  const [payMethod,     setPayMethod]     = useState("CASH");
  const [payNotes,      setPayNotes]      = useState("");
  const [payingSalary,  setPayingSalary]  = useState(false);

  // advances
  const [advances,     setAdvances]    = useState<Advance[]>([]);
  const [newAdvAmount, setNewAdvAmount] = useState("");
  const [newAdvDate,   setNewAdvDate]   = useState(new Date().toISOString().slice(0, 10));
  const [newAdvReason, setNewAdvReason] = useState("");
  const [addingAdv,    setAddingAdv]    = useState(false);
  const [showAdvForm,  setShowAdvForm]  = useState(false);

  // karigar
  const [karigarPayments, setKarigarPayments] = useState<KarigarPayment[]>([]);
  const [newKAmount,      setNewKAmount]       = useState("");
  const [newKDesc,        setNewKDesc]         = useState("");
  const [newKDate,        setNewKDate]         = useState(new Date().toISOString().slice(0, 10));
  const [addingK,         setAddingK]          = useState(false);
  const [showKForm,       setShowKForm]        = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role  = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const h     = { "Authorization": `Bearer ${token}` };

  const fetchStaff = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}`, { headers: h });
    if (res.ok) { setStaff(await res.json()); setLoading(false); }
    else setLoading(false);
  }, [id]);

  const fetchAttendance = useCallback(async (month: number, year: number) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/attendance?month=${month}&year=${year}`, { headers: h });
    if (res.ok) setAttendance(await res.json());
  }, [id]);

  const fetchSalary = useCallback(async (month: number, year: number) => {
    const [calcRes, histRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/salary/calculate?month=${month}&year=${year}`, { headers: h }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/salary`, { headers: h }),
    ]);
    if (calcRes.ok) setSalaryCalc(await calcRes.json());
    if (histRes.ok) setSalaryHistory(await histRes.json());
  }, [id]);

  const fetchAdvances = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/advances`, { headers: h });
    if (res.ok) setAdvances(await res.json());
  }, [id]);

  const fetchKarigar = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/karigar-payments`, { headers: h });
    if (res.ok) setKarigarPayments(await res.json());
  }, [id]);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetchStaff();
  }, [id]);

  useEffect(() => {
    if (tab === "attendance") fetchAttendance(attMonth, attYear);
    if (tab === "salary")     { fetchSalary(salaryMonth, salaryYear); fetchAdvances(); }
    if (tab === "advances")   fetchAdvances();
    if (tab === "salary" && staff?.staff_type !== "EMPLOYEE") fetchKarigar();
  }, [tab, attMonth, attYear, salaryMonth, salaryYear]);

  const markAttendance = async (date: string, status: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...h },
      body: JSON.stringify({ date, status }),
    });
    fetchAttendance(attMonth, attYear);
  };

  const paySalary = async () => {
    if (!salaryCalc) return;
    setPayingSalary(true);
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/salary/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...h },
      body: JSON.stringify({
        month:              salaryMonth,
        year:               salaryYear,
        base_salary:        salaryCalc.base_salary,
        absent_deduction:   salaryCalc.absent_deduction,
        half_day_deduction: salaryCalc.half_day_deduction,
        advances:           salaryCalc.advances,
        bonus:              parseFloat(payingBonus) || 0,
        payment_method:     payMethod,
        notes:              payNotes || null,
      }),
    });
    setPayingSalary(false);
    fetchSalary(salaryMonth, salaryYear);
    fetchAdvances();
  };

  const addAdvance = async () => {
    if (!newAdvAmount) return;
    setAddingAdv(true);
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/advances`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...h },
      body: JSON.stringify({ amount: parseFloat(newAdvAmount), date: newAdvDate, reason: newAdvReason || null }),
    });
    setAddingAdv(false);
    setShowAdvForm(false);
    setNewAdvAmount(""); setNewAdvDate(new Date().toISOString().slice(0, 10)); setNewAdvReason("");
    fetchAdvances();
  };

  const toggleAdvance = async (advId: string, status: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/advances/${advId}?status=${status}`, {
      method: "PATCH", headers: h,
    });
    fetchAdvances();
  };

  const addKarigarPayment = async () => {
    if (!newKAmount) return;
    setAddingK(true);
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff/${id}/karigar-payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...h },
      body: JSON.stringify({ amount: parseFloat(newKAmount), description: newKDesc || null, payment_date: newKDate }),
    });
    setAddingK(false);
    setShowKForm(false);
    setNewKAmount(""); setNewKDesc(""); setNewKDate(new Date().toISOString().slice(0, 10));
    fetchKarigar();
  };

  // attendance calendar helpers
  const today        = new Date().toISOString().slice(0, 10);
  const daysInMonth  = new Date(attYear, attMonth, 0).getDate();
  const firstDay     = new Date(attYear, attMonth - 1, 1).getDay();
  const attMap       = Object.fromEntries(attendance.map(a => [a.date, a.status]));

  if (loading) return <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>Loading...</p>;
  if (!staff)  return <p style={{ color: "#E05C7A" }}>Staff member not found.</p>;

  const isEmployee   = staff.staff_type === "EMPLOYEE";
  const isKarigar    = staff.staff_type === "KARIGAR";
  const totalOutstanding = advances.filter(a => a.status === "PENDING").reduce((s, a) => s + a.amount, 0);
  const totalKarigar = karigarPayments.reduce((s, k) => s + k.amount, 0);

  const TABS = [
    { key: "profile",    label: "Profile" },
    { key: "attendance", label: "Attendance" },
    { key: "salary",     label: isEmployee ? "Salary" : "Payments" },
    { key: "advances",   label: "Advances" },
  ];

  return (
    <div style={{ maxWidth: "900px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Link href="/staff" style={{ textDecoration: "none" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px", cursor: "pointer" }}>
            ← Back to Staff
          </p>
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 400, color: "var(--text-primary)" }}>
                {staff.full_name}
              </h1>
              <span style={{
                padding: "4px 12px", fontSize: "9px", letterSpacing: "0.1em",
                border: `1px solid ${STAFF_COLORS[staff.staff_type]}`,
                color: STAFF_COLORS[staff.staff_type],
              }}>{staff.staff_type}</span>
            </div>
            {staff.phone && <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{staff.phone}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "32px", borderBottom: "1px solid var(--border-gold)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: "12px 24px", background: "transparent",
            border: "none", borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
            color: tab === t.key ? "var(--gold)" : "var(--text-muted)",
            fontFamily: "'Didact Gothic', sans-serif", fontSize: "11px",
            letterSpacing: "0.1em", cursor: "pointer", marginBottom: "-1px",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === "profile" && (
        <div className="card-ornate">
          <p className="label-caps" style={{ marginBottom: "24px" }}>Staff Details</p>
          {[
            { label: "Full Name",    value: staff.full_name },
            { label: "Staff Type",   value: staff.staff_type },
            { label: "Phone",        value: staff.phone || "—" },
            { label: "Email",        value: staff.email || "—" },
            { label: "Join Date",    value: staff.join_date ? new Date(staff.join_date).toLocaleDateString("en-IN") : "—" },
            { label: "Salary",       value: isEmployee ? `₹${fmt0(staff.monthly_salary)}/month` : staff.day_rate ? `₹${fmt0(staff.day_rate)}/piece` : "—" },
            { label: "Address",      value: staff.address || "—" },
            { label: "Notes",        value: staff.notes || "—" },
            ...(role === "OWNER" ? [{ label: "Linked User", value: staff.user_id || "No login access" }] : []),
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: "flex", gap: "24px",
              paddingBottom: "14px", marginBottom: "14px",
              borderBottom: "1px solid var(--border-light)",
            }}>
              <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", width: "100px", flexShrink: 0, paddingTop: "2px" }}>{label}</p>
              <p style={{ color: "var(--text-primary)", fontSize: "14px" }}>{value}</p>
            </div>
          ))}

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "8px" }}>
            <div style={{ padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
              <p style={{ fontSize: "8px", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "6px" }}>OUTSTANDING ADVANCES</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: totalOutstanding > 0 ? "#E05C7A" : "#5CB87A" }}>
                ₹{fmt0(totalOutstanding)}
              </p>
            </div>
            {isEmployee && (
              <div style={{ padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
                <p style={{ fontSize: "8px", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "6px" }}>MONTHLY SALARY</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "var(--gold)" }}>
                  ₹{fmt0(staff.monthly_salary)}
                </p>
              </div>
            )}
            {!isEmployee && (
              <div style={{ padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
                <p style={{ fontSize: "8px", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "6px" }}>TOTAL PAID</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "var(--gold)" }}>
                  ₹{fmt0(totalKarigar)}
                </p>
              </div>
            )}
            <div style={{ padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
              <p style={{ fontSize: "8px", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "6px" }}>STATUS</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", color: staff.is_active ? "#5CB87A" : "#E05C7A" }}>
                {staff.is_active ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {tab === "attendance" && (
        <div>
          {/* Month nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <button onClick={() => { if (attMonth === 1) { setAttMonth(12); setAttYear(y => y - 1); } else setAttMonth(m => m - 1); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "8px 16px", cursor: "pointer" }}>←</button>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "var(--text-primary)" }}>
              {MONTHS[attMonth - 1]} {attYear}
            </p>
            <button onClick={() => { if (attMonth === 12) { setAttMonth(1); setAttYear(y => y + 1); } else setAttMonth(m => m + 1); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "8px 16px", cursor: "pointer" }}>→</button>
          </div>

          {/* Monthly summary */}
          {attendance.length > 0 && (() => {
            const present   = attendance.filter(a => a.status === "PRESENT").length;
            const halfDays  = attendance.filter(a => a.status === "HALF_DAY").length;
            const absent    = attendance.filter(a => a.status === "ABSENT").length;
            const effective = present + halfDays * 0.5;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "20px" }}>
                {[
                  { label: "Present",   value: present,   color: "#5CB87A" },
                  { label: "Half-day",  value: halfDays,  color: "#E8A45A" },
                  { label: "Absent",    value: absent,    color: "#E05C7A" },
                  { label: "Effective", value: `${effective}d`, color: "var(--gold)" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding: "12px", background: "var(--bg-card)", border: "1px solid var(--border)", textAlign: "center" }}>
                    <p style={{ fontSize: "8px", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "4px" }}>{label.toUpperCase()}</p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color }}>{value}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} style={{ textAlign: "center", padding: "6px 0", fontSize: "9px", letterSpacing: "0.1em", color: "var(--text-muted)" }}>{d}</div>
            ))}
          </div>

          {/* Calendar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1;
              const dateStr = `${attYear}-${String(attMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const status  = attMap[dateStr];
              const isToday = dateStr === today;
              const isFuture = dateStr > today;

              return (
                <div key={day} style={{
                  aspectRatio: "1",
                  border: isToday ? "2px solid var(--gold)" : `1px solid ${status ? ATT_COLORS[status] + "60" : "var(--border)"}`,
                  background: status ? `${ATT_COLORS[status]}12` : "var(--bg-card)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  cursor: isFuture ? "default" : "pointer",
                  opacity: isFuture ? 0.3 : 1,
                  gap: "4px",
                }}>
                  <p style={{ fontSize: "10px", color: isToday ? "var(--gold)" : "var(--text-muted)" }}>{day}</p>
                  {!isFuture && (
                    <div style={{ display: "flex", gap: "2px" }}>
                      {["PRESENT", "HALF_DAY", "ABSENT"].map(s => (
                        <button key={s} onClick={() => markAttendance(dateStr, s)} style={{
                          width: "18px", height: "18px", fontSize: "7px", fontWeight: 600,
                          border: `1px solid ${status === s ? ATT_COLORS[s] : "var(--border)"}`,
                          background: status === s ? ATT_COLORS[s] : "transparent",
                          color: status === s ? "white" : "var(--text-muted)",
                          cursor: "pointer", padding: 0,
                        }}>{ATT_LABELS[s]}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SALARY TAB (EMPLOYEE) ── */}
      {tab === "salary" && isEmployee && (
        <div>
          {/* Month nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <button onClick={() => { if (salaryMonth === 1) { setSalaryMonth(12); setSalaryYear(y => y - 1); } else setSalaryMonth(m => m - 1); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "8px 16px", cursor: "pointer" }}>←</button>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "var(--text-primary)" }}>
              {MONTHS[salaryMonth - 1]} {salaryYear}
            </p>
            <button onClick={() => { if (salaryMonth === 12) { setSalaryMonth(1); setSalaryYear(y => y + 1); } else setSalaryMonth(m => m + 1); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "8px 16px", cursor: "pointer" }}>→</button>
          </div>

          {/* Salary calculation sheet */}
          {salaryCalc && (
            <div style={{ border: "1px solid var(--border-gold)", overflow: "hidden", marginBottom: "24px" }}>
              <div style={{ background: "var(--gold-subtle)", borderBottom: "1px solid var(--border-gold)", padding: "14px 20px" }}>
                <p className="label-caps" style={{ fontSize: "9px" }}>Salary Calculation — {MONTHS[salaryMonth - 1]} {salaryYear}</p>
              </div>

              {[
                { label: "Base Salary",        sub: `₹${fmt(salaryCalc.daily_rate)}/day × ${salaryCalc.days_in_month} days`, value: salaryCalc.base_salary,        color: "var(--text-primary)", sign: "" },
                { label: `Days Present`,        sub: `${salaryCalc.present} days`,   value: null,                            color: "#5CB87A",               sign: "" },
                { label: `Absent Deduction`,    sub: `${salaryCalc.absent} days`,    value: -salaryCalc.absent_deduction,   color: "#E05C7A",               sign: "−" },
                { label: `Half-day Deduction`,  sub: `${salaryCalc.half_days} days`, value: -salaryCalc.half_day_deduction, color: "#E8A45A",               sign: "−" },
                { label: `Advances`,            sub: "Pending advances",             value: -salaryCalc.advances,           color: "#E05C7A",               sign: "−" },
              ].map(({ label, sub, value, color, sign }) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr auto", borderBottom: "1px solid var(--border)", padding: "12px 20px" }}>
                  <div>
                    <p style={{ fontSize: "13px", color: "var(--text-primary)" }}>{label}</p>
                    <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{sub}</p>
                  </div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", color, alignSelf: "center" }}>
                    {value !== null ? `${sign}₹${fmt(Math.abs(value))}` : ""}
                  </p>
                </div>
              ))}

              {/* Final */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", background: "var(--gold-subtle)", borderTop: "2px solid var(--border-gold)", padding: "16px 20px" }}>
                <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", alignSelf: "center" }}>Net Payable</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", color: "var(--gold)", fontWeight: 600 }}>
                  ₹{fmt(salaryCalc.net_salary)}
                </p>
              </div>
            </div>
          )}

          {/* Pay action */}
          {salaryCalc && !salaryCalc.already_paid && (
            <div className="card-ornate" style={{ marginBottom: "24px" }}>
              <p className="label-caps" style={{ marginBottom: "16px" }}>Mark as Paid</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "6px" }}>BONUS (₹)</p>
                  <input type="number" value={payingBonus} onChange={e => setPayingBonus(e.target.value)}
                    placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "6px" }}>PAYMENT METHOD</p>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {["CASH","UPI","BANK","CHEQUE"].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <input value={payNotes} onChange={e => setPayNotes(e.target.value)}
                placeholder="Notes (optional)" style={{ ...inputStyle, marginBottom: "12px" }} />
              <button onClick={paySalary} disabled={payingSalary} className="btn-gold">
                {payingSalary ? "Processing…" : `Pay ₹${fmt((salaryCalc?.net_salary || 0) + (parseFloat(payingBonus) || 0))}`}
              </button>
            </div>
          )}

          {salaryCalc?.already_paid && (
            <div style={{ padding: "16px 20px", background: "rgba(92,184,122,0.08)", border: "1px solid rgba(92,184,122,0.3)", marginBottom: "24px" }}>
              <p style={{ color: "#5CB87A", fontFamily: "'Cormorant', serif", fontSize: "16px", fontStyle: "italic" }}>
                ✓ Salary paid — ₹{fmt(salaryCalc.paid_amount || 0)}
              </p>
            </div>
          )}

          {/* History */}
          {salaryHistory.length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
              <table className="table-luxury">
                <thead>
                  <tr><th>Month</th><th>Base</th><th>Deductions</th><th>Final</th><th>Method</th><th>Paid On</th></tr>
                </thead>
                <tbody>
                  {salaryHistory.map(s => (
                    <tr key={s.id}>
                      <td>{MONTHS[s.month - 1]} {s.year}</td>
                      <td>₹{fmt(s.base_salary)}</td>
                      <td style={{ color: "#E05C7A" }}>−₹{fmt(s.absent_deduction + s.advances)}</td>
                      <td style={{ color: "var(--gold)", fontFamily: "'Playfair Display', serif", fontSize: "15px" }}>₹{fmt(s.final_amount)}</td>
                      <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>{s.payment_method || "—"}</td>
                      <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>{s.paid_at ? new Date(s.paid_at).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS TAB (KARIGAR / CONTRACTOR) ── */}
      {tab === "salary" && !isEmployee && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <p className="label-caps" style={{ marginBottom: "4px" }}>Payment Log</p>
              <p style={{ fontFamily: "'Cormorant', serif", fontSize: "14px", color: "var(--text-muted)", fontStyle: "italic" }}>
                Total paid: ₹{fmt(totalKarigar)}
              </p>
            </div>
            <button onClick={() => setShowKForm(!showKForm)} className="btn-gold" style={{ fontSize: "11px" }}>
              {showKForm ? "Cancel" : "+ Log Payment"}
            </button>
          </div>

          {showKForm && (
            <div className="card-ornate" style={{ marginBottom: "24px" }}>
              <p className="label-caps" style={{ marginBottom: "16px" }}>New Payment</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "6px" }}>AMOUNT (₹) *</p>
                  <input type="number" value={newKAmount} onChange={e => setNewKAmount(e.target.value)}
                    placeholder="e.g. 5000" style={inputStyle} />
                </div>
                <div>
                  <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "6px" }}>DATE</p>
                  <input type="date" value={newKDate} onChange={e => setNewKDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "6px" }}>DESCRIPTION</p>
                <input value={newKDesc} onChange={e => setNewKDesc(e.target.value)}
                  placeholder="e.g. 10 bangle set, ring batch" style={inputStyle} />
              </div>
              <button onClick={addKarigarPayment} disabled={addingK} className="btn-gold">
                {addingK ? "Saving…" : "Log Payment"}
              </button>
            </div>
          )}

          {karigarPayments.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "16px", fontStyle: "italic" }}>No payments logged yet.</p>
          ) : (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
              <table className="table-luxury">
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {karigarPayments.map(k => (
                    <tr key={k.id}>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{new Date(k.payment_date).toLocaleDateString("en-IN")}</td>
                      <td style={{ fontFamily: "'Cormorant', serif", fontSize: "14px", fontStyle: "italic" }}>{k.description || "—"}</td>
                      <td style={{ color: "var(--gold)", fontFamily: "'Playfair Display', serif", fontSize: "15px" }}>₹{fmt(k.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ADVANCES TAB ── */}
      {tab === "advances" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <p className="label-caps" style={{ marginBottom: "4px" }}>Salary Advances</p>
              <p style={{ fontFamily: "'Cormorant', serif", fontSize: "14px", color: totalOutstanding > 0 ? "#E05C7A" : "#5CB87A", fontStyle: "italic" }}>
                Outstanding: ₹{fmt(totalOutstanding)}
              </p>
            </div>
            <button onClick={() => setShowAdvForm(!showAdvForm)} className="btn-gold" style={{ fontSize: "11px" }}>
              {showAdvForm ? "Cancel" : "+ Log Advance"}
            </button>
          </div>

          {showAdvForm && (
            <div className="card-ornate" style={{ marginBottom: "24px" }}>
              <p className="label-caps" style={{ marginBottom: "16px" }}>New Advance</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "6px" }}>AMOUNT (₹) *</p>
                  <input type="number" value={newAdvAmount} onChange={e => setNewAdvAmount(e.target.value)}
                    placeholder="e.g. 2000" style={inputStyle} />
                </div>
                <div>
                  <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "6px" }}>DATE</p>
                  <input type="date" value={newAdvDate} onChange={e => setNewAdvDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "6px" }}>REASON</p>
                <input value={newAdvReason} onChange={e => setNewAdvReason(e.target.value)}
                  placeholder="e.g. Medical emergency" style={inputStyle} />
              </div>
              <button onClick={addAdvance} disabled={addingAdv} className="btn-gold">
                {addingAdv ? "Saving…" : "Log Advance"}
              </button>
            </div>
          )}

          {advances.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "16px", fontStyle: "italic" }}>No advances recorded.</p>
          ) : (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", overflow: "hidden" }}>
              <table className="table-luxury">
                <thead>
                  <tr><th>Date</th><th>Amount</th><th>Reason</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {advances.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{new Date(a.date).toLocaleDateString("en-IN")}</td>
                      <td style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", color: a.status === "PENDING" ? "#E05C7A" : "var(--text-muted)" }}>
                        ₹{fmt(a.amount)}
                      </td>
                      <td style={{ fontFamily: "'Cormorant', serif", fontSize: "14px", fontStyle: "italic" }}>{a.reason || "—"}</td>
                      <td>
                        <span style={{
                          padding: "2px 10px", fontSize: "9px", letterSpacing: "0.1em",
                          border: `1px solid ${a.status === "PENDING" ? "#E05C7A" : "#5CB87A"}`,
                          color: a.status === "PENDING" ? "#E05C7A" : "#5CB87A",
                        }}>{a.status}</span>
                      </td>
                      <td>
                        {a.status === "PENDING" && (
                          <button onClick={() => toggleAdvance(a.id, "REPAID")} style={{
                            background: "transparent", border: "1px solid #5CB87A",
                            color: "#5CB87A", padding: "4px 10px", fontSize: "9px",
                            cursor: "pointer", letterSpacing: "0.08em",
                          }}>Mark Repaid</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}