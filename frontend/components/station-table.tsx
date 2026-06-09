"use client";

import { getCongestionLevel, getCongestionColor } from "@/types";
import type { StationCongestion } from "@/types";

interface StationTableProps {
  stations: StationCongestion[];
}

export default function StationTable({ stations }: StationTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rank
            </th>
            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Station
            </th>
            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Congestion
            </th>
            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Level
            </th>
            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Est. Wait
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {stations.map((s, i) => {
            const level = getCongestionLevel(s.predicted_congestion);
            const waitMin = (s.predicted_congestion / 5).toFixed(1);
            return (
              <tr
                key={s.station}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i < 3
                        ? "bg-gradient-to-br from-blue-600 to-teal-500 text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                  {s.station}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-20 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          level === "low"
                            ? "bg-emerald-500"
                            : level === "moderate"
                            ? "bg-amber-500"
                            : level === "high"
                            ? "bg-orange-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(s.predicted_congestion, 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${getCongestionColor(level)}`}>
                      {s.predicted_congestion.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      level === "low"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : level === "moderate"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : level === "high"
                        ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {level}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm tabular-nums text-slate-600 dark:text-slate-400">
                  {waitMin} min
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
