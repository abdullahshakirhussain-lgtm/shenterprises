"use client";
import { useEffect, useState } from "react";

// Shop hours: Mon–Sat 09:00–18:00, Sri Lanka time (UTC+5:30, no DST).
function isOpen(now: Date) {
  const lk = new Date(now.getTime() + 5.5 * 3600_000);
  const day = lk.getUTCDay(); // 0 = Sunday
  const mins = lk.getUTCHours() * 60 + lk.getUTCMinutes();
  return day !== 0 && mins >= 9 * 60 && mins < 18 * 60;
}

/** Live "Open now / Closed now" line — never claims to be open outside shop hours. */
export default function OpenStatus({ openText, closedText, className = "" }: { openText: string; closedText: string; className?: string }) {
  const [open, setOpen] = useState(() => isOpen(new Date()));
  useEffect(() => {
    const tick = () => setOpen(isOpen(new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={className} suppressHydrationWarning>
      <span className={`w-2 h-2 rounded-full shrink-0 ${open ? "bg-[#1F9D55] animate-pulse" : "bg-[#B8AFA3]"}`} suppressHydrationWarning />
      <span suppressHydrationWarning>{open ? openText : closedText}</span>
    </span>
  );
}
