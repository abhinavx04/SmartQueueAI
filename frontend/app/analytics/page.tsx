"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { 
  ArrowLeft, Cpu, Activity, History, Clock, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { 
  getFeatureImportance, getDistribution, getHistory, getTrends
} from "@/services/api";
import type { 
  FeatureImportanceItem, DistributionItem, HistoryItem, TrendItem
} from "@/types";

// Premium status colors
const CH_COLORS = ["#22c55e", "#fbbf24", "#f97316", "#ff5a5a"];

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
          <div className="absolute inset-0 rounded-full border-4 border-white/[0.04] animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#00d4ff] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        <p className="text-white/60 font-semibold tracking-wider text-xs uppercase animate-pulse">
          Consulting analytics engine...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ff5a5a]/10 border border-[#ff5a5a]/20 text-[#ff5a5a] shadow-[0_0_15px_rgba(255,90,90,0.15)]">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">SYSTEM OFFLINE</h2>
        <p className="text-center text-white/50 text-xs max-w-md font-medium leading-relaxed">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-6 py-2.5 rounded-xl neon-btn-glow text-xs font-extrabold tracking-widest text-white cursor-pointer"
        >
          RETRY AUDIT
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            System Analytics
          </h1>
          <p className="text-xs text-white/50 font-medium mt-0.5">
            Insights from the Random Forest model and historical predictions.
          </p>
        </div>
        <Link 
          href="/" 
          className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition-all px-4 py-2 text-[10px] font-black text-white/80 hover:text-white uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4 text-white/50" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Feature Importance Bar Chart */}
        <div className="glass-panel blue-border-glow rounded-3xl p-6 flex flex-col gap-5 bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center text-[#00d4ff]">
              <Cpu className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Model Feature Importance</h2>
              <p className="text-[10px] text-white/40">Relative weight of neural input features</p>
            </div>
          </div>
          <div className="h-[280px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="bar-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#4d6fff" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.02)" />
                <XAxis type="number" hide />
                <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700}} width={75} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.02)'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass-panel border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white bg-[#0b1020]/95 shadow-xl">
                          <p className="text-white/40 tracking-wider uppercase text-[8px]">Importance Score</p>
                          <p className="text-sm text-[#00d4ff] tabular-nums mt-0.5">
                            {Number(payload[0].value).toFixed(4)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="importance" fill="url(#bar-grad)" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Congestion Distribution Pie Chart */}
        <div className="glass-panel purple-border-glow rounded-3xl p-6 flex flex-col gap-5 bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center text-[#8b5cf6]">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Prediction Distribution</h2>
              <p className="text-[10px] text-white/40">Audit of historical congestion categorizations</p>
            </div>
          </div>
          {!hasDist ? (
            <div className="h-[280px] flex items-center justify-center text-white/30 text-xs font-semibold italic">
              No historical data available. Run predictions on the dashboard.
            </div>
          ) : (
            <div className="h-[280px] w-full flex flex-col justify-between mt-2">
              <div className="h-[210px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="level"
                    >
                      {distData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CH_COLORS[index % CH_COLORS.length]} stroke="rgba(5,7,10,0.8)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="glass-panel border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white bg-[#0b1020]/95 shadow-xl">
                              <p className="text-white/40 tracking-wider uppercase text-[8px]">{payload[0].name}</p>
                              <p className="text-sm text-white mt-0.5">
                                {Number(payload[0].value)} Predictions
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-xl font-black text-white tracking-tighter">
                    {distData.reduce((acc, d) => acc + d.count, 0)}
                  </span>
                  <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">TOTAL</span>
                </div>
              </div>
              <div className="flex justify-center gap-4 flex-wrap pb-1">
                {distData.map((entry, index) => (
                  <div key={entry.level} className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.05] rounded-xl px-2.5 py-1">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: CH_COLORS[index]}}></div>
                    <span className="text-[10px] font-black text-white/75 uppercase tracking-wider">{entry.level}</span>
                    <span className="text-[10px] font-black text-white/40 ml-0.5">({entry.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Prediction History Area Chart */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col gap-5 lg:col-span-2 bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#ff4fd8]/10 border border-[#ff4fd8]/20 flex items-center justify-center text-[#ff4fd8]">
              <History className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Recent Prediction History</h2>
              <p className="text-[10px] text-white/40">Chronological timeline of forecasted metro congestion</p>
            </div>
          </div>
          {!hasHistory ? (
            <div className="h-[240px] flex items-center justify-center text-white/30 text-xs font-semibold italic">
              No prediction history found in the database.
            </div>
          ) : (
            <div className="h-[240px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistoryData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hist-line-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#4d6fff" />
                      <stop offset="100%" stopColor="#ff4fd8" />
                    </linearGradient>
                    <linearGradient id="hist-area-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4fd8" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#ff4fd8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700}} domain={[0, 100]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="glass-panel border-white/10 rounded-xl px-3.5 py-2 text-[10px] font-black text-white bg-[#0b1020]/95 shadow-xl leading-normal">
                            <p className="text-white/40 tracking-wider uppercase text-[8px]">{data.station}</p>
                            <p className="text-base text-[#ff4fd8] tabular-nums mt-0.5">
                              {Number(payload[0].value).toFixed(1)}
                            </p>
                            <p className="text-white/50 mt-0.5">At {data.time}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="congestion" stroke="url(#hist-line-grad)" strokeWidth={3} fillOpacity={1} fill="url(#hist-area-fill)" dot={{r: 3.5, fill: "#4d6fff", stroke: "#05070a", strokeWidth: 1.5}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Card 4: Wait Time Trends Line Chart */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col gap-5 lg:col-span-2 bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/20 flex items-center justify-center text-[#fbbf24]">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Wait Time Trends by Hour</h2>
              <p className="text-[10px] text-white/40">Diurnal profile of estimated processing queues</p>
            </div>
          </div>
          {trendData.every(d => d.avg_wait_time === 0) ? (
            <div className="h-[240px] flex items-center justify-center text-white/30 text-xs font-semibold italic">
              Insufficient data to generate wait time trends.
            </div>
          ) : (
            <div className="h-[240px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                  <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700}} 
                    tickFormatter={(val) => {
                      const num = Number(val);
                      const h = Math.floor(num);
                      const m = num % 1 === 0 ? "00" : "30";
                      return `${String(h).padStart(2, "0")}:${m}`;
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700}} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const num = Number(label);
                        const h = Math.floor(num);
                        const m = num % 1 === 0 ? "00" : "30";
                        return (
                          <div className="glass-panel border-white/10 rounded-xl px-3.5 py-2 text-[10px] font-black text-white bg-[#0b1020]/95 shadow-xl">
                            <p className="text-white/40 tracking-wider uppercase text-[8px]">Est. Wait Time</p>
                            <p className="text-base text-[#fbbf24] tabular-nums mt-0.5">
                              {Number(payload[0].value).toFixed(2)} min
                            </p>
                            <p className="text-white/50 mt-0.5">Time: {String(h).padStart(2, "0")}:{m}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="avg_wait_time" stroke="#fbbf24" strokeWidth={3} dot={{r: 4, fill: "#fbbf24", stroke: "#05070a", strokeWidth: 1.5}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
