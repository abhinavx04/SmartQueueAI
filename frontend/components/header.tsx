"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full glass-panel rounded-3xl py-4 px-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 relative z-50">
      {/* Left section: Title */}
      <div>
        <h1 className="text-xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
          {pathname === "/analytics" ? "System Analytics" : "Dashboard"}
        </h1>
      </div>

      {/* Middle section: Navigation Tabs */}
      <div className="flex items-center gap-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-1">
        <Link
          href="/"
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
            pathname === "/"
              ? "bg-[#4d6fff]/10 text-white border border-[#4d6fff]/20 shadow-[0_0_15px_rgba(77,111,255,0.15)]"
              : "text-white/55 hover:text-white hover:bg-white/[0.03]"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/analytics"
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
            pathname === "/analytics"
              ? "bg-[#8b5cf6]/10 text-white border border-[#8b5cf6]/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
              : "text-white/55 hover:text-white hover:bg-white/[0.03]"
          }`}
        >
          System Analytics
        </Link>
      </div>

      {/* Right section: System Widgets (Live, Clock, AI Widget) */}
      <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
        {/* Live Status indicator */}
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.05] px-3.5 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
          </span>
          <span className="text-[11px] font-bold tracking-wider text-[#22c55e] uppercase">
            Live
          </span>
        </div>

        {/* Digital Clock */}
        <div className="text-right tabular-nums min-w-[90px] rounded-xl bg-white/[0.02] border border-white/[0.05] px-3.5 py-1.5">
          <span className="text-xs font-black tracking-widest text-white/80">
            {time || "00:00:00 AM"}
          </span>
        </div>

        {/* Neural Network Widget */}
        <div className="relative group">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] opacity-35 blur-sm pulse-ring-slow" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.1] text-white">
            <svg
              className="w-6 h-6 text-[#00d4ff]"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-white/20" />
              {/* Nodes */}
              <circle cx="30" cy="50" r="4" fill="#8b5cf6" />
              <circle cx="50" cy="30" r="4" fill="#00d4ff" />
              <circle cx="50" cy="70" r="4" fill="#ff4fd8" />
              <circle cx="70" cy="50" r="4" fill="#4d6fff" />
              {/* Connections */}
              <line x1="30" y1="50" x2="50" y2="30" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6" />
              <line x1="30" y1="50" x2="50" y2="70" stroke="#ff4fd8" strokeWidth="1.5" opacity="0.6" />
              <line x1="50" y1="30" x2="70" y2="50" stroke="#00d4ff" strokeWidth="1.5" opacity="0.6" />
              <line x1="50" y1="70" x2="70" y2="50" stroke="#4d6fff" strokeWidth="1.5" opacity="0.6" />
              <line x1="30" y1="50" x2="70" y2="50" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="2 2" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
