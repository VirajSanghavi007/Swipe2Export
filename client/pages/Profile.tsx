import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Linkedin, Phone, Mail, X, Pencil, Check, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/api";

interface UserData {
  userId: string;
  name: string;
  email: string;
  role: "exporter" | "importer";
  industry: string;
  country?: string;
  buyerId?: string;
  linkedin?: string;
  phone?: string;
  contactEmail?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    industry: "",
    linkedin: "",
    phone: "",
    contactEmail: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUserStr = localStorage.getItem("currentUser");
      if (!currentUserStr) {
        navigate("/login");
        return;
      }
      const parsedUser = JSON.parse(currentUserStr);
      try {
        const response = await api.get(`/api/auth/me/${parsedUser.userId}`);
        setUserData(response.data);
      } catch (err) {
        console.error("Failed to fetch user data", err);
        navigate("/login");
      }
    };
    fetchUserData();
  }, [navigate]);

  const openEditModal = () => {
    if (!userData) return;
    setEditForm({
      name: userData.name || "",
      industry: userData.industry || "",
      linkedin: userData.linkedin || "",
      phone: userData.phone || "",
      contactEmail: userData.contactEmail || userData.email || "",
    });
    setSaveSuccess(false);
    setEditOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!userData) return;
    setSaving(true);
    try {
      const response = await api.put("/api/auth/update", {
        userId: userData.userId,
        ...editForm,
      });
      const updatedUser = response.data.user;
      setUserData(updatedUser);

      // Sync localStorage so other pages pick up the changes
      const currentUserStr = localStorage.getItem("currentUser");
      if (currentUserStr) {
        const current = JSON.parse(currentUserStr);
        localStorage.setItem("currentUser", JSON.stringify({ ...current, ...updatedUser }));
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setEditOpen(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to update profile", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!userData) {
    return null;
  }

  const isExporter = userData.role === "exporter";

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F2E8D9' }}>
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
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg border border-border p-8">
              {/* Profile Header — horizontal */}
              <div className="mb-8 pb-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-primary">
                      {userData.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {userData.name}
                    </h2>
                    <p className="text-muted-foreground capitalize">
                      {userData.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={openEditModal}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent transition-colors font-semibold flex items-center gap-2"
                >
                  <Pencil size={16} />
                  Edit Profile
                </button>
              </div>

              {/* Profile Information — 2-column grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 pb-6 border-b border-border">
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

                <div>
                  <label className="block text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Role
                  </label>
                  <p className="text-foreground font-semibold capitalize">
                    {userData.role}
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
              </div>

              {/* Contact Information — horizontal cards */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Linkedin size={18} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">LinkedIn</p>
                      {userData.linkedin ? (
                        <a href={userData.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline truncate block">
                          {userData.linkedin}
                        </a>
                      ) : (
                        <p className="text-muted-foreground text-sm italic">Not provided</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone size={18} className="text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</p>
                      {userData.phone ? (
                        <p className="text-foreground font-medium">{userData.phone}</p>
                      ) : (
                        <p className="text-muted-foreground text-sm italic">Not provided</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                    <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail size={18} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Email</p>
                      <p className="text-foreground font-medium truncate">
                        {userData.contactEmail || userData.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-amber-50 to-green-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil size={18} className="text-primary" />
                <h3 className="text-lg font-bold text-foreground">Edit Profile</h3>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Success State */}
            {saveSuccess ? (
              <div className="px-6 py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <Check size={28} className="text-green-600" />
                </div>
                <p className="text-foreground font-semibold text-lg">Profile Updated!</p>
              </div>
            ) : (
              <>
                {/* Form */}
                <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Industry</label>
                    <select
                      name="industry"
                      value={editForm.industry}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                    >
                      <option value="">Select an industry</option>
                      <option value="agriculture">Agriculture</option>
                      <option value="textiles">Textiles</option>
                      <option value="metals">Metals & Minerals</option>
                      <option value="chemicals">Chemicals</option>
                      <option value="machinery">Machinery</option>
                      <option value="electronics">Electronics</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="pt-2 pb-1 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">LinkedIn URL</label>
                    <input
                      type="url"
                      name="linkedin"
                      value={editForm.linkedin}
                      onChange={handleEditChange}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditChange}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Contact Email</label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={editForm.contactEmail}
                      onChange={handleEditChange}
                      placeholder="business@example.com"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-gray-50 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setEditOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-accent transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

