import axios from "axios";

// In production FastAPI serves the frontend from the same origin,
// so all /api/* calls go to the same server — no base URL needed.
// In dev, Vite proxies /api/* to localhost:8000 (see vite.config.ts).
const api = axios.create();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
