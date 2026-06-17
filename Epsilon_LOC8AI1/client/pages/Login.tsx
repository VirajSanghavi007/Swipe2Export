import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both Email and Password");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      // Login successful
      localStorage.setItem(`user_${data.user.userId}`, JSON.stringify(data.user));
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: "#F0E6D6" }}>
      {/* Truck animation styles */}
      <style>{`
        @keyframes driveTruck {
          0% { transform: translateX(-300px); }
          100% { transform: translateX(calc(100vw + 300px)); }
        }
        @keyframes spinWheel {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes puffSmoke {
          0% { opacity: 0.6; transform: translate(0, 0) scale(1); }
          50% { opacity: 0.3; transform: translate(-20px, -15px) scale(1.5); }
          100% { opacity: 0; transform: translate(-40px, -30px) scale(2); }
        }
        @keyframes roadDash {
          0% { transform: translateX(0); }
          100% { transform: translateX(-40px); }
        }
        .truck-container {
          position: absolute;
          bottom: 10px;
          left: 0;
          animation: driveTruck 12s linear infinite;
        }
        .truck-body {
          width: 120px;
          height: 50px;
          background: #4A7C2F;
          border-radius: 4px 4px 0 0;
          position: relative;
        }
        .truck-body::before {
          content: 'S2E';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 2px;
        }
        .truck-cabin {
          width: 45px;
          height: 40px;
          background: #3a6325;
          border-radius: 4px 10px 0 0;
          position: absolute;
          right: -45px;
          bottom: 0;
        }
        .truck-cabin::after {
          content: '';
          position: absolute;
          top: 6px;
          right: 6px;
          width: 22px;
          height: 16px;
          background: #a8d8ea;
          border-radius: 2px 6px 2px 2px;
          opacity: 0.8;
        }
        .truck-wheel {
          width: 20px;
          height: 20px;
          background: #333;
          border-radius: 50%;
          position: absolute;
          bottom: -10px;
          border: 3px solid #555;
          animation: spinWheel 0.5s linear infinite;
        }
        .truck-wheel::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: #999;
          border-radius: 50%;
        }
        .wheel-front { right: -35px; }
        .wheel-mid { left: 15px; }
        .wheel-rear { left: 45px; }
        .smoke {
          position: absolute;
          left: -8px;
          bottom: 30px;
          width: 10px;
          height: 10px;
          background: rgba(150, 150, 150, 0.4);
          border-radius: 50%;
          animation: puffSmoke 1s ease-out infinite;
        }
        .smoke:nth-child(2) { animation-delay: 0.3s; bottom: 35px; left: -5px; }
        .smoke:nth-child(3) { animation-delay: 0.6s; bottom: 25px; left: -10px; }
        .road-line {
          position: absolute;
          bottom: 0px;
          left: 0;
          width: 200vw;
          height: 2px;
          background: repeating-linear-gradient(
            90deg,
            #c4a882 0px,
            #c4a882 20px,
            transparent 20px,
            transparent 40px
          );
          animation: roadDash 0.4s linear infinite;
        }
      `}</style>

      {/* Road */}
      <div className="road-line" />

      {/* Truck */}
      <div className="truck-container">
        <div className="smoke" />
        <div className="smoke" />
        <div className="smoke" />
        <div className="truck-body">
          <div className="truck-cabin" />
          <div className="truck-wheel wheel-mid" />
          <div className="truck-wheel wheel-rear" />
          <div className="truck-wheel wheel-front" />
        </div>
      </div>

      <Link
        to="/"
        className="absolute top-8 left-8 text-primary hover:text-accent transition-colors font-semibold z-10"
      >
        ← Back
      </Link>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-lg shadow-sm border border-border p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">Swipe2Export</h1>
            <p className="text-muted-foreground mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:text-accent font-semibold">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
