"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function BarcodeScanner() {
  const router = useRouter();
  const buffer = useRef("");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ignore if user is typing in an input field
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Enter") {
        const scanned = buffer.current.trim();
        buffer.current = "";
        if (timeout.current) clearTimeout(timeout.current);

     

        if (scanned.match(/^NJ-\d{6}$/)) {
          router.push(`/products/barcode/${scanned}`);
        }
        return;
      }

      // only collect printable characters
      if (e.key.length === 1) {
        buffer.current += e.key;
      }

      // clear buffer after 2 seconds of no input
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        buffer.current = "";
      }, 2000);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}