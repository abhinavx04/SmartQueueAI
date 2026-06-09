"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { checkHealth, predictCongestion } from "@/services/api";
import type { PredictionResponse } from "@/types";
import { getCongestionLevel, getCongestionColor } from "@/types";

// Popular stations for quick dashboard overview
const QUICK_STATIONS = [
  { station: "서울역", line: "1호선", direction: "상선" },
  { station: "강남", line: "2호선", direction: "상선" },
  { station: "종로3가", line: "3호선", direction: "상선" },
  { station: "동대문", line: "4호선", direction: "상선" },
];

interface StationStatus {
  station: string;
  line: string;
  result: PredictionResponse | null;
  loading: boolean;
}

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState<"checking" | "healthy" | "offline">("checking");
  const [stations, setStations] = useState<StationStatus[]>(
    QUICK_STATIONS.map((s) => ({ ...s, result: null, loading: true }))
  );

  const now = new Date();
  const currentHour = now.getHours();
  const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
  // GT-07: 3-class day type — 0=Weekday, 1=Saturday, 2=Sunday
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const dayType = dayOfWeek === 0 ? 2 : dayOfWeek === 6 ? 1 : 0;

  useEffect(() => {
    // Check API health
    checkHealth()
      .then(() => setApiStatus("healthy"))
      .catch(() => setApiStatus("offline"));

    // Fetch live predictions for popular stations
    QUICK_STATIONS.forEach((s, i) => {
      predictCongestion({
        hour: currentHour,        // GT-01: float (whole hours still valid)
        day_type: dayType,        // GT-07: 0=Weekday, 1=Saturday, 2=Sunday
        line: s.line,
        station: s.station,
        direction: s.direction,
      })
        .then((result) => {
          setStations((prev) =>
            prev.map((st, idx) => (idx === i ? { ...st, result, loading: false } : st))
          );
        })
        .catch(() => {
          setStations((prev) =>
            prev.map((st, idx) => (idx === i ? { ...st, loading: false } : st))
          );
        });
    });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Real-time overview of Seoul Metro congestion — powered by Random Forest AI
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* API Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Status</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                apiStatus === "healthy"
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                  : apiStatus === "offline"
                  ? "bg-red-500"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <span className="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {apiStatus}
            </span>
          </div>
        </div>

        {/* Current Time */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Hour</p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
            {String(currentHour).padStart(2, "0")}:00
            {isRushHour && (
              <span className="ml-2 inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600 dark:bg-orange-950 dark:text-orange-300">
                Rush Hour
              </span>
            )}
          </p>
        </div>

        {/* Day Type */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Day Type</p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
            {dayType === 2 ? "Sunday" : dayType === 1 ? "Saturday" : "Weekday"}
          </p>
        </div>

        {/* Model */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI Model</p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">Random Forest</p>
          <p className="text-xs text-slate-400">100 estimators</p>
        </div>
      </div>

      {/* Live Station Overview */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Live Station Congestion
          </h2>
          <span className="text-xs text-slate-400">
            Predictions for current hour ({String(currentHour).padStart(2, "0")}:00)
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stations.map((s) => {
            const level = s.result ? getCongestionLevel(s.result.predicted_congestion) : null;
            return (
              <div
                key={s.station}
                className="rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{s.station}</p>
                    <p className="text-xs text-slate-400">{s.line}</p>
                  </div>
                  {s.loading ? (
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  ) : s.result && level ? (
                    <span
                      className={`text-2xl font-bold tabular-nums ${getCongestionColor(level)}`}
                    >
                      {s.result.predicted_congestion.toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">N/A</span>
                  )}
                </div>
                {s.result && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-700 ${
                          level === "low"
                            ? "bg-emerald-500"
                            : level === "moderate"
                            ? "bg-amber-500"
                            : level === "high"
                            ? "bg-orange-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(s.result.predicted_congestion, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      Wait: <span className="font-semibold text-slate-600 dark:text-slate-300">{s.result.estimated_wait_time} min</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/predict"
          className="group rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Predict Congestion</h3>
          <p className="mt-1 text-sm text-slate-500">
            Get AI-powered congestion predictions for any station, line, and time.
          </p>
        </Link>

        <Link
          href="/recommend"
          className="group rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m16 10-4 4-4-4" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Find Best Stations</h3>
          <p className="mt-1 text-sm text-slate-500">
            Discover the 10 least congested stations and escape the queue.
          </p>
        </Link>
      </div>
    </div>
  );
}
