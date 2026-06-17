import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Heart, X, Loader2, Sparkles } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Match {
  buyer_id: string;
  match_score: number;
  confidence?: number;
  geo_label?: string;
  industry?: string;
  country?: string;
}

export default function ExploreImporters() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [model, setModel] = useState<"pca" | "regression">("pca");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedRight, setSwipedRight] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const currentUserJson = localStorage.getItem("currentUser");
  if (!currentUserJson) {
    navigate("/login");
    return null;
  }
  const currentUser = JSON.parse(currentUserJson);
  const exporterId = currentUser.userId;

  const { data, isLoading } = useQuery({
    queryKey: ["matches", exporterId, model],
    queryFn: async () => {
      const response = await axios.get(`/api/${model}-matches/${exporterId}`);
      return response.data;
    },
    enabled: !!exporterId,
  });

  const matches: Match[] = data?.matches || [];
  const currentImporter = matches[currentIndex];

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);


  const handleMouseDown = (e: React.MouseEvent) => {
    if (swipeDirection) return;
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - dragStart;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    if (dragOffset > 100) {
      triggerSwipe("right");
    } else if (dragOffset < -100) {
      triggerSwipe("left");
    }

    setDragOffset(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (swipeDirection) return;
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - dragStart;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (dragOffset > 50) {
      triggerSwipe("right");
    } else if (dragOffset < -50) {
      triggerSwipe("left");
    }

    setDragOffset(0);
  };

  const sendFeedback = async (action: "connect" | "pass", buyerId: string, matchDetails?: Match) => {
    try {
      await axios.post("/api/feedback", {
        exporter_id: exporterId,
        buyer_id: buyerId,
        action,
        matchDetails,
      });
    } catch (err) {
      console.error("Failed to post feedback:", err);
    }
  };

  const triggerSwipe = (direction: "left" | "right") => {
    if (swipeDirection) return;
    setDragOffset(0);
    setSwipeDirection(direction);

    if (direction === "right" && currentImporter) {
      setSwipedRight([...swipedRight, currentIndex]);
      sendFeedback("connect", currentImporter.buyer_id, currentImporter);
    } else if (direction === "left" && currentImporter) {
      sendFeedback("pass", currentImporter.buyer_id, currentImporter);
    }

    // After fly-off animation completes, move to next card
    setTimeout(() => {
      if (currentIndex < matches.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setAnalysisResult(null);
      }
      setSwipeDirection(null);
    }, 350);
  };

  const handleSwipeRight = () => triggerSwipe("right");
  const handleSwipeLeft = () => triggerSwipe("left");

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSwipedRight(swipedRight.filter((i) => i !== currentIndex - 1));
      setAnalysisResult(null);
    }
  };

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const analyzeMatch = async () => {
    if (!currentImporter) return;
    setAnalysisLoading(true);
    try {
      const response = await axios.post("/api/xai/analyze", {
        exporter_id: exporterId,
        matchDetails: currentImporter
      });
      setAnalysisResult(response.data.explanation);
    } catch (err: any) {
      console.error("Failed to fetch Gemini analysis", err);
      const backendError = err.response?.data?.error || "AI analysis temporarily unavailable.";
      setAnalysisResult(`Error: ${backendError}`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Map projection: simple mercator-like calculation
  const getMapPosition = (lat: number, lng: number) => {
    const mapWidth = 100;
    const mapHeight = 100;
    const x = ((lng + 180) / 360) * mapWidth;
    const y = ((90 - lat) / 180) * mapHeight;
    return { x, y };
  };

  // Default to a generic position if no data (for aesthetics)
  const currentPos = getMapPosition(20.5937, 78.9629);

  // Card transform for swipe animation
  const getCardStyle = () => {
    if (swipeDirection === "right") {
      return {
        transform: "translateX(500px) rotate(15deg)",
        opacity: 0,
        transition: "transform 0.35s ease-out, opacity 0.35s ease-out",
      };
    }
    if (swipeDirection === "left") {
      return {
        transform: "translateX(-500px) rotate(-15deg)",
        opacity: 0,
        transition: "transform 0.35s ease-out, opacity 0.35s ease-out",
      };
    }
    return {
      transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.08}deg)`,
      opacity: 1 - Math.abs(dragOffset) / 400,
      transition: isDragging ? "none" : "transform 0.3s ease, opacity 0.3s ease",
    };
  };

  // Swipe hint color
  const swipeHintColor =
    dragOffset > 30
      ? `rgba(34, 197, 94, ${Math.min(dragOffset / 200, 0.25)})`
      : dragOffset < -30
        ? `rgba(239, 68, 68, ${Math.min(Math.abs(dragOffset) / 200, 0.25)})`
        : "transparent";

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Full-screen Map Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* World Map SVG Background */}
        <svg
          className="w-full h-full"
          viewBox="0 0 960 600"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Ocean background */}
          <rect width="960" height="600" fill="#E0F4FF" />

          {/* Simplified world map - continents */}
          <g fill="#D9CCBE" stroke="#B8A89D" strokeWidth="0.5">
            {/* North America */}
            <path d="M 100 80 L 150 100 L 160 150 L 140 180 L 100 170 Z" />
            {/* South America */}
            <path d="M 120 180 L 150 200 L 160 280 L 130 290 L 110 240 Z" />
            {/* Europe */}
            <path d="M 300 60 L 350 80 L 360 120 L 320 130 L 300 100 Z" />
            {/* Africa */}
            <path d="M 320 130 L 380 120 L 400 220 L 350 280 L 300 250 Z" />
            {/* Asia */}
            <path d="M 380 50 L 550 80 L 600 150 L 580 200 L 450 220 L 380 180 Z" />
            {/* Australia */}
            <path d="M 550 320 L 600 340 L 610 380 L 560 370 Z" />
          </g>

          {/* Grid lines */}
          <g stroke="#E0E0E0" strokeWidth="0.5" opacity="0.3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={`lat-${i}`} x1="0" y1={i * 100} x2="960" y2={i * 100} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <line key={`lng-${i}`} x1={i * 96} y1="0" x2={i * 96} y2="600" />
            ))}
          </g>

          {/* Animated Pin */}
          <g
            className="transition-all duration-700 ease-out"
            style={{
              transform: `translate(${(currentPos.x / 100) * 960}px, ${(currentPos.y / 100) * 600}px)`,
            }}
          >
            <circle cx="0" cy="0" r="30" fill="#6B8E23" opacity="0.2" />
            <circle cx="0" cy="0" r="15" fill="#6B8E23" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="0" cy="0" r="6" fill="#FFFFFF" />
            <path d="M 0 15 L -8 30 L 0 28 L 8 30 Z" fill="#6B8E23" stroke="#FFFFFF" strokeWidth="1" />
          </g>
        </svg>
      </div>

      {/* Left Sidebar - Card Panel */}
      <div className="absolute left-0 top-0 h-screen w-96 bg-gradient-to-br from-amber-50 via-white to-green-50 shadow-2xl z-20 flex flex-col border-r border-border">
        {/* Top Controls */}
        <div className="px-5 py-3 border-b border-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-secondary rounded-lg text-foreground transition-colors"
              title="Open menu"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-base font-bold text-foreground flex-1 text-center">
              {matches.length > 0 ? `${currentIndex + 1} / ${matches.length}` : "0 / 0"}
            </h2>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Model:</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as "pca" | "regression")}
                className="bg-secondary text-foreground text-xs rounded-md border-none focus:ring-2 focus:ring-primary py-1 px-2 cursor-pointer outline-none"
              >
                <option value="pca">PCA</option>
                <option value="regression">Regression</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card Content */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Finding matches with {model}...</p>
          </div>
        ) : !currentImporter ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
            <p className="text-lg font-semibold text-foreground mb-2">No More Matches</p>
            <p>You've reviewed all available importers for this matching profile.</p>
          </div>
        ) : (
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 overflow-hidden px-4 py-3 cursor-grab active:cursor-grabbing select-none"
          >
            <div
              className="h-full rounded-2xl border border-border shadow-lg relative overflow-hidden"
              style={{
                ...getCardStyle(),
                backgroundColor: swipeHintColor === "transparent" ? "#fff" : undefined,
                background: `linear-gradient(135deg, ${swipeHintColor}, #fff 60%)`,
              }}
            >
              {/* Swipe hint labels */}
              {dragOffset > 40 && (
                <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-lg border-2 border-green-500 text-green-500 font-bold text-sm rotate-12">
                  MATCH ♥
                </div>
              )}
              {dragOffset < -40 && (
                <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-lg border-2 border-red-500 text-red-500 font-bold text-sm -rotate-12">
                  PASS ✕
                </div>
              )}

              <div className="h-full flex flex-col p-5">
                {/* Header */}
                <div className="mb-3 pb-3 border-b border-border/60">
                  <h2 className="text-xl font-bold text-foreground">
                    {currentImporter.buyer_id}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${currentImporter.geo_label === 'FTA_PARTNER' || currentImporter.geo_label === 'FTA_BONUS'
                      ? 'bg-green-100 text-green-700'
                      : currentImporter.geo_label === 'TENSION_ZONE'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                      }`}>
                      {currentImporter.geo_label || "Global Partner"}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 flex-1">
                  {/* Match Score - prominent */}
                  <div className="bg-primary/5 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                      Match Score
                    </p>
                    <span className="text-3xl font-extrabold text-primary">
                      {currentImporter.match_score.toFixed(1)}%
                    </span>
                  </div>

                  {currentImporter.confidence !== undefined ? (
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                        Confidence
                      </p>
                      <span className="text-xl font-bold text-amber-600">
                        {currentImporter.confidence.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-secondary/30 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                            Industry
                          </p>
                          <span className="text-sm font-semibold text-foreground">
                            {currentImporter.industry}
                          </span>
                        </div>
                        <div className="bg-secondary/30 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                            Location
                          </p>
                          <span className="text-sm font-semibold text-foreground">
                            {currentImporter.country}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Analyze Button */}
                <div className="pt-3 border-t border-border/60">
                  <button
                    onClick={(e) => { e.stopPropagation(); analyzeMatch(); }}
                    disabled={analysisLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {analysisLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {analysisLoading ? "Analyzing..." : "Analyze with Gemini"}
                  </button>
                </div>

                <p className="text-center text-[11px] text-muted-foreground mt-2">
                  ← Drag to swipe or use buttons below →
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={goBack}
              disabled={currentIndex === 0}
              className="p-2.5 rounded-full bg-secondary text-secondary-foreground hover:bg-muted transition-colors font-semibold disabled:opacity-30"
              title="Go back"
            >
              ←
            </button>
            <button
              onClick={handleSwipeLeft}
              disabled={isLoading || !currentImporter || !!swipeDirection}
              className="flex-1 py-2.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              title="Pass"
            >
              <X size={18} />
              Pass
            </button>
            <button
              onClick={handleSwipeRight}
              disabled={isLoading || !currentImporter || !!swipeDirection}
              className="flex-1 py-2.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              title="Match"
            >
              <Heart size={18} fill="currentColor" />
              Match
            </button>
          </div>

          {/* Matches Summary */}
          {swipedRight.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg py-2 text-center">
              <p className="text-sm font-semibold text-primary">
                {swipedRight.length} match{swipedRight.length !== 1 ? "es" : ""} saved
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gemini Analysis Overlay Panel (Desktop Only) */}
      {(analysisResult || analysisLoading) && (
        <div className="absolute top-1/2 -translate-y-1/2 left-[400px] w-[500px] max-h-[85vh] bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-border z-20 hidden md:flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between shadow-sm relative z-10">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Sparkles size={18} className="text-amber-500" /> Gemini Analysis
            </div>
            <button
              onClick={() => setAnalysisResult(null)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto w-full flex-1 bg-white/50">
            {analysisLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="font-medium animate-pulse">Gemini is analyzing the match profile...</span>
              </div>
            ) : (
              <div className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                {analysisResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar Overlay - Click to close */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 cursor-pointer"
          onClick={() => setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSidebarOpen(false);
          }}
          aria-label="Close sidebar"
        />
      )}

      {/* Floating Close Button (Mobile) */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-6 right-6 p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-50 shadow-lg lg:hidden"
          title="Close sidebar"
        >
          <X size={24} />
        </button>
      )}
    </div>
  );
}
