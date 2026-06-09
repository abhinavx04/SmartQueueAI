/**
 * Smart Queue AI — TypeScript type definitions.
 *
 * All interfaces match the FastAPI Pydantic models exactly.
 *
 * Schema changes (Audit Remediation):
 *   - hour: now a float (e.g., 8.0, 8.5) for 30-minute granularity (GT-01)
 *   - day_type: 0=Weekday, 1=Saturday, 2=Sunday (replaces binary is_weekend) (GT-07)
 *   - rush_hour: REMOVED — now computed server-side from hour (GT-06)
 */

// ── Prediction ───────────────────────────────────────────────────────

export interface PredictionRequest {
  /** Hour of the day as float, e.g., 8.0 or 8.5 (GT-01: 30-min granularity) */
  hour: number;
  /** Day type: 0=Weekday, 1=Saturday, 2=Sunday (GT-07: replaces is_weekend) */
  day_type: number;
  line: string;
  station: string;
  direction: string;
}

export interface PredictionResponse {
  predicted_congestion: number;
  estimated_wait_time: number;
}

// ── Recommendation ───────────────────────────────────────────────────

export interface RecommendationRequest {
  /** Hour of the day as float, e.g., 8.0 or 8.5 (GT-01: 30-min granularity) */
  hour: number;
  /** Day type: 0=Weekday, 1=Saturday, 2=Sunday (GT-07: replaces is_weekend) */
  day_type: number;
  line: string;
  direction: string;
  current_station?: string;
}

export interface StationCongestion {
  station: string;
  predicted_congestion: number;
}

export interface RecommendationResponse {
  recommendations: StationCongestion[];
}

// ── Health ───────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
}

// ── UI Helpers ───────────────────────────────────────────────────────

export type CongestionLevel = "low" | "moderate" | "high" | "critical";

export function getCongestionLevel(score: number): CongestionLevel {
  if (score < 30) return "low";
  if (score < 60) return "moderate";
  if (score < 80) return "high";
  return "critical";
}

export function getCongestionColor(level: CongestionLevel): string {
  switch (level) {
    case "low":
      return "text-emerald-600";
    case "moderate":
      return "text-amber-500";
    case "high":
      return "text-orange-500";
    case "critical":
      return "text-red-600";
  }
}

export function getCongestionBg(level: CongestionLevel): string {
  switch (level) {
    case "low":
      return "bg-emerald-50 border-emerald-200";
    case "moderate":
      return "bg-amber-50 border-amber-200";
    case "high":
      return "bg-orange-50 border-orange-200";
    case "critical":
      return "bg-red-50 border-red-200";
  }
}

// ── Constants ────────────────────────────────────────────────────────

export const SUBWAY_LINES = [
  "1호선", "2호선", "3호선", "4호선", "5호선",
  "6호선", "7호선", "8호선", "9호선",
];

export const DIRECTIONS = ["상선", "하선"];

export const STATIONS = [
  "서울역", "강남", "종로3가", "동대문", "잠실",
  "신도림", "시청", "건대입구", "홍대입구", "신촌",
  "여의도", "광화문", "사당", "왕십리", "고속터미널"
];

/**
 * Day type options for the form selector.
 * Maps to the backend's DayType encoding (GT-07).
 */
export const DAY_TYPE_OPTIONS = [
  { value: 0, label: "Weekday (평일)" },
  { value: 1, label: "Saturday (토요일)" },
  { value: 2, label: "Sunday (일요일)" },
];

/**
 * Half-hour time slot options for the hour selector.
 * Supports 30-minute granularity as required by GT-01.
 * Range: 5:00 AM to 00:30 AM (matching dataset).
 */
export function getHourOptions(): Array<{ value: number; label: string }> {
  const options: Array<{ value: number; label: string }> = [];
  for (let h = 5; h < 24; h++) {
    const isRush = (h >= 7 && h <= 9) || (h >= 17 && h <= 19);
    const rushTag = isRush ? " ⚡" : "";
    options.push({ value: h, label: `${String(h).padStart(2, "0")}:00${rushTag}` });
    options.push({ value: h + 0.5, label: `${String(h).padStart(2, "0")}:30${rushTag}` });
  }
  // Midnight slots
  options.push({ value: 0, label: "00:00" });
  options.push({ value: 0.5, label: "00:30" });
  return options;
}

// ── Analytics ────────────────────────────────────────────────────────

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface FeatureImportanceResponse {
  items: FeatureImportanceItem[];
}

export interface DistributionItem {
  level: string;
  count: number;
}

export interface DistributionResponse {
  items: DistributionItem[];
}

export interface HistoryItem {
  id: number;
  station_name: string;
  subway_line: string;
  predicted_congestion: number;
  prediction_time: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
}

export interface TrendItem {
  /** Hour as float (e.g. 8.0, 8.5) — matches 30-min granularity from GT-01 */
  hour: number;
  avg_wait_time: number;
}

export interface TrendResponse {
  items: TrendItem[];
}
