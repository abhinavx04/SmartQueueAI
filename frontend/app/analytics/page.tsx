"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { 
  getFeatureImportance, getDistribution, getHistory, getTrends
} from "@/services/api";
import type { 
  FeatureImportanceItem, DistributionItem, HistoryItem, TrendItem
} from "@/types";

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [featureData, setFeatureData] = useState<FeatureImportanceItem[]>([]);
  const [distData, setDistData] = useState<DistributionItem[]>([]);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [trendData, setTrendData] = useState<TrendItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const [features, dist, history, trends] = await Promise.all([
          getFeatureImportance(),
          getDistribution(),
          getHistory(20),
          getTrends()
        ]);
        
        setFeatureData(features.items);
        setDistData(dist.items);
        setHistoryData(history.items);
        setTrendData(trends.items);
      } catch (err: any) {
        setError(err.message || "Failed to load analytics data. Ensure the database is accessible.");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-slate-500 font-medium">Loading analytics dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Failed to load data</h2>
        <p className="text-center text-slate-500 max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  const hasHistory = historyData.length > 0;
  const hasDist = distData.some(d => d.count > 0);

  // Format data for Area Chart (history)
  const chartHistoryData = [...historyData].reverse().map((item, idx) => ({
    name: `T-${historyData.length - idx}`,
    congestion: item.predicted_congestion,
    station: item.station_name,
    time: new Date(item.prediction_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          System Analytics
        </h1>
        <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
          Insights from the Random Forest model and historical predictions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Feature Importance Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Model Feature Importance</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                <XAxis type="number" hide />
                <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={80} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9', opacity: 0.1}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="importance" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Congestion Distribution Pie Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Prediction Distribution</h2>
          {!hasDist ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm italic">
              No historical data available. Run some predictions first!
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="level"
                  >
                    {distData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {distData.map((entry, index) => (
                  <div key={entry.level} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{entry.level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Prediction History Area Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Recent Prediction History</h2>
          {!hasHistory ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm italic">
              No prediction history found in the database.
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistoryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCongestion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return `${payload[0].payload.station} at ${payload[0].payload.time}`;
                      }
                      return label;
                    }}
                  />
                  <Area type="monotone" dataKey="congestion" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCongestion)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Wait Time Trends Line Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Wait Time Trends by Hour</h2>
          {trendData.every(d => d.avg_wait_time === 0) ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm italic">
              Insufficient data to generate wait time trends.
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}} 
                    tickFormatter={(val) => {
                      const num = Number(val);
                      const h = Math.floor(num);
                      const m = num % 1 === 0 ? "00" : "30";
                      return `${String(h).padStart(2, "0")}:${m}`;
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: any) => [`${Number(value).toFixed(1)} mins`, 'Avg Wait Time']}
                    labelFormatter={(label) => {
                      const num = Number(label);
                      const h = Math.floor(num);
                      const m = num % 1 === 0 ? "00" : "30";
                      return `${String(h).padStart(2, "0")}:${m}`;
                    }}
                  />
                  <Line type="monotone" dataKey="avg_wait_time" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
