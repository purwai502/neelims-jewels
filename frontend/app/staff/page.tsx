"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface StaffMember {
  id: string;
  full_name: string;
  staff_type: string;
  monthly_salary: number;
  day_rate: number | null;
  phone: string | null;
  today_attendance: string | null;
  is_active: boolean;
}

interface AttendanceRecord {
  staff_id: string;
  full_name: string;
  staff_type: string;
  attendance: { status: string; notes: string | null } | null;
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
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function StaffPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const dateParam    = searchParams.get("date");

  const today     = new Date();
  const todayStr  = today.toISOString().slice(0, 10);

  const [staff,           setStaff]           = useState<StaffMember[]>([]);
  const [monthlyData,     setMonthlyData]      = useState<{ attendance: Record<string, Record<string, string>>; staff: any[] }>({ attendance: {}, staff: [] });
  const [viewMonth,       setViewMonth]        = useState(today.getMonth() + 1);
  const [viewYear,        setViewYear]         = useState(today.getFullYear());
  const [loading,         setLoading]          = useState(true);
  const [dailySheet,      setDailySheet]       = useState<AttendanceRecord[]>([]);
  const [selectedDate,    setSelectedDate]     = useState<string | null>(dateParam);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [pendingAtt,      setPendingAtt]       = useState<Record<string, string>>({});

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const h     = { "Authorization": `Bearer ${token}` };

  const fetchStaff = useCallback(async () => {
    const res = await fetch("http://localhost:8000/staff/", { headers: h });
    if (res.ok) setStaff(await res.json());
  }, []);

  const fetchMonthly = useCallback(async (month: number, year: number) => {
    const res = await fetch(`http://localhost:8000/staff/attendance/monthly?month=${month}&year=${year}`, { headers: h });
    if (res.ok) setMonthlyData(await res.json());
  }, []);

  const fetchDaily = useCallback(async (date: string) => {
    const res = await fetch(`http://localhost:8000/staff/attendance/daily?date=${date}`, { headers: h });
    if (res.ok) {
      const data = await res.json();
      setDailySheet(data);
      // pre-populate pending from existing
      const existing: Record<string, string> = {};
      data.forEach((r: AttendanceRecord) => {
        if (r.attendance) existing[r.staff_id] = r.attendance.status;
      });
      setPendingAtt(existing);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!t) { router.push("/login"); return; }
    if (role === "EMPLOYEE") { router.push("/dashboard"); return; }
    Promise.all([fetchStaff(), fetchMonthly(viewMonth, viewYear)]).then(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMonthly(viewMonth, viewYear); }, [viewMonth, viewYear]);

  useEffect(() => {
    if (selectedDate) fetchDaily(selectedDate);
  }, [selectedDate]);

  const openDate = (dateStr: string) => {
    if (dateStr > todayStr) return; // no future dates
    setSelectedDate(dateStr);
  };

  const toggleAtt = (staffId: string, status: string) => {
    setPendingAtt(prev => ({ ...prev, [staffId]: status }));
  };

  const saveAttendance = async () => {
    if (!selectedDate) return;
    setSavingAttendance(true);
    const records = Object.entries(pendingAtt).map(([staff_id, status]) => ({ staff_id, status }));
    await fetch("http://localhost:8000/staff/attendance/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...h },
      body: JSON.stringify({ date: selectedDate, records }),
    });
    setSavingAttendance(false);
    setSelectedDate(null);
    fetchStaff();
    fetchMonthly(viewMonth, viewYear);
  };

  // calendar helpers
  const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month - 1, 1).getDay();

  const getCellColor = (dateStr: string) => {
    const dayRecords = monthlyData.staff.map(s => monthlyData.attendance[s.id]?.[dateStr]).filter(Boolean);
    if (dayRecords.length === 0) return null;
    const hasAbsent   = dayRecords.includes("ABSENT");
    const hasHalfDay  = dayRecords.includes("HALF_DAY");
    const allPresent  = dayRecords.every(s => s === "PRESENT");
    if (allPresent)  return "#5CB87A";
    if (hasAbsent)   return "#E05C7A";
    if (hasHalfDay)  return "#E8A45A";
    return "#C9A84C";
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth  = getDaysInMonth(viewMonth, viewYear);
  const firstDay     = getFirstDayOfMonth(viewMonth, viewYear);
  const allMarkedToday = staff.length > 0 && staff.every(s => s.today_attendance);

  if (loading) return (
    <p style={{ color: "var(--text-muted)", fontFamily: "'Cormorant', serif", fontSize: "18px", fontStyle: "italic" }}>Loading...</p>
  );

  return (
    <div style={{ maxWidth: "1000px" }}>

      {/* Daily Attendance Modal */}
      {selectedDate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="card-ornate" style={{ width: "540px", maxHeight: "80vh", overflow: "auto", background: "var(--bg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <p className="label-caps" style={{ fontSize: "8px", marginBottom: "4px" }}>Attendance</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "var(--text-primary)" }}>
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)} style={{
                background: "transparent", border: "none", color: "var(--text-muted)",
                fontSize: "20px", cursor: "pointer",
              }}>✕</button>
            </div>

            {dailySheet.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontFamily: "'Cormorant', serif" }}>No staff found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                {dailySheet.map(record => (
                  <div key={record.staff_id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)",
                  }}>
                    <div>
                      <p style={{ fontSize: "14px", color: "var(--text-primary)", fontFamily: "'Playfair Display', serif" }}>
                        {record.full_name}
                      </p>
                      <span style={{
                        fontSize: "8px", letterSpacing: "0.1em", padding: "2px 6px",
                        border: `1px solid ${STAFF_COLORS[record.staff_type] || "var(--border)"}`,
                        color: STAFF_COLORS[record.staff_type] || "var(--text-muted)",
                      }}>{record.staff_type}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {["PRESENT", "HALF_DAY", "ABSENT"].map(status => (
                        <button key={status} onClick={() => toggleAtt(record.staff_id, status)} style={{
                          width: "36px", height: "36px",
                          border: `1px solid ${pendingAtt[record.staff_id] === status ? ATT_COLORS[status] : "var(--border)"}`,
                          background: pendingAtt[record.staff_id] === status ? `${ATT_COLORS[status]}20` : "transparent",
                          color: pendingAtt[record.staff_id] === status ? ATT_COLORS[status] : "var(--text-muted)",
                          fontFamily: "'Didact Gothic', sans-serif", fontSize: "11px", fontWeight: 600,
                          cursor: "pointer",
                        }}>{ATT_LABELS[status]}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={saveAttendance} disabled={savingAttendance} className="btn-gold">
                {savingAttendance ? "Saving…" : "Save Attendance"}
              </button>
              <button onClick={() => setSelectedDate(null)} className="btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="label-caps" style={{ marginBottom: "8px" }}>✦ &nbsp; Staff</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", fontWeight: 400, color: "var(--text-primary)" }}>
            Staff Management
          </h1>
        </div>
        <Link href="/staff/new">
          <button className="btn-gold">+ Add Staff</button>
        </Link>
      </div>

      {/* Today's attendance status */}
      <div style={{
        marginBottom: "32px", padding: "14px 20px",
        background: allMarkedToday ? "rgba(92,184,122,0.08)" : "rgba(232,164,90,0.08)",
        border: `1px solid ${allMarkedToday ? "rgba(92,184,122,0.3)" : "rgba(232,164,90,0.3)"}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <p style={{ fontFamily: "'Cormorant', serif", fontSize: "15px", fontStyle: "italic", color: allMarkedToday ? "#5CB87A" : "#E8A45A" }}>
          {allMarkedToday ? "✓ Today's attendance fully recorded" : "⚠ Today's attendance not fully marked"}
        </p>
        <button onClick={() => openDate(todayStr)} className="btn-outline" style={{ fontSize: "11px" }}>
          Mark Today
        </button>
      </div>

      {/* Staff Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "40px" }}>
        {staff.map(s => (
          <Link key={s.id} href={`/staff/${s.id}`} style={{ textDecoration: "none" }}>
            <div className="card-luxury" style={{ padding: "18px", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: `${STAFF_COLORS[s.staff_type] || "var(--gold)"}20`,
                  border: `1px solid ${STAFF_COLORS[s.staff_type] || "var(--gold)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", color: STAFF_COLORS[s.staff_type] || "var(--gold)",
                  fontFamily: "'Playfair Display', serif",
                }}>
                  {s.full_name.charAt(0)}
                </div>
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  background: s.today_attendance ? ATT_COLORS[s.today_attendance] : "var(--border)",
                }} title={s.today_attendance || "Not marked"} />
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", color: "var(--text-primary)", marginBottom: "4px" }}>
                {s.full_name}
              </p>
              <span style={{
                fontSize: "8px", letterSpacing: "0.1em", padding: "2px 8px",
                border: `1px solid ${STAFF_COLORS[s.staff_type]}`,
                color: STAFF_COLORS[s.staff_type],
              }}>{s.staff_type}</span>
              {s.staff_type === "EMPLOYEE" && s.monthly_salary > 0 && (
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                  ₹{fmt(s.monthly_salary)}/mo
                </p>
              )}
              {s.staff_type !== "EMPLOYEE" && s.day_rate && (
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                  ₹{fmt(s.day_rate)}/piece
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, var(--border-gold), transparent)" }} />
        <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
      </div>

      {/* Attendance Calendar */}
      <div>
        {/* Month navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <button onClick={prevMonth} style={{
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--text-muted)", padding: "8px 16px", cursor: "pointer",
            fontFamily: "'Didact Gothic', sans-serif", fontSize: "12px",
          }}>←</button>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "var(--text-primary)" }}>
            {MONTHS[viewMonth - 1]} {viewYear}
          </p>
          <button onClick={nextMonth} disabled={viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear()} style={{
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--text-muted)", padding: "8px 16px", cursor: "pointer",
            fontFamily: "'Didact Gothic', sans-serif", fontSize: "12px",
            opacity: viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear() ? 0.3 : 1,
          }}>→</button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} style={{ textAlign: "center", padding: "6px 0", fontSize: "9px", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'Didact Gothic', sans-serif" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {/* Empty cells for first day offset */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day     = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            return (
              <div
                key={day}
                onClick={() => !isFuture && openDate(dateStr)}
                style={{
                  aspectRatio: "1",
                  border: isToday ? "2px solid var(--gold)" : "1px solid var(--border)",
                  background: "var(--bg-card)",
                  cursor: isFuture ? "default" : "pointer",
                  opacity: isFuture ? 0.35 : 1,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "space-between",
                  padding: "6px 4px 4px",
                  position: "relative",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isFuture) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--gold)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isToday ? "var(--gold)" : "var(--border)"; }}
              >
                <p style={{
                  fontSize: "11px", fontFamily: "'Didact Gothic', sans-serif",
                  color: isToday ? "var(--gold)" : "var(--text-muted)",
                  fontWeight: isToday ? 600 : 400,
                }}>{day}</p>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}