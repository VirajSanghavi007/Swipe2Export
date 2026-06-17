import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Users, TrendingUp, ArrowUpRight, Lightbulb, BarChart2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

interface UserData {
  userId: string;
  name: string;
  role: "exporter" | "importer";
  industry: string;
}

interface Match {
  buyer_id: string;
  match_score: number;
  confidence?: number;
  geo_label?: string;
  industry?: string;
  country?: string;
}

interface Stats {
  total_matches: number;
  avg_match_score: number;
  total_reviewed: number;
  pass_count: number;
  daily_activity: { day: string; swipes: number }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (!stored) { navigate("/login"); return; }
    const parsed = JSON.parse(stored);
    api.get(`/api/auth/me/${parsed.userId}`)
      .then((r) => setUserData(r.data))
      .catch(() => navigate("/login"));
  }, [navigate]);

  const updateRole = async (newRole: "exporter" | "importer") => {
    if (!userData) return;
    try {
      const { data } = await api.put("/api/auth/update", { userId: userData.userId, role: newRole });
      setUserData(data.user);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
    } catch (err) {
      console.error("Failed to update role", err);
    }
  };

  const { data: statsData, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["stats", userData?.userId],
    queryFn: async () => (await api.get(`/api/stats/${userData!.userId}`)).data,
    enabled: !!userData?.userId && userData?.role === "exporter",
  });

  const { data: interactionsData } = useQuery({
    queryKey: ["interactions", userData?.userId],
    queryFn: async () => (await api.get(`/api/interactions/${userData!.userId}`)).data,
    enabled: !!userData?.userId && userData?.role === "exporter",
  });

  if (!userData) return null;

  const isExporter = userData.role === "exporter";
  const recentMatches: Match[] = (interactionsData?.matches || []).slice(0, 3);

  // Build chart from real swipe activity; fill gaps for last 7 days
  const buildActivityChart = () => {
    if (!statsData?.daily_activity?.length) return [];
    return statsData.daily_activity.map((d) => ({
      day: new Date(d.day).toLocaleDateString("en", { weekday: "short" }),
      swipes: d.swipes,
    }));
  };

  const chartData = buildActivityChart();
  const totalSwipes = statsData?.total_reviewed ?? 0;

  return (
    <div className="min-h-screen flex bg-orange-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-secondary rounded-lg">
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-secondary/50 rounded-lg p-1">
              {(["exporter", "importer"] as const).map((role) => (
                <button key={role} onClick={() => updateRole(role)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors capitalize ${
                    userData.role === role ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {role}
                </button>
              ))}
            </div>
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">
              {userData.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground mb-1">Welcome back, {userData.name}!</h2>
            <p className="text-muted-foreground">
              {isExporter ? `${userData.industry} • Exporter` : "Import Activity Dashboard"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Activity chart */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center">
                      <BarChart2 size={16} className="text-muted-foreground" />
                    </div>
                    <span className="font-semibold text-foreground">Swipe Activity (Last 7 Days)</span>
                  </div>
                </div>

                {statsLoading ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
                ) : chartData.length === 0 ? (
                  <div className="h-52 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <TrendingUp size={32} className="opacity-30" />
                    <p>No activity yet — start swiping to see your chart!</p>
                    <button onClick={() => navigate("/explore-importers")}
                      className="text-primary font-semibold text-sm hover:underline mt-1">
                      Explore Importers →
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-3xl font-bold text-foreground">{totalSwipes}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {statsData?.total_matches} matches <ArrowUpRight size={12} />
                        </span>
                        <span className="text-xs text-muted-foreground">total importers reviewed</span>
                      </div>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} dy={8} />
                          <YAxis hide />
                          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 13 }} />
                          <Bar dataKey="swipes" fill="#000" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>

              {/* Recent matches */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {isExporter ? "Recent Matches" : "Recent Enquiries"}
                </h3>
                <div className="space-y-3">
                  {!isExporter ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Switch to Exporter mode to see matches.</p>
                  ) : recentMatches.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-border rounded-xl bg-secondary/10">
                      <p className="text-sm text-muted-foreground mb-2">No matches yet.</p>
                      <button onClick={() => navigate("/explore-importers")}
                        className="text-primary text-sm font-semibold hover:underline">
                        Explore Importers →
                      </button>
                    </div>
                  ) : (
                    recentMatches.map((m) => (
                      <div key={m.buyer_id} className="p-4 bg-secondary/20 rounded-xl border border-border/50 hover:border-primary/40 transition-colors">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-foreground">{m.buyer_id}</h4>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {m.industry || "Trade"} • {m.country || ""} • Score: {m.match_score?.toFixed(1)}%
                            </p>
                          </div>
                          <button onClick={() => navigate("/export-matches")}
                            className="text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1 rounded-full font-medium transition-colors cursor-pointer">
                            View
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Real stats */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard title="Total Matches" value={String(statsData?.total_matches ?? "—")} subtitle="Connections made" />
                <StatCard title="Avg Score" value={statsData?.avg_match_score ? `${statsData.avg_match_score}%` : "—"} subtitle="Match quality" />
                <StatCard title="Reviewed" value={String(statsData?.total_reviewed ?? "—")} subtitle="Importers seen" />
                <StatCard title="Passed" value={String(statsData?.pass_count ?? "—")} subtitle="Importers skipped" />
              </div>

              {/* Quick tips */}
              <div className="rounded-2xl border border-green-300 p-6 shadow-sm" style={{ backgroundColor: "#E8F0E4" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={18} className="text-primary" />
                  <h3 className="text-lg font-semibold text-primary">Quick Tips</h3>
                </div>
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    The Hybrid SVD model improves as you swipe — more swipes = smarter matches.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    FTA_BONUS importers are in countries with trade agreements — prioritise them.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    Use Gemini analysis to understand exactly why a match was recommended.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[120px]">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{title}</p>
      <div>
        <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
