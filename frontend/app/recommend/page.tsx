"use client";

import { useState } from "react";
import PredictionForm from "@/components/prediction-form";
import { getRecommendations } from "@/services/api";
import { getCongestionLevel, getCongestionColor, getCongestionBg } from "@/types";
import type { RecommendationResponse, StationCongestion } from "@/types";

export default function RecommendPage() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<StationCongestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecommend = async (data: {
    hour: number;
    is_weekend: number;
    rush_hour: number;
    line: string;
    direction: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRecommendations(data);
      setRecommendations(response.recommendations);
    } catch (err: any) {
      setError(err.message || "Failed to fetch recommendations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Smart Routing
        </h1>
        <p className="mt-2 text-base text-slate-500 dark:text-slate-400 max-w-2xl">
          Discover the top 10 least congested stations on your route. Let AI find you a more comfortable journey.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-xl p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
            <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filter Route
            </h2>
            <PredictionForm includeStation={false} loading={loading} onSubmit={handleRecommend} />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/50">
              <div className="flex gap-3">
                <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Results Dashboard */}
        <div className="lg:col-span-8">
          {recommendations ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              {/* Highlight Card for Top Recommendation */}
              {recommendations.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-8 text-white shadow-xl shadow-teal-500/20">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-black/10 blur-xl"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md uppercase tracking-wider text-white mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        Top Pick
                      </span>
                      <h2 className="text-4xl font-black tracking-tight">{recommendations[0].station}</h2>
                      <p className="mt-2 text-teal-100 flex items-center gap-2">
                        Lowest congestion on your route
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="text-5xl font-black tabular-nums tracking-tighter">
                        {recommendations[0].predicted_congestion.toFixed(0)}
                        <span className="text-2xl text-teal-200/80 font-medium ml-1">/ 100</span>
                      </div>
                      <span className="mt-1 text-sm font-medium text-teal-100">Predicted Score</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Top 10 Alternatives</h3>
                  <span className="text-xs font-medium text-slate-500">Ranked by lowest congestion</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-4 font-medium">Rank</th>
                        <th className="px-6 py-4 font-medium">Station</th>
                        <th className="px-6 py-4 font-medium">Congestion Score</th>
                        <th className="px-6 py-4 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {recommendations.map((rec, idx) => {
                        const level = getCongestionLevel(rec.predicted_congestion);
                        const isTop = idx === 0;
                        return (
                          <tr 
                            key={rec.station} 
                            className={`group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isTop ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
                          >
                            <td className="px-6 py-4">
                              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
                                ${idx === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' 
                                : idx < 3 ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}
                              `}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`font-semibold ${isTop ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                {rec.station}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className={`w-12 font-bold tabular-nums ${getCongestionColor(level)}`}>
                                  {rec.predicted_congestion.toFixed(1)}
                                </span>
                                <div className="hidden sm:block h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      level === "low" ? "bg-emerald-500" :
                                      level === "moderate" ? "bg-amber-500" :
                                      level === "high" ? "bg-orange-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${Math.min(rec.predicted_congestion, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize border ${getCongestionBg(level)} ${getCongestionColor(level)}`}>
                                {level}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {recommendations.length === 0 && (
                    <div className="px-6 py-12 text-center text-slate-500">
                      No recommendations available for this route.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ready for Recommendations</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm">
                Select your travel details on the left and hit the button to discover the best stations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
