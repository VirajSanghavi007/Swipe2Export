# Swipe2Export — Deployment Guide

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+

### Quick Start (Windows)
```
double-click start-dev.bat
```
Or manually:
```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
npm install
npm run dev
```
Open http://localhost:8080

---

## Render Deployment

### One-click Blueprint Deploy

1. Push this repo to GitHub
2. Go to https://dashboard.render.com → **New** → **Blueprint**
3. Connect your GitHub repo — Render auto-detects `render.yaml`
4. Set environment variables in the Render dashboard:
   - **`GEMINI_API_KEY`** — your Google Gemini API key
   - **`NEWS_API_KEY`** — your newsdata.io key (optional, has fallback)
5. Click **Apply** — both services deploy automatically

### Services Created
| Service | Type | URL |
|---------|------|-----|
| `swipe2export-api` | Web (Python) | `https://swipe2export-api.onrender.com` |
| `swipe2export-frontend` | Static Site | `https://swipe2export-frontend.onrender.com` |

### Getting a Gemini API Key
1. Go to https://aistudio.google.com/apikey
2. Create a new key
3. Paste it as `GEMINI_API_KEY` in Render dashboard

---

## Architecture

```
React SPA (Vite)
     │  /api/* proxy (dev) / direct URL (prod)
     ▼
FastAPI (Python 8000)
  ├── /api/auth/*          — JWT auth, bcrypt passwords, SQLite
  ├── /api/hybrid-matches  — Hybrid SVD + Content-Based Recommender
  ├── /api/feedback        — Records swipes, updates recommender live
  ├── /api/interactions    — Saved connections
  ├── /api/stats           — Real dashboard stats from swipe history
  ├── /api/xai/analyze     — Gemini AI explanation
  └── /api/news            — Market intelligence news feed
```

## Recommendation System

The engine is a **Hybrid SVD + Content-Based** recommender — the same class of algorithm used by Netflix and Spotify:

1. **Content-Based** (cold start, new users): Encodes each importer as a feature vector and scores them by cosine similarity to the exporter's industry profile.

2. **Collaborative Filtering via SVD** (warm users, ≥3 swipes): Builds a sparse exporter×importer rating matrix from all historical swipes (connect=+1, pass=-0.3), factorises it with truncated SVD to learn latent preference factors, then predicts scores for unseen pairs.

3. **Hybrid blend**:
   ```
   alpha = min(1.0, user_swipes / 10)
   score = (1 - alpha) × content_score + alpha × CF_score
   ```
   Alpha grows from 0 → 1 as the user accumulates swipe history, solving cold-start automatically.

4. **Geo multiplier** applied last: FTA partner countries get +12%, tension zone countries get -12%.
