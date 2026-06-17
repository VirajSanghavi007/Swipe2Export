import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function MarketIntelligence() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newsData, setNewsData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    if (!localStorage.getItem("currentUser")) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/news")
      .then(response => response.json())
      .then(data => {
        setNewsData(data.results || []);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching news:', error);
        setIsLoading(false);
      });
  }, []);

  if (!localStorage.getItem("currentUser")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-secondary rounded-lg text-foreground"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Market Intelligence</h1>
          <div />
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* News Items */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : newsData && newsData.length > 0 ? (
                newsData.map((item: any, index: number) => (
                  <article
                    key={item.article_id || index}
                    className="bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {item.category && item.category[0] && (
                            <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded capitalize">
                              {item.category[0]}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.pubDate).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {item.title}
                        </h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block text-primary hover:text-accent font-medium text-sm"
                      >
                        Read More →
                      </a>
                    )}
                  </article>
                ))
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  No news available at the moment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
