import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import matchingRoutes from "./routes/matching";
import authRoutes from "./routes/auth";
import newsRoutes from "./routes/news";
import xaiRoutes from "./routes/xai";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.use("/api/auth", authRoutes);

  // External APIs
  app.use("/api/news", newsRoutes);
  app.use("/api/xai", xaiRoutes);

  // Matching and Feedback routes
  app.use("/api", matchingRoutes);

  return app;
}
