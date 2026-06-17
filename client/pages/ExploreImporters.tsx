import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Heart, X, Loader2, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  animate,
  type PanInfo,
} from "framer-motion";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const customIcon = L.divIcon({
  className: "custom-pin",
  html: `<div class="relative flex flex-col items-center justify-center w-8 h-12">
           <div class="absolute w-8 h-8 rounded-full opacity-30 animate-ping" style="background-color:#ef4444;top:0;"></div>
           <div class="relative w-4 h-4 border-2 border-white rounded-full z-10" style="background-color:#ef4444;margin-top:8px;"></div>
           <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent" style="border-top-color:#ef4444;margin-top:-2px;"></div>
         </div>`,
  iconSize: [32, 48],
  iconAnchor: [16, 40],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 3, { duration: 1.5, easeLinearity: 0.25 });
    const needsOffset = window.innerWidth >= 1024;
    if (needsOffset) {
      setTimeout(() => map.panBy([-192, 0], { animate: true, duration: 1.5 }), 80);
    }
  }, [center, map]);
  return null;
}

interface Match {
  buyer_id: string;
  match_score: number;
  confidence?: number;
  geo_label?: string;
  industry?: string;
  country?: string;
  algorithm?: string;
  cf_weight?: number;
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  "usa": [37.09, -95.71], "united states": [37.09, -95.71],
  "india": [20.59, 78.96], "uk": [55.38, -3.44], "united kingdom": [55.38, -3.44],
  "china": [35.86, 104.20], "germany": [51.17, 10.45], "france": [46.23, 2.21],
  "japan": [36.20, 138.25], "canada": [56.13, -106.35], "australia": [-25.27, 133.78],
  "brazil": [-14.24, -51.93], "mexico": [23.63, -102.55], "italy": [41.87, 12.57],
  "spain": [40.46, -3.75], "south korea": [35.91, 127.77], "russia": [61.52, 105.32],
  "uae": [23.42, 53.85], "united arab emirates": [23.42, 53.85],
  "singapore": [1.35, 103.82], "netherlands": [52.13, 5.29], "vietnam": [14.06, 108.28],
  "thailand": [15.87, 100.99], "malaysia": [4.21, 101.98], "indonesia": [-0.79, 113.92],
  "saudi arabia": [23.89, 45.08], "turkey": [38.96, 35.24], "egypt": [26.82, 30.80],
  "south africa": [-30.56, 22.94], "nigeria": [9.08, 8.68],
};

function getCountryCoords(country?: string): [number, number] {
  if (!country) return [20.59, 78.96];
  const norm = country.toLowerCase().trim();
  for (const [key, coords] of Object.entries(COUNTRY_COORDS)) {
    if (norm.includes(key)) return coords;
  }
  return [20.59, 78.96];
}

export default function ExploreImporters() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [model, setModel] = useState<"hybrid" | "pca" | "regression">("hybrid");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysisMobile, setShowAnalysisMobile] = useState(false);
  const isAnimatingRef = useRef(false);

  const motionX = useMotionValue(0);
  const rotate = useTransform(motionX, [-300, 0, 300], [-18, 0, 18]);
  const passOpacity = useTransform(motionX, [-200, -60, 0], [1, 0.4, 0]);
  const matchOpacity = useTransform(motionX, [0, 60, 200], [0, 0.4, 1]);
  const cardScale = useTransform(motionX, [-300, 0, 300], [0.95, 1, 0.95]);

  const currentUserJson = localStorage.getItem("currentUser");
  if (!currentUserJson) { navigate("/login"); return null; }
  const currentUser = JSON.parse(currentUserJson);
  const exporterId = currentUser.userId;

  const endpoint = model === "hybrid" ? "hybrid-matches" : model === "pca" ? "pca-matches" : "regression-matches";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["matches", exporterId, model],
    queryFn: async () => {
      const res = await api.get(`/api/${endpoint}/${exporterId}`);
      return res.data;
    },
    enabled: !!exporterId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const matches: Match[] = data?.matches || [];
  const currentImporter = matches[currentIndex];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const sendFeedback = async (action: "connect" | "pass", importer: Match) => {
    try {
      await api.post("/api/feedback", {
        exporter_id: exporterId,
        buyer_id: importer.buyer_id,
        action,
        matchDetails: importer,
      });
    } catch (err) {
      console.error("Feedback failed:", err);
    }
  };

  const moveToNext = () => {
    setCurrentIndex((i) => Math.min(i + 1, matches.length));
    setAnalysisResult(null);
  };

  const handleSwipeRight = () => {
    if (!currentImporter) return;
    setMatchedIds((s) => new Set(s).add(currentIndex));
    sendFeedback("connect", currentImporter);
    setConnectSuccess(currentImporter.buyer_id);
    setTimeout(() => setConnectSuccess(null), 3000);
    moveToNext();
  };

  const handleSwipeLeft = () => {
    if (currentImporter) sendFeedback("pass", currentImporter);
    moveToNext();
  };

  const triggerExit = (direction: "left" | "right") => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    const target = direction === "right" ? 650 : -650;
    animate(motionX, target, {
      type: "spring", stiffness: 300, damping: 30,
      onComplete: () => {
        direction === "right" ? handleSwipeRight() : handleSwipeLeft();
        motionX.set(0);
        isAnimatingRef.current = false;
      },
    });
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset: { x: offset }, velocity: { x: velocity } } = info;
    if (offset > 120 || velocity > 400) triggerExit("right");
    else if (offset < -120 || velocity < -400) triggerExit("left");
    else animate(motionX, 0, { type: "spring", stiffness: 500, damping: 30 });
  };

  // Bug fix: goBack removes the current card's match status, not currentIndex-1
  const goBack = () => {
    if (currentIndex === 0) return;
    setMatchedIds((s) => { const n = new Set(s); n.delete(currentIndex - 1); return n; });
    setCurrentIndex((i) => i - 1);
    setAnalysisResult(null);
  };

  const analyzeMatch = async () => {
    if (!currentImporter) return;
    setAnalysisLoading(true);
    setAnalysisResult(null);
    try {
      const res = await api.post("/api/xai/analyze", {
        exporter_id: exporterId,
        matchDetails: currentImporter,
      });
      setAnalysisResult(res.data.explanation);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "AI analysis temporarily unavailable.";
      setAnalysisResult(`Error: ${msg}`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const targetCoords = getCountryCoords(currentImporter?.country);

  const geoColor = (label?: string) => {
    if (label === "FTA_BONUS") return "bg-green-100 text-green-700";
    if (label === "TENSION_PENALTY") return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Full-screen map background */}
      <div className="absolute inset-0 overflow-hidden bg-[#88B0D3] z-0">
        <MapContainer
          center={targetCoords}
          zoom={3}
          minZoom={2}
          maxBounds={[[-85, -180], [85, 180]]}
          maxBoundsViscosity={1.0}
          zoomControl={true}
          scrollWheelZoom={true}
          dragging={true}
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri — National Geographic"
            noWrap={true}
          />
          <MapUpdater center={targetCoords} />
          {currentImporter && <Marker position={targetCoords} icon={customIcon} />}
        </MapContainer>
      </div>

      {/* Left sidebar card panel */}
      <div className="absolute left-0 top-0 h-screen w-96 bg-gradient-to-br from-amber-50 via-white to-green-50 shadow-2xl z-20 flex flex-col border-r border-border">
        {/* Controls */}
        <div className="px-6 py-4 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-foreground flex-1 text-center">
              {matches.length > 0 ? `${Math.min(currentIndex + 1, matches.length)} / ${matches.length}` : "0 / 0"}
            </h2>
            <div className="w-10" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Model:</span>
            <select
              value={model}
              onChange={(e) => { setModel(e.target.value as any); setCurrentIndex(0); setAnalysisResult(null); }}
              className="bg-secondary text-foreground text-sm rounded-lg border-none focus:ring-2 focus:ring-primary p-2 cursor-pointer outline-none"
            >
              <option value="hybrid">Hybrid SVD (Recommended)</option>
              <option value="pca">PCA (Legacy)</option>
              <option value="regression">Regression (Legacy)</option>
            </select>
          </div>
        </div>

        {/* Card area */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm">Finding your best matches…</p>
          </div>
        ) : isError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle size={32} className="text-amber-500 mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Backend unavailable</p>
            <p className="text-xs text-muted-foreground">
              {(error as any)?.response?.data?.detail || "Could not reach the ML service. Make sure the backend is running."}
            </p>
          </div>
        ) : !currentImporter ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
            <CheckCircle2 size={32} className="text-green-500 mb-3" />
            <p className="text-lg font-semibold text-foreground mb-1">All caught up!</p>
            <p className="text-sm">You've reviewed all available importers.</p>
            {matchedIds.size > 0 && (
              <p className="mt-2 text-primary font-semibold text-sm">{matchedIds.size} match{matchedIds.size !== 1 ? "es" : ""} saved →</p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden px-6 py-4 relative min-h-0">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentIndex}
                style={{ x: motionX, rotate, scale: cardScale }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.92, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="h-full bg-white rounded-xl border-2 border-border p-5 shadow-md cursor-grab active:cursor-grabbing relative overflow-y-auto"
              >
                {/* Swipe overlays */}
                <motion.div style={{ opacity: passOpacity }}
                  className="absolute inset-0 rounded-xl bg-red-50/60 border-2 border-red-300 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-4xl font-black text-red-500 rotate-[-12deg] border-4 border-red-500 rounded-xl px-6 py-2 tracking-wider select-none">PASS ✕</span>
                </motion.div>
                <motion.div style={{ opacity: matchOpacity }}
                  className="absolute inset-0 rounded-xl bg-green-50/60 border-2 border-green-300 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-4xl font-black text-green-500 rotate-[12deg] border-4 border-green-500 rounded-xl px-6 py-2 tracking-wider select-none">MATCH ♥</span>
                </motion.div>

                <div className="flex flex-col gap-4">
                  {/* Header */}
                  <div className="pb-3 border-b border-border">
                    <h2 className="text-2xl font-bold text-foreground">{currentImporter.buyer_id}</h2>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${geoColor(currentImporter.geo_label)}`}>
                        {currentImporter.geo_label || "NEUTRAL"}
                      </span>
                      {currentImporter.algorithm && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          {currentImporter.cf_weight && currentImporter.cf_weight > 0
                            ? `SVD ${Math.round(currentImporter.cf_weight * 100)}% + Content`
                            : "Content-Based"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* All fields always shown — Bug fix: was conditional on confidence */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Match Score</p>
                      <p className="text-2xl font-bold text-primary">{currentImporter.match_score.toFixed(1)}%</p>
                    </div>
                    {currentImporter.confidence !== undefined && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Confidence</p>
                        <p className="text-xl font-semibold text-amber-600">{currentImporter.confidence.toFixed(1)}%</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Industry</p>
                      <p className="text-sm font-semibold text-foreground">{currentImporter.industry || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Location</p>
                      <p className="text-sm font-semibold text-foreground">{currentImporter.country || "—"}</p>
                    </div>
                  </div>

                  {/* Gemini button */}
                  <div className="border-t border-border pt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); analyzeMatch(); setShowAnalysisMobile(true); }}
                      disabled={analysisLoading}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {analysisLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      {analysisLoading ? "Analyzing…" : "Analyze with Gemini"}
                    </button>
                  </div>

                  {/* Mobile analysis panel (shown inline on small screens) */}
                  {(analysisResult || analysisLoading) && (
                    <div className="md:hidden border border-border rounded-xl p-4 bg-slate-50">
                      {analysisLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="animate-spin" size={16} /> Analyzing…
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm flex items-center gap-1">
                              <Sparkles size={14} className="text-amber-500" /> Gemini Analysis
                            </span>
                            <button onClick={() => setAnalysisResult(null)} className="text-muted-foreground hover:text-foreground">
                              <X size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{analysisResult}</p>
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-center text-xs text-muted-foreground">← Swipe left to pass · Swipe right to match →</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 py-4 border-t border-border space-y-3">
          <div className="flex items-center justify-center gap-3">
            <button onClick={goBack} disabled={currentIndex === 0}
              className="p-3 rounded-full bg-secondary text-secondary-foreground hover:bg-muted transition-colors font-semibold text-lg disabled:opacity-40">
              ←
            </button>
            <button onClick={() => triggerExit("left")} disabled={isLoading || !currentImporter}
              className="flex-1 p-3 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              <X size={20} /> Pass
            </button>
            <button onClick={() => triggerExit("right")} disabled={isLoading || !currentImporter}
              className="flex-1 p-3 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              <Heart size={20} fill="currentColor" /> Match
            </button>
          </div>
          {matchedIds.size > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-sm font-semibold text-primary">
                {matchedIds.size} match{matchedIds.size !== 1 ? "es" : ""} saved
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Gemini analysis overlay */}
      {(analysisResult || analysisLoading) && (
        <div className="absolute top-1/2 -translate-y-1/2 left-[400px] w-[500px] max-h-[85vh] bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-border z-20 hidden md:flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Sparkles size={18} className="text-amber-500" /> Gemini Analysis
            </div>
            <button onClick={() => setAnalysisResult(null)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            {analysisLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="font-medium animate-pulse">Gemini is analyzing this match…</span>
              </div>
            ) : (
              <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{analysisResult}</p>
            )}
          </div>
        </div>
      )}

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 cursor-pointer" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Success toast */}
      {connectSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-green-50 border border-green-200 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 size={20} className="text-green-600" />
          <p className="text-green-700 font-medium text-sm">{connectSuccess} added to your Export Matches!</p>
        </div>
      )}
    </div>
  );
}
