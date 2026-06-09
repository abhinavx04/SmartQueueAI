/**
 * Smart Queue AI — Backend API client.
 *
 * All functions call the FastAPI backend and return typed responses.
 * No fake data, no mocks — every call hits the real model.
 */

import type {
  PredictionRequest,
  PredictionResponse,
  RecommendationRequest,
  RecommendationResponse,
  HealthResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Generic fetch wrapper ────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// ── Health ───────────────────────────────────────────────────────────

export async function checkHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

// ── Prediction ───────────────────────────────────────────────────────

export async function predictCongestion(
  data: PredictionRequest
): Promise<PredictionResponse> {
  return apiFetch<PredictionResponse>("/predict", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Recommendation ───────────────────────────────────────────────────

export async function getRecommendations(
  data: RecommendationRequest
): Promise<RecommendationResponse> {
  return apiFetch<RecommendationResponse>("/recommend", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
