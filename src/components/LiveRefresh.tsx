"use client";
// Keeps server-rendered pages live: polls a fingerprint of the intray and refreshes when
// anything changes (new email processed, payment matched, signature received...).
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function LiveRefresh({ intervalMs = 3000, label = true }: { intervalMs?: number; label?: boolean }) {
  const router = useRouter();
  const last = useRef<string | null>(null);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/live", { cache: "no-store" });
        const { v } = await r.json();
        setOk(true);
        if (last.current && v !== last.current) router.refresh();
        last.current = v;
      } catch { setOk(false); }
      if (alive) setTimeout(tick, intervalMs);
    };
    tick();
    return () => { alive = false; };
  }, [router, intervalMs]);
  // Pages update silently; only a lost connection is worth showing.
  if (!label || ok) return null;
  return <span className="live" role="status">Reconnecting…</span>;
}
