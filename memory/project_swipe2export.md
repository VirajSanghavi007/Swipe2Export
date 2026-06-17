---
name: project-swipe2export
description: Architecture, tech decisions and key file locations for the Swipe2Export project
metadata:
  type: project
---

Swipe2Export is a B2B trade matchmaking platform (Tinder-like swipe UI for importers/exporters).

**Why:** Connecting global trade partners with ML-driven recommendations.

**Architecture (post-rewrite, June 2026):**
- Frontend: React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + React Leaflet
- Backend: FastAPI Python (single service, port 8000) — replaced Express+Python split
- DB: SQLite via aiosqlite (file: `backend/swipe2export.db`)
- Auth: JWT (python-jose) + bcrypt (passlib)
- ML: Hybrid SVD + Content-Based recommender in `backend/ml/recommender.py`
- Data: CSVs in `server/` (importers_cleaned.csv, exporters_cleaned.csv)
- Deployment: Render blueprint via `render.yaml`

**How to apply:** When making changes, the backend is in `backend/`, frontend in `client/`. The old `server/` Express code is dead — do not edit it. Auth token stored as `token` in localStorage.

**Key env vars:** GEMINI_API_KEY, JWT_SECRET, DATA_DIR (defaults to server/ subfolder), DB_PATH
