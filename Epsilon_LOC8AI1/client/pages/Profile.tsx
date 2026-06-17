import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import axios from "axios";

interface UserData {
  userId: string;
  name: string;
  role: "exporter" | "importer";
  industry: string;
  country?: string;
  buyerId?: string;
  preferredCommunication?: string;
}

export default function Profile() {
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

  if (!userData) {
    return null;
  }

  const isExporter = userData.role === "exporter";

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
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <div />
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg border border-border p-8">
              {/* Profile Header */}
              <div className="mb-8 pb-6 border-b border-border">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-primary">
                    {userData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {userData.name}
                </h2>
                <p className="text-muted-foreground capitalize">
                  {userData.role}
                </p>
              </div>

              {/* Profile Information */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {isExporter ? "Exporter ID" : "Buyer ID"}
                  </label>
                  <p className="text-foreground font-semibold">
                    {isExporter ? userData.userId : userData.buyerId}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Industry
                  </label>
                  <p className="text-foreground font-semibold capitalize">
                    {userData.industry}
                  </p>
                </div>

                {userData.country && (
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Country
                    </label>
                    <p className="text-foreground font-semibold">
                      {userData.country}
                    </p>
                  </div>
                )}

                {userData.preferredCommunication && (
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Preferred Communication
                    </label>
                    <p className="text-foreground font-semibold capitalize">
                      {userData.preferredCommunication}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Role
                  </label>
                  <p className="text-foreground font-semibold capitalize">
                    {userData.role}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-border">
                <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent transition-colors font-semibold">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
