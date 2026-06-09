"use client";

import { useEffect, useState } from "react";
import PredictionForm from "@/components/prediction-form";
import { checkHealth, predictCongestion, getRecommendations } from "@/services/api";
import type { PredictionRequest, PredictionResponse, StationCongestion } from "@/types";
import { getCongestionLevel, getCongestionColor, getCongestionBg } from "@/types";

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

  // Tabs state
  const [activeTab, setActiveTab] = useState<"predict" | "route">("predict");

  // Single Station Prediction State
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictResult, setPredictResult] = useState<PredictionResponse | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  // Recommendation State
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<StationCongestion[] | null>(null);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  const currentHour = new Date().getHours();
  const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
  const isWeekend = [0, 6].includes(new Date().getDay());

  useEffect(() => {
    // Check API health
    checkHealth()
      .then(() => setApiStatus("healthy"))
      .catch(() => setApiStatus("offline"));

    // Fetch live predictions for popular stations
    QUICK_STATIONS.forEach((s, i) => {
      predictCongestion({
        hour: currentHour,
        is_weekend: isWeekend ? 1 : 0,
        rush_hour: isRushHour ? 1 : 0,
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

  const handlePredict = async (data: PredictionRequest) => {
    setPredictLoading(true);
    setPredictError(null);
    setPredictResult(null);

    if (!data.line || !data.station || !data.direction) {
      setPredictError("Please fill out all required fields.");
      setPredictLoading(false);
      return;
    }

    try {
      const response = await predictCongestion(data);
      setPredictResult(response);
    } catch (err: any) {
      setPredictError(err.message || "An error occurred while fetching the prediction.");
    } finally {
      setPredictLoading(false);
    }
  };

  const handleRecommend = async (data: {
    hour: number;
    is_weekend: number;
    rush_hour: number;
    line: string;
    direction: string;
  }) => {
    setRecommendLoading(true);
    setRecommendError(null);
    setRecommendations(null);

    try {
      const response = await getRecommendations(data);
      setRecommendations(response.recommendations);
    } catch (err: any) {
      setRecommendError(err.message || "Failed to fetch alternative recommendations.");
    } finally {
      setRecommendLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Smart Queue AI Dashboard</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          AI-powered subway congestion forecasting and dynamic routing for Seoul Metro
        </p>
      </div>

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* API Status */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">System Status</p>
          <div className="mt-2.5 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                apiStatus === "healthy"
                  ? "bg-emerald-500 shadow-lg shadow-emerald-500/50"
                  : apiStatus === "offline"
                  ? "bg-red-500"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <span className="text-lg font-bold text-white capitalize">{apiStatus}</span>
          </div>
        </div>

        {/* Current Time */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Hour</p>
          <p className="mt-2.5 text-lg font-bold text-white flex items-center gap-2">
            {String(currentHour).padStart(2, "0")}:00
            {isRushHour && (
              <span className="inline-flex items-center rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase">
                Rush Hour
              </span>
            )}
          </p>
        </div>

        {/* Day Type */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Day Type</p>
          <p className="mt-2.5 text-lg font-bold text-white">
            {isWeekend ? "Weekend / Holiday" : "Weekday"}
          </p>
        </div>

        {/* Model info */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">ML Model</p>
          <div className="mt-2.5">
            <p className="text-lg font-bold text-white">Random Forest</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">100 Estimators</p>
          </div>
        </div>
      </div>

      {/* Main Interactive AI Control Split Panel */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left column: Navigation Tabs & Forms */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md shadow-2xl">
            {/* Tab Header Selector */}
            <div className="mb-6 flex rounded-xl bg-slate-950 p-1 border border-slate-850">
              <button
                type="button"
                onClick={() => setActiveTab("predict")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === "predict"
                    ? "bg-slate-900 text-white border border-slate-800 shadow-lg"
                    : "text-slate-500 hover:text-slate-350"
                }`}
              >
                Predict Station
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("route")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === "route"
                    ? "bg-slate-900 text-white border border-slate-800 shadow-lg"
                    : "text-slate-500 hover:text-slate-350"
                }`}
              >
                Find Alternatives
              </button>
            </div>

            {/* Display relevant Form based on active Tab */}
            {activeTab === "predict" ? (
              <div className="space-y-4 animate-in fade-in duration-350">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-white">Station Prediction</h2>
                  <p className="text-xs text-slate-500">Calculate exact wait times and congestion for a specific platform.</p>
                </div>
                <PredictionForm
                  includeStation={true}
                  loading={predictLoading}
                  onSubmit={handlePredict}
                />
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-350">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-white">Smart Routing</h2>
                  <p className="text-xs text-slate-500">Identify the top 10 least crowded alternative stations along a line.</p>
                </div>
                <PredictionForm
                  includeStation={false}
                  loading={recommendLoading}
                  onSubmit={handleRecommend}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right column: Results View */}
        <div className="lg:col-span-7 flex flex-col justify-stretch">
          <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-md shadow-2xl flex flex-col">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              {activeTab === "predict" ? "Congestion Prediction Output" : "Alternative Station Recommendations"}
            </h3>

            {/* Prediction Tab Results */}
            {activeTab === "predict" && (
              <div className="flex-1 flex flex-col justify-center">
                {predictError && (
                  <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 mb-4 text-sm text-red-400">
                    {predictError}
                  </div>
                )}

                {predictResult ? (
                  <div className="space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Card 1: Score */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Congestion Score</span>
                        <div className="mt-3">
                          <span className="text-5xl font-black tracking-tight text-white">
                            {predictResult.predicted_congestion.toFixed(0)}
                            <span className="text-lg text-slate-500 font-semibold">/100</span>
                          </span>
                        </div>
                        <span
                          className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize border ${getCongestionBg(
                            getCongestionLevel(predictResult.predicted_congestion)
                          )} ${getCongestionColor(getCongestionLevel(predictResult.predicted_congestion))}`}
                        >
                          {getCongestionLevel(predictResult.predicted_congestion)} Congestion
                        </span>
                      </div>

                      {/* Card 2: Wait Time */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Est. Wait Time</span>
                        <div className="mt-3">
                          <span className="text-5xl font-black tracking-tight text-teal-400">
                            {predictResult.estimated_wait_time.toFixed(1)}
                            <span className="text-lg text-slate-500 font-semibold ml-0.5">min</span>
                          </span>
                        </div>
                        <span className="mt-2 text-xs text-slate-500 block font-medium">Estimated queue processing speed</span>
                      </div>
                    </div>

                    {/* Progress Bar Visualizer */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Crowd Intensity Level</span>
                      <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            getCongestionLevel(predictResult.predicted_congestion) === "low"
                              ? "bg-emerald-500"
                              : getCongestionLevel(predictResult.predicted_congestion) === "moderate"
                              ? "bg-amber-500"
                              : getCongestionLevel(predictResult.predicted_congestion) === "high"
                              ? "bg-orange-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(predictResult.predicted_congestion, 100)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] text-slate-500 font-semibold uppercase">
                        <span>Low (0-30)</span>
                        <span>Moderate (30-60)</span>
                        <span>High (60-80)</span>
                        <span>Critical (80+)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mx-auto text-slate-700 mb-3"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p className="text-sm font-bold text-slate-400">Awaiting Input Parameters</p>
                    <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">Fill in the subway details on the left to invoke the congestion prediction model.</p>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations Tab Results */}
            {activeTab === "route" && (
              <div className="flex-1 flex flex-col justify-center">
                {recommendError && (
                  <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 mb-4 text-sm text-red-400">
                    {recommendError}
                  </div>
                )}

                {recommendations ? (
                  <div className="space-y-4 animate-in zoom-in-95 duration-300">
                    {recommendations.length > 0 && (
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 p-5 text-white shadow-lg shadow-teal-500/10">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white mb-1">
                              👑 Recommended Alternative
                            </span>
                            <h4 className="text-2xl font-black">{recommendations[0].station}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-3xl font-black tabular-nums">{recommendations[0].predicted_congestion.toFixed(0)}</span>
                            <span className="text-xs text-teal-200 block">Lowest Congestion</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recommendations Table */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 overflow-hidden">
                      <div className="overflow-x-auto max-h-[280px]">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-850 text-slate-500">
                              <th className="px-4 py-3 font-semibold">Rank</th>
                              <th className="px-4 py-3 font-semibold">Station</th>
                              <th className="px-4 py-3 font-semibold">Congestion</th>
                              <th className="px-4 py-3 font-semibold text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850/60">
                            {recommendations.map((rec, idx) => {
                              const level = getCongestionLevel(rec.predicted_congestion);
                              return (
                                <tr key={rec.station} className="hover:bg-slate-900/30">
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                      idx === 0 ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" : "bg-slate-800 text-slate-400"
                                    }`}>
                                      #{idx + 1}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 font-bold text-slate-300">{rec.station}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`font-bold tabular-nums ${getCongestionColor(level)}`}>
                                      {rec.predicted_congestion.toFixed(1)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize border ${getCongestionBg(level)} ${getCongestionColor(level)}`}>
                                      {level}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mx-auto text-slate-700 mb-3"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <p className="text-sm font-bold text-slate-400">Alternative Recommendations Waiting</p>
                    <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">Select a subway line on the left to extract the top low-congestion alternative stations.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Popular Station Overview Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Live Metro Overview
          </h2>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Predictions for {String(currentHour).padStart(2, "0")}:00
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stations.map((s) => {
            const level = s.result ? getCongestionLevel(s.result.predicted_congestion) : null;
            return (
              <div
                key={s.station}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all duration-200 hover:border-slate-750 hover:shadow-lg hover:shadow-black/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-white">{s.station}</p>
                    <p className="text-xs text-slate-500 font-semibold">{s.line}</p>
                  </div>
                  {s.loading ? (
                    <div className="h-6 w-10 animate-pulse rounded bg-slate-800" />
                  ) : s.result && level ? (
                    <span className={`text-2xl font-black tracking-tight tabular-nums ${getCongestionColor(level)}`}>
                      {s.result.predicted_congestion.toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">N/A</span>
                  )}
                </div>

                {s.result && level && (
                  <div className="mt-4">
                    <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
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
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Wait: <span className="font-bold text-slate-350">{s.result.estimated_wait_time.toFixed(1)} min</span></span>
                      <span className={`font-bold uppercase tracking-wider ${getCongestionColor(level)}`}>{level}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
