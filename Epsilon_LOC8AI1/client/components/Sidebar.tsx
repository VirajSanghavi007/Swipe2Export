import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  X,
  LogOut,
  User,
  LayoutDashboard,
  Globe,
  ListChecks,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

interface UserData {
  role: "exporter" | "importer";
  userId: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
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

  const menuItems: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ...(isExporter
      ? [
        { label: "Explore Importers", href: "/explore-importers", icon: Globe },
        { label: "Export List Matches", href: "/export-matches", icon: ListChecks },
      ]
      : []),
    { label: "Market Intelligence", href: "/market-intelligence", icon: BarChart3 },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative w-64 h-screen flex flex-col transition-all duration-300 ease-in-out z-50 ${isOpen
            ? "translate-x-0 lg:ml-0"
            : "-translate-x-full lg:translate-x-0 lg:-ml-64"
          }`}
        style={{
          background: "hsl(var(--sidebar-background))",
          borderRight: "1px solid hsl(var(--sidebar-border))",
          color: "hsl(var(--sidebar-foreground))",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "hsl(var(--sidebar-primary))" }}
            >
              S2E
            </div>
            <h2
              className="text-lg font-bold tracking-tight"
              style={{ color: "hsl(var(--sidebar-primary))" }}
            >
              Swipe2Export
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:opacity-80"
            style={{ color: "hsl(var(--sidebar-foreground))" }}
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Info */}
        <div
          className="px-5 py-4"
          style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
        >
          <p className="text-[10px] uppercase tracking-widest font-semibold opacity-50 mb-1">
            Trade ID
          </p>
          <p className="font-semibold text-sm truncate">{userData.userId}</p>
          <span
            className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: "hsl(var(--sidebar-primary) / 0.15)",
              color: "hsl(var(--sidebar-primary))",
            }}
          >
            {userData.role} mode
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] uppercase tracking-widest font-semibold opacity-50">
            Menu
          </p>
          {menuItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={
                  active
                    ? {
                      background: "hsl(var(--sidebar-primary))",
                      color: "hsl(var(--sidebar-primary-foreground))",
                      boxShadow: "0 1px 3px hsl(var(--sidebar-primary) / 0.3)",
                    }
                    : {
                      color: "hsl(var(--sidebar-foreground))",
                    }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background =
                      "hsl(var(--sidebar-accent))";
                    e.currentTarget.style.color =
                      "hsl(var(--sidebar-accent-foreground))";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color =
                      "hsl(var(--sidebar-foreground))";
                  }
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Menu */}
        <div
          className="px-3 py-4 space-y-1"
          style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
        >
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            onClick={onClose}
            style={
              isActive("/profile")
                ? {
                  background: "hsl(var(--sidebar-primary))",
                  color: "hsl(var(--sidebar-primary-foreground))",
                  boxShadow: "0 1px 3px hsl(var(--sidebar-primary) / 0.3)",
                }
                : {
                  color: "hsl(var(--sidebar-foreground))",
                }
            }
            onMouseEnter={(e) => {
              if (!isActive("/profile")) {
                e.currentTarget.style.background =
                  "hsl(var(--sidebar-accent))";
                e.currentTarget.style.color =
                  "hsl(var(--sidebar-accent-foreground))";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/profile")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color =
                  "hsl(var(--sidebar-foreground))";
              }
            }}
          >
            <User size={18} />
            View Profile
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ color: "hsl(0 84.2% 60.2%)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "hsl(0 84.2% 60.2% / 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

