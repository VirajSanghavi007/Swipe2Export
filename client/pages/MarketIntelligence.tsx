import { useNavigate } from "react-router-dom";
import { Menu, Newspaper, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface NewsItem {
  article_id?: string;
  title: string;
  description?: string;
  link?: string;
  pubDate?: string;
  category?: string[];
  source_name?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  business: "bg-blue-100 text-blue-700",
  politics: "bg-purple-100 text-purple-700",
  environment: "bg-green-100 text-green-700",
  technology: "bg-cyan-100 text-cyan-700",
  economy: "bg-amber-100 text-amber-700",
};

export default function MarketIntelligence() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) { navigate("/login"); return null; }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["news"],
    queryFn: async () => (await api.get("/api/news")).data,
    staleTime: 1000 * 60 * 10,
  });

  const articles: NewsItem[] = data?.results || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-border px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-secondary rounded-lg">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Newspaper size={22} className="text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Market Intelligence</h1>
          </div>
          {data?.source === "fallback" && (
            <span className="ml-auto text-xs text-muted-foreground bg-amber-50 border border-amber-200 px-2 py-1 rounded">
              Showing curated articles (live feed unavailable)
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
                <Loader2 className="animate-spin" size={24} />
                <span>Loading market intelligence…</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <AlertTriangle size={32} className="text-amber-500" />
                <p className="font-semibold text-foreground">Failed to load news</p>
                <p className="text-sm">Check your connection and try again.</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">No articles available.</div>
            ) : (
              articles.map((item, idx) => {
                const cat = item.category?.[0]?.toLowerCase() || "business";
                const colorClass = CATEGORY_COLORS[cat] || "bg-slate-100 text-slate-700";
                return (
                  <article key={item.article_id || idx}
                    className="bg-white rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${colorClass}`}>
                        {cat}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {item.source_name && <span className="font-medium">{item.source_name} · </span>}
                        {item.pubDate && new Date(item.pubDate).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2 leading-snug">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    )}
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-primary hover:text-accent font-medium text-sm">
                        Read more <ExternalLink size={13} />
                      </a>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 cursor-pointer" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
