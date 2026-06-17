import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Loader2, AlertCircle, X, Mail, Phone, MessageSquare } from "lucide-react";
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

// Generate deterministic contact info from buyer ID
function getContactInfo(buyerId: string) {
  const num = parseInt(buyerId.replace(/\D/g, "")) || 0;
  const modes = ["Email", "Phone", "WhatsApp"] as const;
  const preferred = modes[num % 3];
  const domains = ["trade.com", "importex.io", "globalbuyers.net", "commerce.org"];
  const domain = domains[num % domains.length];
  const countryCodes = ["+1", "+44", "+91", "+86", "+81", "+49", "+33"];
  const code = countryCodes[num % countryCodes.length];

  return {
    email: `${buyerId.toLowerCase()}@${domain}`,
    phone: `${code} ${String(1000000000 + (num * 7919) % 9000000000).slice(0, 10)}`,
    whatsapp: `${code} ${String(1000000000 + (num * 7919) % 9000000000).slice(0, 10)}`,
    preferred,
  };
}

export default function ExportMatches() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Check authentication
  const currentUserJson = localStorage.getItem("currentUser");
  if (!currentUserJson) {
    navigate("/login");
    return null;
  }

  const currentUser = JSON.parse(currentUserJson);
  const exporterId = currentUser.userId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["interactions", exporterId],
    queryFn: async () => {
      const response = await axios.get(`/api/interactions/${exporterId}`);
      return response.data;
    },
    enabled: !!exporterId,
  });

  const matches: Match[] = data?.matches || [];

  const contactInfo = selectedContact ? getContactInfo(selectedContact) : null;

  return (
    <div className="min-h-screen bg-[#F0E6D6] flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-secondary rounded-lg text-foreground"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Recent Interactions</h1>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-muted-foreground mb-6">
              List of all verified importers you have recently matched and connected with.
            </p>

            <div className="space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="animate-spin mb-4" size={32} />
                  <p>Loading your past interactions...</p>
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive bg-destructive/5 rounded-lg border border-destructive/20">
                  <AlertCircle className="mb-4" size={32} />
                  <p>Failed to load matches. Please ensure the ML service is running.</p>
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-border">
                  <p className="text-muted-foreground">No matches found for your current profile.</p>
                </div>
              ) : (
                matches.map((match) => (
                  <div
                    key={match.buyer_id}
                    className="bg-white rounded-lg border border-border p-6 hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-foreground">
                            {match.buyer_id}
                          </h3>
                          {match.geo_label && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${match.geo_label === 'FTA_PARTNER' || match.geo_label === 'FTA_BONUS'
                              ? 'bg-green-100 text-green-700'
                              : match.geo_label === 'TENSION_ZONE'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                              }`}>
                              {match.geo_label}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-2">
                          <p className="text-sm text-muted-foreground">
                            Score: <span className="text-primary font-medium">{match.match_score.toFixed(1)}%</span>
                          </p>
                          {match.confidence !== undefined && (
                            <p className="text-sm text-muted-foreground">
                              Confidence: <span className="text-amber-600 font-medium">{match.confidence.toFixed(1)}%</span>
                            </p>
                          )}
                          {match.industry && (
                            <p className="text-sm text-muted-foreground">
                              Industry: <span className="text-primary font-medium">{match.industry}</span>
                            </p>
                          )}
                          {match.country && (
                            <p className="text-sm text-muted-foreground">
                              Country: <span className="text-primary font-medium">{match.country}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedContact(match.buyer_id)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info Modal */}
      {selectedContact && contactInfo && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setSelectedContact(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-primary/5">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedContact}</h3>
                <p className="text-sm text-muted-foreground">Contact Information</p>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Preferred Mode Badge */}
            <div className="px-6 pt-4 pb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                ★ Preferred: {contactInfo.preferred}
              </div>
            </div>

            {/* Contact Options */}
            <div className="px-6 pb-6 space-y-3">
              {/* Email */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${contactInfo.preferred === "Email" ? "border-primary bg-primary/5" : "border-border"
                }`}>
                <div className={`p-2 rounded-lg ${contactInfo.preferred === "Email" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                  <Mail size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Email</p>
                  <p className="text-sm font-semibold text-foreground">{contactInfo.email}</p>
                </div>
                {contactInfo.preferred === "Email" && (
                  <span className="text-[10px] font-bold text-primary uppercase">Preferred</span>
                )}
              </div>

              {/* Phone */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${contactInfo.preferred === "Phone" ? "border-primary bg-primary/5" : "border-border"
                }`}>
                <div className={`p-2 rounded-lg ${contactInfo.preferred === "Phone" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                  <Phone size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Phone</p>
                  <p className="text-sm font-semibold text-foreground">{contactInfo.phone}</p>
                </div>
                {contactInfo.preferred === "Phone" && (
                  <span className="text-[10px] font-bold text-primary uppercase">Preferred</span>
                )}
              </div>

              {/* WhatsApp */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${contactInfo.preferred === "WhatsApp" ? "border-primary bg-primary/5" : "border-border"
                }`}>
                <div className={`p-2 rounded-lg ${contactInfo.preferred === "WhatsApp" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                  <MessageSquare size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">WhatsApp</p>
                  <p className="text-sm font-semibold text-foreground">{contactInfo.whatsapp}</p>
                </div>
                {contactInfo.preferred === "WhatsApp" && (
                  <span className="text-[10px] font-bold text-primary uppercase">Preferred</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
