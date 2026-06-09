"use client";

import { useState, useEffect, useRef } from "react";
import { SUBWAY_LINES, DIRECTIONS, STATIONS } from "@/types";

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

// Map subway lines to their official Seoul Metro hex colors
const LINE_COLORS: Record<string, { bg: string; text: string; name: string }> = {
  "1호선": { bg: "bg-[#002766] border-[#002766]", text: "text-white", name: "Line 1" },
  "2호선": { bg: "bg-[#3b5e2f] border-[#3b5e2f]", text: "text-white", name: "Line 2" },
  "3호선": { bg: "bg-[#ef7c1c] border-[#ef7c1c]", text: "text-white", name: "Line 3" },
  "4호선": { bg: "bg-[#00a3e0] border-[#00a3e0]", text: "text-white", name: "Line 4" },
  "5호선": { bg: "bg-[#8b3d88] border-[#8b3d88]", text: "text-white", name: "Line 5" },
  "6호선": { bg: "bg-[#cd7c2f] border-[#cd7c2f]", text: "text-white", name: "Line 6" },
  "7호선": { bg: "bg-[#697216] border-[#697216]", text: "text-white", name: "Line 7" },
  "8호선": { bg: "bg-[#e31f52] border-[#e31f52]", text: "text-white", name: "Line 8" },
  "9호선": { bg: "bg-[#b89914] border-[#b89914]", text: "text-white", name: "Line 9" },
};

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

  // Autocomplete state for Station Selection
  const [stationSearch, setStationSearch] = useState("서울역");
  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const stationRef = useRef<HTMLDivElement>(null);

  // Sync rush hour when hour changes
  useEffect(() => {
    const isRush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1 : 0;
    setRushHour(isRush);
  }, [hour]);

  // Click outside to close station autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stationRef.current && !stationRef.current.contains(event.target as Node)) {
        setShowStationDropdown(false);
        // Revert search to selected station if it's invalid
        if (!STATIONS.includes(stationSearch)) {
          setStationSearch(station);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [stationSearch, station]);

  const filteredStations = STATIONS.filter((s) =>
    s.toLowerCase().includes(stationSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      hour,
      is_weekend: isWeekend,
      rush_hour: rushHour,
      line,
      station,
      direction,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        {/* Subway Line Grid Selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold tracking-wide text-slate-300">
            Subway Line
          </label>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 md:grid-cols-9">
            {SUBWAY_LINES.map((l) => {
              const info = LINE_COLORS[l] || { bg: "bg-slate-700", text: "text-white", name: l };
              const isSelected = line === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLine(l)}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 py-2 px-1 text-center transition-all duration-200 ${
                    isSelected
                      ? `${info.bg} ${info.text} scale-105 shadow-md ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-950`
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="text-xs font-bold">{info.name}</span>
                  <span className="text-[10px] opacity-75">{l}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 Column Grid for Controls */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Station Selection (Autocomplete) */}
          {includeStation && (
            <div className="space-y-2" ref={stationRef}>
              <label htmlFor="station" className="text-sm font-semibold tracking-wide text-slate-300">
                Subway Station
              </label>
              <div className="relative">
                <div className="flex h-11 w-full items-center rounded-xl border border-slate-800 bg-slate-900/50 px-3 shadow-inner transition-all focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-500 mr-2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    id="station"
                    type="text"
                    placeholder="Search metro station..."
                    value={stationSearch}
                    onFocus={() => setShowStationDropdown(true)}
                    onChange={(e) => {
                      setStationSearch(e.target.value);
                      setShowStationDropdown(true);
                    }}
                    className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                  />
                </div>
                {showStationDropdown && (
                  <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl">
                    {filteredStations.length > 0 ? (
                      filteredStations.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setStation(s);
                            setStationSearch(s);
                            setShowStationDropdown(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all ${
                            station === s
                              ? "bg-teal-500/10 font-bold text-teal-400"
                              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                          }`}
                        >
                          <span>{s}</span>
                          {station === s && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2.5 text-xs text-slate-500">No stations match search</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Direction Segmented Control */}
          <div className="space-y-2">
            <label className="text-sm font-semibold tracking-wide text-slate-300">
              Direction
            </label>
            <div className="flex h-11 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
              {DIRECTIONS.map((d) => {
                const isActive = direction === d;
                const labelStr = d === "상선" ? "Upward (상선)" : "Downward (하선)";
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`flex flex-1 items-center justify-center rounded-lg text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {labelStr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Type Segmented Control */}
          <div className="space-y-2">
            <label className="text-sm font-semibold tracking-wide text-slate-300">
              Day Type
            </label>
            <div className="flex h-11 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
              <button
                type="button"
                onClick={() => setIsWeekend(0)}
                className={`flex flex-1 items-center justify-center rounded-lg text-xs font-bold transition-all duration-200 ${
                  isWeekend === 0
                    ? "bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Weekday (평일)
              </button>
              <button
                type="button"
                onClick={() => setIsWeekend(1)}
                className={`flex flex-1 items-center justify-center rounded-lg text-xs font-bold transition-all duration-200 ${
                  isWeekend === 1
                    ? "bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Weekend/Holiday (주말)
              </button>
            </div>
          </div>

          {/* Hour & Rush Hour Combination */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="hour-range" className="text-sm font-semibold tracking-wide text-slate-300">
                Departure Hour
              </label>
              <span className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-400 tabular-nums">
                  {String(hour).padStart(2, "0")}:00
                </span>
                {rushHour === 1 ? (
                  <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-400 border border-orange-500/20 uppercase animate-pulse">
                    🔥 Rush Hour
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 uppercase">
                    🟢 Off-Peak
                  </span>
                )}
              </span>
            </div>
            <div className="flex h-11 items-center rounded-xl border border-slate-800 bg-slate-900/50 px-4">
              <input
                id="hour-range"
                type="range"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-teal-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Action */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-110 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Consulting AI Engine...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 3-1.912 5.886L4.202 9l5.886 1.912L12 21l1.912-5.886L19.798 15l-5.886-1.912z" />
              </svg>
              <span>{includeStation ? "Predict Metro Congestion" : "Recommend Low-Congestion Stations"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
