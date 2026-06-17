import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, LogOut, User } from "lucide-react";

interface UserData {
  role: "exporter" | "importer";
  userId: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      setUserData(JSON.parse(currentUser));
    }
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  if (!userData) {
    return null;
  }

  const isExporter = userData.role === "exporter";

  const menuItems = [
    { label: "Dashboard", href: "/dashboard" },
    ...(isExporter
      ? [
        { label: "Explore Importers", href: "/explore-importers" },
        { label: "Export List Matches", href: "/export-matches" },
      ]
      : []),
    { label: "Market Intelligence", href: "/market-intelligence" },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:sticky lg:top-0 w-64 h-screen bg-white border-r border-border flex flex-col transition-all duration-300 ease-in-out z-50 ${isOpen ? "translate-x-0 lg:ml-0" : "-translate-x-full lg:translate-x-0 lg:-ml-64"
          }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary">Swipe2Export</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg text-foreground transition-colors"
            title="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Trade ID
          </p>
          <p className="font-semibold text-foreground truncate">
            {userData.userId}
          </p>
          <p className="text-xs text-muted-foreground capitalize mt-1">
            {userData.role} mode
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className="block px-4 py-3 rounded-lg text-foreground hover:bg-secondary/50 transition-colors font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer Menu */}
        <div className="border-t border-border p-6 space-y-2">
          <Link
            to="/profile"
            className="flex items-center px-4 py-3 rounded-lg text-foreground hover:bg-secondary/50 transition-colors font-medium"
            onClick={onClose}
          >
            <User size={18} className="mr-3" />
            View Profile
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut size={18} className="mr-3" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
