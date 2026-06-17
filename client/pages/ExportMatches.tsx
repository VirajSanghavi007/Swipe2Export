import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Loader2, AlertCircle, X, Linkedin, Phone, Mail, CheckCircle2, MapPin } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface Match {
  buyer_id: string;
  match_score: number;
  confidence?: number;
  geo_label?: string;
  industry?: string;
  country?: string;
}

interface ContactInfo {
  linkedin: string;
  phone: string;
  contactEmail: string;
}

export default function ExportMatches() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectModal, setConnectModal] = useState<{ open: boolean; buyerId: string | null }>({ open: false, buyerId: null });
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  // Check authentication
  const currentUserJson = localStorage.getItem("currentUser");
  if (!currentUserJson) {
    navigate("/login");
    return null;
  }

  const currentUser = JSON.parse(currentUserJson);
  const exporterId = currentUser.userId;

  // Get user's contact info
  const contactInfo: ContactInfo = {
    linkedin: currentUser.linkedin || "",
    phone: currentUser.phone || "",
    contactEmail: currentUser.contactEmail || currentUser.email || "",
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["interactions", exporterId],
    queryFn: async () => {
      const response = await api.get(`/api/interactions/${exporterId}`);
      return response.data;
    },
    enabled: !!exporterId,
  });

  const matches: Match[] = data?.matches || [];

  const handleConnectClick = (buyerId: string) => {
    setConnectModal({ open: true, buyerId });
    setConnectSuccess(null);
  };

  const handleConfirmConnect = () => {
    if (connectModal.buyerId) {
      setConnectSuccess(connectModal.buyerId);
      setConnectModal({ open: false, buyerId: null });
      // Auto-dismiss after 3 seconds
      setTimeout(() => setConnectSuccess(null), 3000);
    }
  };

  const hasContact = contactInfo.linkedin || contactInfo.phone || contactInfo.contactEmail;

  return (
    <div className="min-h-screen bg-orange-50 flex">
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

            {/* Success Toast */}

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
                          onClick={() => handleConnectClick(match.buyer_id)}
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

      {/* Connect Modal */}
      {connectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConnectModal({ open: false, buyerId: null })}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-amber-50 to-green-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Connect with {connectModal.buyerId}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Share your contact details</p>
              </div>
              <button
                onClick={() => setConnectModal({ open: false, buyerId: null })}
                className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              {hasContact ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    The following contact details will be shared with this importer so they can reach you:
                  </p>
                  <div className="space-y-3">
                    {contactInfo.linkedin && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Linkedin size={16} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium">LinkedIn</p>
                          <p className="text-sm text-foreground font-medium truncate">{contactInfo.linkedin}</p>
                        </div>
                      </div>
                    )}
                    {contactInfo.phone && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Phone size={16} className="text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium">Phone</p>
                          <p className="text-sm text-foreground font-medium">{contactInfo.phone}</p>
                        </div>
                      </div>
                    )}
                    {contactInfo.contactEmail && (
                      <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Mail size={16} className="text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium">Email</p>
                          <p className="text-sm text-foreground font-medium truncate">{contactInfo.contactEmail}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">
                    You haven't added any contact information yet.
                  </p>
                  <button
                    onClick={() => navigate("/profile")}
                    className="mt-2 text-primary hover:underline text-sm font-medium"
                  >
                    Go to Profile to add contact info →
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setConnectModal({ open: false, buyerId: null })}
                className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              {hasContact && (
                <button
                  onClick={handleConfirmConnect}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-accent transition-colors font-medium text-sm"
                >
                  Confirm & Connect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
