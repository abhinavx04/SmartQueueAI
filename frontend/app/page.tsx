"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Clock, Users, Database, Cpu, Target, Sparkles, ChevronRight, 
  MapPin, Calendar, ArrowUpDown, ChevronDown, Check, Info
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
  checkHealth, predictCongestion, getRecommendations, getStations, type StationItem 
} from "@/services/api";
import { 
  SUBWAY_LINES, DIRECTIONS, getHourOptions, type PredictionResponse, type StationCongestion 
} from "@/types";

// Translation dictionary matching the mockup image for high-fidelity English/Korean labels
const STATION_ENG: Record<string, string> = {
  "서울역": "Seoul Station",
  "강남": "Gangnam",
  "종로3가": "Jongno 3-ga",
  "동대문": "Dongdaemun",
  "잠실": "Jamsil",
  "신도림": "Sindorim",
  "시청": "City Hall",
  "건대입구": "Konkuk Univ.",
  "홍대입구": "Hongik Univ.",
  "신촌": "Sinchon",
  "여의도": "Yeouido",
  "광화문": "Gwanghwamun",
  "사당": "Sadang",
  "왕십리": "Wangsimni",
  "고속터미널": "Express Bus Terminal",
  "불암산": "Bulamsam",
  "독립문": "Dongnimmun",
  "독바위": "Dokbawi",
  "연신내": "Yeonsinnae",
  "구파발": "Gupabal",
};

function formatStationName(name: string): string {
  const eng = STATION_ENG[name];
  return eng ? `${name} (${eng})` : name;
}

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState<"checking" | "healthy" | "offline">("checking");
  const [allStations, setAllStations] = useState<StationItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Selection states
  const [line, setLine] = useState("1호선");
  const [station, setStation] = useState("서울역");
  const [direction, setDirection] = useState("상선");
  const [hour, setHour] = useState(8.0);
  const [isWeekend, setIsWeekend] = useState(false);

  // Results states
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictResult, setPredictResult] = useState<PredictionResponse | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<StationCongestion[] | null>(null);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  // Dropdown open states
  const [lineDropdownOpen, setLineDropdownOpen] = useState(false);
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false);
  const [dirDropdownOpen, setDirDropdownOpen] = useState(false);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  // Dropdown refs for click outside handling
  const lineRef = useRef<HTMLDivElement>(null);
  const stationRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  // Load all stations and run initial predictions
  useEffect(() => {
    // Check API health
    checkHealth()
      .then(() => setApiStatus("healthy"))
      .catch(() => setApiStatus("offline"));

    // Fetch stations list
    getStations()
      .then((data) => {
        setAllStations(data);
        // Once loaded, trigger initial predict on default station
        runDefaultPrediction(data);
      })
      .catch((err) => {
        console.error("Failed to load stations:", err);
        // Fallback to default predictions even if station list fails
        runDefaultPrediction([]);
      });

    // Setup click-outside hooks
    function handleClickOutside(event: MouseEvent) {
      if (lineRef.current && !lineRef.current.contains(event.target as Node)) setLineDropdownOpen(false);
      if (stationRef.current && !stationRef.current.contains(event.target as Node)) setStationDropdownOpen(false);
      if (dirRef.current && !dirRef.current.contains(event.target as Node)) setDirDropdownOpen(false);
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) setTimeDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update dynamic time updates description
  const [lastUpdatedText, setLastUpdatedText] = useState("Just now");
  useEffect(() => {
    const interval = setInterval(() => {
      const diffSec = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
      if (diffSec < 10) setLastUpdatedText("Just now");
      else if (diffSec < 60) setLastUpdatedText(`${diffSec}s ago`);
      else setLastUpdatedText(`${Math.floor(diffSec / 60)}m ago`);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Default initial prediction run
  const runDefaultPrediction = (stationList: StationItem[]) => {
    const initialLine = "1호선";
    const initialStation = "서울역";
    const initialDirection = "상선";
    const initialHour = 8.0;
    const initialWeekend = false;

    setPredictLoading(true);
    setRecommendLoading(true);

    const apiHour = initialHour;
    const dayType = initialWeekend ? 1 : 0;

    Promise.all([
      predictCongestion({
        hour: apiHour,
        day_type: dayType,
        line: initialLine,
        station: initialStation,
        direction: initialDirection,
      }),
      getRecommendations({
        hour: apiHour,
        day_type: dayType,
        line: initialLine,
        direction: initialDirection,
      })
    ])
      .then(([predRes, recRes]) => {
        setPredictResult(predRes);
        setRecommendations(recRes.recommendations);
        setLastUpdated(new Date());
        setLastUpdatedText("Just now");
      })
      .catch((err) => {
        console.error("Initial load prediction failed:", err);
        setPredictError("Failed to fetch initial predictions.");
      })
      .finally(() => {
        setPredictLoading(false);
        setRecommendLoading(false);
      });
  };

  // Perform prediction and recommendations on form submission
  const handlePredict = async () => {
    setPredictLoading(true);
    setRecommendLoading(true);
    setPredictError(null);
    setRecommendError(null);

    const dayType = isWeekend ? 1 : 0;

    try {
      const [predRes, recRes] = await Promise.all([
        predictCongestion({
          hour,
          day_type: dayType,
          line,
          station,
          direction,
        }),
        getRecommendations({
          hour,
          day_type: dayType,
          line,
          direction,
        })
      ]);

      setPredictResult(predRes);
      setRecommendations(recRes.recommendations);
      setLastUpdated(new Date());
      setLastUpdatedText("Just now");
    } catch (err: any) {
      console.error("Prediction failed:", err);
      setPredictError(err.message || "An error occurred while calculating predictions.");
      setRecommendError("Failed to load alternative stations.");
    } finally {
      setPredictLoading(false);
      setRecommendLoading(false);
    }
  };

  // When subway line changes, auto-select first station of that line
  const handleLineChange = (newLine: string) => {
    setLine(newLine);
    setLineDropdownOpen(false);
    const stationsOnLine = allStations.filter((s) => s.line === newLine);
    if (stationsOnLine.length > 0) {
      setStation(stationsOnLine[0].station);
    } else {
      // Fallback defaults
      if (newLine === "1호선") setStation("서울역");
      else if (newLine === "2호선") setStation("강남");
      else if (newLine === "3호선") setStation("종로3가");
      else if (newLine === "4호선") setStation("동대문");
      else setStation(allStations[0]?.station || "서울역");
    }
  };

  // Subway lines formatting for selector list
  const lineOptions = SUBWAY_LINES.map(l => ({ value: l, label: l }));
  
  // Dynamic station list filtered by line
  const currentLineStations = allStations.filter(s => s.line === line).map(s => s.station);
  const uniqueStationsOnLine = Array.from(new Set(currentLineStations.length > 0 ? currentLineStations : [station]));
  const stationOptions = uniqueStationsOnLine.map(s => ({ value: s, label: formatStationName(s) }));

  // Directions formatting
  const dirOptions = DIRECTIONS.map(d => ({ value: d, label: d === "상선" ? "상선 (Upbound)" : "하선 (Downbound)" }));

  // Time selections
  const hourOptions = getHourOptions().map(opt => ({
    value: opt.value,
    label: opt.label.replace(" ⚡", "") // Clean tag for display list
  }));

  // Find label of active hour
  const activeTimeLabel = hourOptions.find(opt => opt.value === hour)?.label || "08:00 AM";

  // Helpers for Congestion gauge
  const congestionScore = predictResult?.predicted_congestion ?? 82.6;
  const waitTime = predictResult?.estimated_wait_time ?? 16.5;

  let congestionColorClass = "text-[#22c55e]";
  let gaugeGlowClass = "cyan-border-glow";
  let gaugeStroke = "#22c55e";

  if (congestionScore < 30) {
    congestionColorClass = "text-[#22c55e]";
    gaugeStroke = "#22c55e";
    gaugeGlowClass = "shadow-[0_0_35px_rgba(34,197,94,0.25)] border-[#22c55e]/25";
  } else if (congestionScore < 60) {
    congestionColorClass = "text-[#fbbf24]";
    gaugeStroke = "#fbbf24";
    gaugeGlowClass = "shadow-[0_0_35px_rgba(251,191,36,0.25)] border-[#fbbf24]/25";
  } else if (congestionScore < 80) {
    congestionColorClass = "text-[#ff9024]";
    gaugeStroke = "#ff9024";
    gaugeGlowClass = "shadow-[0_0_35px_rgba(255,144,36,0.25)] border-[#ff9024]/25";
  } else {
    congestionColorClass = "text-[#ff5a5a]";
    gaugeStroke = "#ff5a5a";
    gaugeGlowClass = "shadow-[0_0_35px_rgba(255,90,90,0.25)] border-[#ff5a5a]/25";
  }

  // Radial Ring values
  const gaugeRadius = 38;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius; // ~238.76
  const gaugeStrokeDashoffset = gaugeCircumference - (Math.min(congestionScore, 100) / 100) * gaugeCircumference;

  // Generate Recharts Spline line chart data points
  // Create a realistic double peak rush hour curve around the predicted congestion score
  const trendData = [
    { name: "12 AM", score: Math.round(congestionScore * 0.18) },
    { name: "4 AM", score: Math.round(congestionScore * 0.10) },
    { name: "8 AM", score: Math.round(congestionScore * 0.98) }, // Peak morning
    { name: "12 PM", score: Math.round(congestionScore * 0.48) },
    { name: "4 PM", score: Math.round(congestionScore * 0.72) },
    { name: "8 PM", score: Math.round(congestionScore * 0.82) }, // Peak evening
    { name: "12 AM", score: Math.round(congestionScore * 0.15) }
  ];

  // Colors for rank badges on alternative routes
  const RANK_COLORS = [
    { bg: "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30", badge: "#22c55e" }, // Green
    { bg: "bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/30", badge: "#00d4ff" }, // Blue/Cyan
    { bg: "bg-[#8b5cf6]/15 text-[#8b5cf6] border-[#8b5cf6]/30", badge: "#8b5cf6" }, // Purple
    { bg: "bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/30", badge: "#fbbf24" }, // Amber
    { bg: "bg-[#ff4fd8]/15 text-[#ff4fd8] border-[#ff4fd8]/30", badge: "#ff4fd8" }, // Pink
  ];

  return (
    <div className="flex flex-col gap-6 relative z-10 w-full animate-in fade-in duration-500">
      
      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ── LEFT PANEL: Journey Planning Card (25%) ── */}
        <div className="lg:col-span-3 flex flex-col h-full">
          <div className="glass-panel blue-border-glow rounded-3xl p-6 flex flex-col justify-between flex-1 gap-6">
            
            {/* Header */}
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Plan Your Ride
              </h2>
              <p className="text-[11px] text-white/50 font-medium mt-0.5">
                Get real-time crowd insights
              </p>
            </div>

            {/* Selectors Form */}
            <div className="flex flex-col gap-4">
              
              {/* Dropdown 1: Subway Line */}
              <div className="space-y-1.5" ref={lineRef}>
                <label className="text-[11px] font-bold tracking-wider text-white/40 uppercase">
                  Subway Line
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLineDropdownOpen(!lineDropdownOpen)}
                    className="w-full flex items-center justify-between h-12 rounded-2xl bg-white/[0.02] border border-white/[0.07] px-4 text-xs font-bold text-white transition-all hover:bg-white/[0.04] focus:border-[#00d4ff]/40 focus:ring-2 focus:ring-[#00d4ff]/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#4d6fff] flex items-center justify-center scale-90">
                        <span className="text-[9px] font-black text-white">L</span>
                      </div>
                      <span>{line}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/40" />
                  </button>
                  {lineDropdownOpen && (
                    <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-2xl glass-panel border border-white/[0.1] bg-[#0b1020]/95 p-1.5 custom-scroll">
                      {lineOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleLineChange(String(opt.value))}
                          className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-all hover:bg-white/[0.05] ${
                            line === opt.value ? "text-[#00d4ff] bg-white/[0.03]" : "text-white/70"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {line === opt.value && <Check className="w-3.5 h-3.5 text-[#00d4ff]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dropdown 2: Station */}
              <div className="space-y-1.5" ref={stationRef}>
                <label className="text-[11px] font-bold tracking-wider text-white/40 uppercase">
                  Station
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStationDropdownOpen(!stationDropdownOpen)}
                    className="w-full flex items-center justify-between h-12 rounded-2xl bg-white/[0.02] border border-white/[0.07] px-4 text-xs font-bold text-white transition-all hover:bg-white/[0.04] focus:border-[#00d4ff]/40 focus:ring-2 focus:ring-[#00d4ff]/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-white/50" />
                      <span className="truncate max-w-[150px]">{formatStationName(station)}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/40" />
                  </button>
                  {stationDropdownOpen && (
                    <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-2xl glass-panel border border-white/[0.1] bg-[#0b1020]/95 p-1.5 custom-scroll">
                      {stationOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setStation(String(opt.value));
                            setStationDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-all hover:bg-white/[0.05] ${
                            station === opt.value ? "text-[#00d4ff] bg-white/[0.03]" : "text-white/70"
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {station === opt.value && <Check className="w-3.5 h-3.5 text-[#00d4ff]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dropdown 3: Direction */}
              <div className="space-y-1.5" ref={dirRef}>
                <label className="text-[11px] font-bold tracking-wider text-white/40 uppercase">
                  Direction
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDirDropdownOpen(!dirDropdownOpen)}
                    className="w-full flex items-center justify-between h-12 rounded-2xl bg-white/[0.02] border border-white/[0.07] px-4 text-xs font-bold text-white transition-all hover:bg-white/[0.04] focus:border-[#00d4ff]/40 focus:ring-2 focus:ring-[#00d4ff]/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowUpDown className="w-4 h-4 text-white/50" />
                      <span>{direction === "상선" ? "상선 (Upbound)" : "하선 (Downbound)"}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/40" />
                  </button>
                  {dirDropdownOpen && (
                    <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-2xl glass-panel border border-white/[0.1] bg-[#0b1020]/95 p-1.5">
                      {dirOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setDirection(String(opt.value));
                            setDirDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-all hover:bg-white/[0.05] ${
                            direction === opt.value ? "text-[#00d4ff] bg-white/[0.03]" : "text-white/70"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {direction === opt.value && <Check className="w-3.5 h-3.5 text-[#00d4ff]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dropdown 4: Time */}
              <div className="space-y-1.5" ref={timeRef}>
                <label className="text-[11px] font-bold tracking-wider text-white/40 uppercase">
                  Time
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                    className="w-full flex items-center justify-between h-12 rounded-2xl bg-white/[0.02] border border-white/[0.07] px-4 text-xs font-bold text-white transition-all hover:bg-white/[0.04] focus:border-[#00d4ff]/40 focus:ring-2 focus:ring-[#00d4ff]/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-white/50" />
                      <span>{activeTimeLabel}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/40" />
                  </button>
                  {timeDropdownOpen && (
                    <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-2xl glass-panel border border-white/[0.1] bg-[#0b1020]/95 p-1.5 custom-scroll">
                      {hourOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setHour(Number(opt.value));
                            setTimeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-all hover:bg-white/[0.05] ${
                            hour === opt.value ? "text-[#00d4ff] bg-white/[0.03]" : "text-white/70"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {hour === opt.value && <Check className="w-3.5 h-3.5 text-[#00d4ff]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Weekend toggle and CTA predict button */}
            <div className="flex flex-col gap-5 pt-2">
              
              {/* Weekend Toggle */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/50" />
                  <span className="text-xs font-bold text-white/70">Weekend</span>
                </div>
                {/* Modern iOS toggle switch */}
                <button
                  type="button"
                  onClick={() => setIsWeekend(!isWeekend)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 ${
                    isWeekend ? "bg-[#00d4ff] shadow-[0_0_10px_rgba(0,212,255,0.4)]" : "bg-white/[0.1]"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 transform ${
                      isWeekend ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Large Predict Gradient CTA Button */}
              <button
                type="button"
                onClick={handlePredict}
                disabled={predictLoading}
                className="w-full h-12 rounded-2xl neon-btn-glow text-xs font-extrabold tracking-widest text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{predictLoading ? "PREDICTING..." : "PREDICT NOW"}</span>
                <Sparkles className="w-4 h-4 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
              </button>

            </div>

          </div>
        </div>

        {/* ── CENTER PANEL: AI Prediction Results (45%) ── */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Main Prediction Card */}
          <div className={`glass-panel ${gaugeGlowClass} rounded-3xl p-6 flex flex-col gap-5 transition-all duration-500`}>
            
            {/* Header */}
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Prediction Result
              </h2>
              <p className="text-[11px] text-white/50 font-medium mt-0.5">
                Live congestion prediction
              </p>
            </div>

            <div className="h-[1px] w-full bg-white/[0.08]" />

            {/* Split layout inside result card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-1">
              
              {/* Left Section: Radial progress circle */}
              <div className="md:col-span-6 flex flex-col items-center justify-center relative">
                
                {/* SVG Radial Gauge */}
                <div className="relative flex items-center justify-center">
                  <svg className="w-44 h-44 drop-shadow-[0_0_20px_rgba(255,255,255,0.02)]" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="gauge-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="35%" stopColor="#fbbf24" />
                        <stop offset="65%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#ff5a5a" />
                      </linearGradient>
                    </defs>
                    {/* Track */}
                    <circle
                      cx="50"
                      cy="50"
                      r={gaugeRadius}
                      stroke="rgba(255, 255, 255, 0.03)"
                      strokeWidth="7"
                      fill="none"
                      strokeDasharray="210"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      transform="rotate(135 50 50)"
                    />
                    {/* Progress Fill */}
                    <circle
                      cx="50"
                      cy="50"
                      r={gaugeRadius}
                      stroke="url(#gauge-gradient)"
                      strokeWidth="7"
                      fill="none"
                      strokeDasharray="210"
                      strokeDashoffset={210 - (210 * Math.min(congestionScore, 100)) / 100}
                      strokeLinecap="round"
                      transform="rotate(135 50 50)"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  
                  {/* Inside metrics display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center mt-2.5">
                    <span className="text-4xl font-black tracking-tighter text-white tabular-nums">
                      {congestionScore.toFixed(1)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Section: Two vertically stacked metrics */}
              <div className="md:col-span-6 flex flex-col gap-4 w-full">
                
                {/* Metric Card 1: Wait Time */}
                <div className="glass-panel border-white/[0.05] rounded-2xl p-4 flex items-center gap-3.5 bg-white/[0.01]">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/80">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 tracking-wider uppercase">
                      Estimated Wait Time
                    </p>
                    <p className="text-lg font-black text-white tabular-nums mt-0.5">
                      {waitTime.toFixed(1)} <span className="text-xs text-white/50 font-bold ml-0.5">min</span>
                    </p>
                    <p className="text-[9px] font-semibold text-white/40">
                      High queue expected
                    </p>
                  </div>
                </div>

                {/* Metric Card 2: Rush Hour State */}
                <div className="glass-panel border-white/[0.05] rounded-2xl p-4 flex items-center gap-3.5 bg-white/[0.01] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[#fbbf24]/[0.02] pointer-events-none" />
                  <div className="h-10 w-10 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/20 flex items-center justify-center text-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#fbbf24] tracking-wider uppercase flex items-center gap-1.5">
                      Rush Hour
                      <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24] animate-ping" />
                    </p>
                    <p className="text-sm font-black text-white mt-0.5">
                      Active Window
                    </p>
                    <p className="text-[9px] font-semibold text-white/40">
                      High crowd expected
                    </p>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Center Lower Section — Congestion Trend Chart */}
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-4 flex-1">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black tracking-tight text-white">
                  Congestion Trend
                </h2>
                <p className="text-[10px] text-white/50 font-medium mt-0.5">
                  Today's congestion pattern
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] px-2 py-1">
                <Info className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[9px] font-extrabold text-white/60 uppercase tracking-wider">
                  Spline spl.
                </span>
              </div>
            </div>

            {/* Recharts chart area */}
            <div className="h-44 w-full flex items-center justify-center mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 15, right: 10, left: -25, bottom: -5 }}>
                  <defs>
                    <linearGradient id="trend-line-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00d4ff" />
                      <stop offset="30%" stopColor="#22c55e" />
                      <stop offset="70%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#ff5a5a" />
                    </linearGradient>
                    <linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4d6fff" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4d6fff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9, fontWeight: 700 }}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass-panel border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white shadow-xl bg-[#0b1020]/95 backdrop-blur-md">
                            <p className="text-white/40 tracking-wider uppercase text-[8px] font-bold">Congestion</p>
                            <p className="text-base text-[#00d4ff] tabular-nums mt-0.5">
                              {Number(payload[0].value).toFixed(1)}
                            </p>
                            <p className="text-white/60 mt-0.5">At {payload[0].payload.name}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="url(#trend-line-gradient)"
                    strokeWidth={3}
                    fill="url(#trend-area-fill)"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (cx === undefined || cy === undefined) return null;
                      // Highlight the peak value (8 AM) with a custom glowing red dot as in mockup
                      if (payload.name === "8 AM") {
                        return (
                          <g key="peak-indicator">
                            <circle cx={cx} cy={cy} r="6" fill="#ff5a5a" className="animate-pulse" />
                            <circle cx={cx} cy={cy} r="3" fill="#ffffff" />
                          </g>
                        );
                      }
                      return <circle key={payload.name} cx={cx} cy={cy} r="3" fill="#00d4ff" stroke="#05070a" strokeWidth="1.5" />;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>

        </div>

        {/* ── RIGHT PANEL: Recommended Alternatives (30%) ── */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="glass-panel purple-border-glow rounded-3xl p-6 flex flex-col justify-between flex-1 gap-5">
            
            {/* Header */}
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Recommended Alternatives
              </h2>
              <p className="text-[11px] text-white/50 font-medium mt-0.5">
                Less crowded stations
              </p>
            </div>

            {/* Recommendations List Container */}
            <div className="flex flex-col gap-3.5 flex-grow overflow-y-auto max-h-[360px] custom-scroll pr-1.5 py-1">
              {recommendLoading ? (
                // Pulse skeletal loading state
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="h-[52px] rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                ))
              ) : recommendations && recommendations.length > 0 ? (
                recommendations.slice(0, 5).map((rec, idx) => {
                  const rankColors = RANK_COLORS[idx % RANK_COLORS.length];
                  
                  // Score level parsing
                  const score = rec.predicted_congestion;
                  let recLevel = "Low";
                  let recColor = "text-[#22c55e]";
                  if (score >= 80) {
                    recLevel = "Critical";
                    recColor = "text-[#ff5a5a]";
                  } else if (score >= 60) {
                    recLevel = "High";
                    recColor = "text-[#ff9024]";
                  } else if (score >= 30) {
                    recLevel = "Mod";
                    recColor = "text-[#fbbf24]";
                  }

                  return (
                    <div
                      key={rec.station}
                      className="glass-panel rounded-2xl px-4 py-3 flex items-center justify-between bg-white/[0.01] hover:bg-white/[0.03] hover:translate-x-0.5 hover:shadow-[0_0_15px_rgba(139,92,246,0.1)] border-white/[0.04] transition-all duration-300 group"
                    >
                      {/* Rank, Name */}
                      <div className="flex items-center gap-3">
                        <div className={`h-6 w-6 rounded-full border flex items-center justify-center text-[10px] font-black ${rankColors.bg} shadow-sm`}>
                          {idx + 1}
                        </div>
                        <span className="text-xs font-black text-white/90 group-hover:text-white truncate max-w-[140px] transition-colors">
                          {formatStationName(rec.station)}
                        </span>
                      </div>

                      {/* Congestion score and tag */}
                      <div className="text-right flex flex-col justify-center">
                        <span className={`text-xs font-black tabular-nums ${recColor}`}>
                          {score.toFixed(1)}
                        </span>
                        <span className="text-[8px] font-bold text-white/35 uppercase tracking-wider">
                          {recLevel}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-white/30 text-center">
                  <Info className="w-8 h-8 text-white/10 mb-2" />
                  <p className="text-xs font-bold">No Alternatives Available</p>
                  <p className="text-[10px] text-white/20 mt-1 max-w-[180px]">Check selections or test backend connection.</p>
                </div>
              )}
            </div>

            {/* Bottom button */}
            <button
              type="button"
              className="w-full h-11 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition-all duration-200 text-[11px] font-black tracking-wider text-white/70 hover:text-white flex items-center justify-center gap-1.5 mt-2"
            >
              <span>VIEW MORE STATIONS</span>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </button>

          </div>
        </div>

      </div>

      {/* ── BOTTOM METRICS BAR (Full width) ── */}
      <div className="w-full mt-2 flex items-center justify-between text-[10px] font-bold text-white/30 px-4">
        <div>Data Source: Seoul Open Data</div>
        <div>Last Updated: {lastUpdatedText}</div>
      </div>

    </div>
  );
}
