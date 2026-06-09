"use client";

import { useState, useEffect } from "react";
import { SUBWAY_LINES, DIRECTIONS, DAY_TYPE_OPTIONS, getHourOptions } from "@/types";
import { getStations, type StationItem } from "@/services/api";

/**
 * PredictionForm — audit-remediated version.
 *
 * Schema changes vs. original:
 *   - hour: float with 30-min granularity (GT-01: was integer)
 *   - day_type: 0=Weekday, 1=Saturday, 2=Sunday (GT-07: was binary is_weekend)
 *   - rush_hour field: REMOVED — computed server-side (GT-06)
 */

interface PredictionFormProps {
  /** Whether to include the station field (prediction needs it, recommendation does not) */
  includeStation?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Submit handler */
  onSubmit: (data: {
    hour: number;
    day_type: number;
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
  const [hour, setHour] = useState<number>(8.0);
  const [dayType, setDayType] = useState<number>(0);
  const [line, setLine] = useState("1호선");
  const [station, setStation] = useState("서울역");
  const [direction, setDirection] = useState("상선");
  const [allStations, setAllStations] = useState<StationItem[]>([]);

  useEffect(() => {
    getStations()
      .then((data) => {
        setAllStations(data);
        // Set initial station correctly for 1호선
        const initialOn1 = data.filter((s) => s.line === "1호선");
        if (initialOn1.length > 0) {
          setStation(initialOn1[0].station);
        }
      })
      .catch((err) => {
        console.error("Failed to load stations dynamically:", err);
      });
  }, []);

  // Filter stations based on selected line, with fallback if not loaded/loading
  const filteredStations = allStations.length > 0
    ? allStations.filter((s) => s.line === line).map((s) => s.station)
    : [
        "서울역", "강남", "종로3가", "동대문", "잠실",
        "신도림", "시청", "건대입구", "홍대입구", "신촌",
        "여의도", "광화문", "사당", "왕십리", "고속터미널"
      ];

  const handleLineChange = (newLine: string) => {
    setLine(newLine);
    const stationsOnNewLine = allStations.filter((s) => s.line === newLine);
    if (stationsOnNewLine.length > 0) {
      setStation(stationsOnNewLine[0].station);
    } else {
      if (newLine === "1호선") setStation("서울역");
      else if (newLine === "2호선") setStation("강남");
      else if (newLine === "3호선") setStation("종로3가");
    }
  };

  const hourOptions = getHourOptions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ hour, day_type: dayType, line, station, direction });
  };

  // Compute whether selected hour is rush hour for display hint only
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Hour — 30-minute granularity (GT-01) */}
        <div className="space-y-1.5">
          <label htmlFor="hour" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Time
            {isRush && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                ⚡ Rush Hour
              </span>
            )}
          </label>
          <select
            id="hour"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {hourOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Subway Line */}
        <div className="space-y-1.5">
          <label htmlFor="line" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Subway Line
          </label>
          <select
            id="line"
            value={line}
            onChange={(e) => handleLineChange(e.target.value)}
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
            <select
              id="station"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {filteredStations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Day Type — 3-class encoding (GT-07: replaces binary is_weekend) */}
        <div className="space-y-1.5">
          <label htmlFor="dayType" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Day Type
          </label>
          <select
            id="dayType"
            value={dayType}
            onChange={(e) => setDayType(Number(e.target.value))}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {DAY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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
