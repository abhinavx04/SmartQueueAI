/**
 * Smart Queue AI — TypeScript type definitions.
 *
 * All interfaces match the FastAPI Pydantic models exactly.
 */

// ── Prediction ───────────────────────────────────────────────────────

export interface PredictionRequest {
  hour: number;
  is_weekend: number;
  rush_hour: number;
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
  hour: number;
  is_weekend: number;
  rush_hour: number;
  line: string;
  direction: string;
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
  hour: number;
  avg_wait_time: number;
}

export interface TrendResponse {
  items: TrendItem[];
}
