"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function BarcodeLookupPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    fetch(`http://localhost:8000/products/barcode/${code}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          router.replace(`/products/${data.id}`);
        } else {
          router.replace("/products");
        }
      })
      .catch(() => router.replace("/products"));
  }, [code, router]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      flexDirection: "column",
      gap: "16px",
    }}>
      <p style={{ color: "var(--gold)", fontSize: "24px" }}>✦</p>
      <p style={{
        fontFamily: "'Cormorant', serif",
        fontSize: "20px",
        fontStyle: "italic",
        color: "var(--text-muted)",
      }}>Looking up {code}...</p>
    </div>
  );
}