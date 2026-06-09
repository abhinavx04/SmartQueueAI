"use client";

import { getCongestionLevel, getCongestionColor, getCongestionBg } from "@/types";

interface CongestionCardProps {
  congestion: number;
  waitTime: number;
}

export default function CongestionCard({ congestion, waitTime }: CongestionCardProps) {
  const level = getCongestionLevel(congestion);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Congestion Score */}
      <div className={`rounded-xl border p-6 transition-all duration-300 ${getCongestionBg(level)}`}>
        <p className="text-sm font-medium text-slate-500 mb-1">Predicted Congestion</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold tabular-nums ${getCongestionColor(level)}`}>
            {congestion.toFixed(1)}
          </span>
          <span className="text-sm text-slate-400">/ 100</span>
        </div>
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-slate-200/50">
            <div
              className={`h-2 rounded-full transition-all duration-700 ease-out ${
                level === "low"
                  ? "bg-emerald-500"
                  : level === "moderate"
                  ? "bg-amber-500"
                  : level === "high"
                  ? "bg-orange-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(congestion, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider">
            <span className={getCongestionColor(level)}>
              {level === "low" && "🟢 Low congestion"}
              {level === "moderate" && "🟡 Moderate congestion"}
              {level === "high" && "🟠 High congestion"}
              {level === "critical" && "🔴 Critical congestion"}
            </span>
          </p>
        </div>
      </div>

      {/* Wait Time */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-500 mb-1">Estimated Wait Time</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-white">
            {waitTime.toFixed(1)}
          </span>
          <span className="text-lg text-slate-400">min</span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Based on service rate of 5 people/min</span>
        </div>
      </div>
    </div>
  );
}
