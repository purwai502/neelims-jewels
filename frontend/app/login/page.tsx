"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (!res.ok) {
        setError("Invalid username or password");
        setLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name);

      router.push("/dashboard");
    } catch {
      setError("Could not connect to server");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
    }}>
      {/* Decorative background */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.06) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(61,26,71,0.08) 0%, transparent 50%)
        `,
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p className="label-caps" style={{ marginBottom: "16px" }}>
            ✦ &nbsp; Neelima Jewels &nbsp; ✦
          </p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "42px",
            fontWeight: 400,
            fontStyle: "italic",
            color: "var(--text-primary)",
            lineHeight: 1.1,
            marginBottom: "8px",
          }}>
            Welcome
          </h1>
          <p style={{
            fontFamily: "'Cormorant', serif",
            fontSize: "16px",
            fontStyle: "italic",
            color: "var(--text-muted)",
          }}>Sign in to your studio</p>

          {/* Ornate divider */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "24px",
          }}>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, var(--border-gold))" }} />
            <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, var(--border-gold))" }} />
          </div>
        </div>

        {/* Form */}
        <div className="card-ornate">
          <div style={{ marginBottom: "20px" }}>
            <p className="label-caps" style={{ marginBottom: "10px" }}>Username</p>
            <input
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="input-luxury"
            />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <p className="label-caps" style={{ marginBottom: "10px" }}>Password</p>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="input-luxury"
            />
          </div>

          {error && (
            <p style={{
              color: "#E05C7A",
              fontSize: "12px",
              letterSpacing: "0.05em",
              marginBottom: "20px",
              textAlign: "center",
            }}>{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !username || !password}
            className="btn-gold"
            style={{
              width: "100%",
              opacity: (!username || !password) ? 0.5 : 1,
            }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

      </div>
    </div>
  );
}
