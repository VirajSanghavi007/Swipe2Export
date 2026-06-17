import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Users, TrendingUp, ArrowUpRight, Lightbulb } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface UserData {
  userId: string;
  name: string;
  role: "exporter" | "importer";
  industry: string;
  country?: string;
}

interface Match {
  buyer_id: string;
  match_score: number;
  confidence?: number;
  geo_label?: string;
  industry?: string;
  country?: string;
}

// Weekly bar graph data — Exporter vs Importer
const EXPORTER_WEEKLY = [
  { day: "Sun", value: 820 },
  { day: "Mon", value: 1540 },
  { day: "Tue", value: 3874 },
  { day: "Wed", value: 710 },
  { day: "Thu", value: 1920 },
  { day: "Fri", value: 1350 },
  { day: "Sat", value: 2680 },
];

const IMPORTER_WEEKLY = [
  { day: "Sun", value: 640 },
  { day: "Mon", value: 1120 },
  { day: "Tue", value: 2950 },
  { day: "Wed", value: 890 },
  { day: "Thu", value: 1640 },
  { day: "Fri", value: 1180 },
  { day: "Sat", value: 2210 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUserStr = localStorage.getItem("currentUser");
      if (!currentUserStr) {
        navigate("/login");
        return;
      }
      const parsedUser = JSON.parse(currentUserStr);
      try {
        const response = await axios.get(`/api/auth/me/${parsedUser.userId}`);
        setUserData(response.data);
      } catch (err) {
        console.error("Failed to fetch user data", err);
        navigate("/login");
      }
    };
    fetchUserData();
  }, [navigate]);

  const updateRole = async (newRole: "exporter" | "importer") => {
    if (!userData) return;
    try {
      const response = await axios.put("/api/auth/update", {
        userId: userData.userId,
        role: newRole
      });
      // Update local state to reflect DB changes
      setUserData(response.data.user);
      localStorage.setItem("currentUser", JSON.stringify(response.data.user));
    } catch (err) {
      console.error("Failed to update role", err);
    }
  };

  const { data: interactionsData, isLoading: isLoadingInteractions } = useQuery({
    queryKey: ["interactions", userData?.userId],
    queryFn: async () => {
      const response = await axios.get(`/api/interactions/${userData?.userId}`);
      return response.data;
    },
    enabled: !!userData?.userId && userData?.role === "exporter",
  });

  if (!userData) {
    return null;
  }

  const isExporter = userData.role === "exporter";
  const weeklyData = isExporter ? EXPORTER_WEEKLY : IMPORTER_WEEKLY;
  const totalActivity = weeklyData.reduce((sum, d) => sum + d.value, 0);

  const recentMatches: Match[] = (interactionsData?.matches || []).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-secondary rounded-lg text-foreground"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          </div>

          {/* Role Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex bg-secondary/50 rounded-lg p-1">
              <button
                onClick={() => updateRole("exporter")}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${userData.role === "exporter"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Exporter
              </button>
              <button
                onClick={() => updateRole("importer")}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${userData.role === "importer"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Importer
              </button>
            </div>
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-sm border border-border">
              {userData.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground mb-1">
              Welcome back, {userData.name}!
            </h2>
            <p className="text-muted-foreground">
              {isExporter
                ? "Manage your exports and find importers"
                : "Manage your imports and connect with exporters"}
            </p>
          </div>

          {/* Main Grid: Left (bar graph + enquiries) | Right (stats + tips) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── LEFT COLUMN (2/3 width) ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bar Graph Card */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center">
                      <Users size={16} className="text-muted-foreground" />
                    </div>
                    <span className="font-semibold text-foreground">
                      {isExporter ? "Export Activity" : "Import Activity"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-secondary/40 px-3 py-1 rounded-full">
                    Weekly
                  </span>
                </div>

                {/* Summary */}
                <div className="mb-4">
                  <p className="text-3xl font-bold text-foreground">
                    {totalActivity.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      8.3% <ArrowUpRight size={12} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      + 749 increased
                    </span>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={weeklyData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E5E7EB"
                      />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#9CA3AF" }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#9CA3AF" }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 10,
                          border: "1px solid #E5E7EB",
                          fontSize: 13,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#4472C4"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#4472C4", stroke: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: "#4472C4", stroke: "#fff", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Enquiries */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {isExporter ? "Recent Matches" : "Recent Enquiries"}
                </h3>
                <div className="space-y-3">
                  {!isExporter ? (
                    // Hardcoded data for importers
                    [
                      { name: "Agroline Exports Pvt Ltd", industry: "Agriculture", country: "India", score: 87.4, status: "Active" },
                      { name: "Taizhou Metals Co.", industry: "Metals & Minerals", country: "China", score: 74.1, status: "Pending" },
                      { name: "NovaTex Industries", industry: "Textiles", country: "Turkey", score: 91.2, status: "Active" },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-secondary/20 rounded-xl border border-border/50 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {item.name}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {item.industry} • {item.country} • Score: {item.score}%
                            </p>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${item.status === "Active"
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-100 text-amber-700"
                            }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : isLoadingInteractions ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">Loading recent matches...</p>
                    </div>
                  ) : recentMatches.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-border rounded-xl bg-secondary/10">
                      <p className="text-sm text-muted-foreground mb-2">No recent matches found.</p>
                      <button
                        onClick={() => navigate("/explore-importers")}
                        className="text-primary text-sm font-semibold hover:underline"
                      >
                        Explore Importers →
                      </button>
                    </div>
                  ) : (
                    recentMatches.map((match) => (
                      <div
                        key={match.buyer_id}
                        className="p-4 bg-secondary/20 rounded-xl border border-border/50 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {match.buyer_id}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {match.industry || "General Trade"} • Score: {match.match_score.toFixed(1)}%
                            </p>
                          </div>
                          <button
                            onClick={() => navigate("/export-matches")}
                            className="text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1 rounded-full font-medium transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN (1/3 width) ── */}
            <div className="space-y-6">
              {/* 2×2 Stat Cards */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  title={isExporter ? "Total Exports" : "Total Imports"}
                  value="24"
                  subtitle="This year"
                  bg="#F0E6D6"
                />
                <StatCard
                  title="Avg Order"
                  value="45"
                  subtitle="Tons"
                  bg="#F0E6D6"
                />
                <StatCard
                  title={isExporter ? "Pending Exports" : "Pending Imports"}
                  value="8"
                  subtitle={isExporter ? "Importers" : "Exporters"}
                  bg="#F0E6D6"
                />
                <StatCard
                  title="Payment Status"
                  value="100%"
                  subtitle="On time"
                  bg="#F0E6D6"
                />
              </div>

              {/* Quick Tips */}
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={18} className="text-primary" />
                  <h3 className="text-lg font-semibold text-primary">
                    Quick Tips
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {isExporter
                      ? "Complete your profile to increase match quality"
                      : "Update your preferences to get better matches"}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {isExporter
                      ? "Add product photos to attract more importers"
                      : "Respond to enquiries within 24 hours for best results"}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {isExporter
                      ? "Explore market intelligence for trending products"
                      : "Check market intelligence for pricing insights"}
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

/* ── Stat Card ── */
function StatCard({
  title,
  value,
  subtitle,
  bg,
}: {
  title: string;
  value: string;
  subtitle: string;
  bg?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[120px]"
      style={{ backgroundColor: bg || "#ffffff" }}
    >
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        {title}
      </p>
      <div>
        <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
