"use client";

import { useState } from "react";
import { SUBWAY_LINES, DIRECTIONS } from "@/types";

interface PredictionFormProps {
  /** Whether to include the station field (prediction needs it, recommendation does not) */
  includeStation?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Submit handler */
  onSubmit: (data: {
    hour: number;
    is_weekend: number;
    rush_hour: number;
    line: string;
    station: string;
    direction: string;
  }) => void;
}

export default function PredictionForm({
  includeStation = true,
  loading = false,
  onSubmit,
}: PredictionFormProps) {
  const [hour, setHour] = useState(8);
  const [isWeekend, setIsWeekend] = useState(0);
  const [rushHour, setRushHour] = useState(1);
  const [line, setLine] = useState("1호선");
  const [station, setStation] = useState("서울역");
  const [direction, setDirection] = useState("상선");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ hour, is_weekend: isWeekend, rush_hour: rushHour, line, station, direction });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Hour */}
        <div className="space-y-1.5">
          <label htmlFor="hour" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Hour
          </label>
          <select
            id="hour"
            value={hour}
            onChange={(e) => {
              const h = Number(e.target.value);
              setHour(h);
              setRushHour((h >= 7 && h <= 9) || (h >= 17 && h <= 19) ? 1 : 0);
            }}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {String(i).padStart(2, "0")}:00
                {(i >= 7 && i <= 9) || (i >= 17 && i <= 19) ? " (Rush)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Line */}
        <div className="space-y-1.5">
          <label htmlFor="line" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Subway Line
          </label>
          <select
            id="line"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {SUBWAY_LINES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Direction */}
        <div className="space-y-1.5">
          <label htmlFor="direction" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Direction
          </label>
          <select
            id="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {d} ({d === "상선" ? "Upward" : "Downward"})
              </option>
            ))}
          </select>
        </div>

        {/* Station (only for prediction) */}
        {includeStation && (
          <div className="space-y-1.5">
            <label htmlFor="station" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Station
            </label>
            <input
              id="station"
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="e.g. 서울역"
              required
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        )}

        {/* Day Type */}
        <div className="space-y-1.5">
          <label htmlFor="dayType" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Day Type
          </label>
          <select
            id="dayType"
            value={isWeekend}
            onChange={(e) => setIsWeekend(Number(e.target.value))}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value={0}>Weekday</option>
            <option value={1}>Weekend / Holiday</option>
          </select>
        </div>

        {/* Rush Hour (auto-set but editable) */}
        <div className="space-y-1.5">
          <label htmlFor="rushHour" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Rush Hour
          </label>
          <select
            id="rushHour"
            value={rushHour}
            onChange={(e) => setRushHour(Number(e.target.value))}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value={1}>Yes (7-9 AM, 5-7 PM)</option>
            <option value={0}>No</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 px-6 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
            </svg>
            {includeStation ? "Predict Congestion" : "Find Best Stations"}
          </>
        )}
      </button>
    </form>
  );
}
