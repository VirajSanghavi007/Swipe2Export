import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env from same directory as this file (works regardless of cwd)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import aiosqlite

from database import init_db, DB_PATH
from ml.recommender import recommender
from routes.auth import router as auth_router
from routes.matches import router as matches_router
from routes.xai import router as xai_router
from routes.news import router as news_router

# Absolute path to the built React SPA
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
SPA_DIR = os.path.join(_PROJECT_ROOT, "dist", "spa")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    recommender.load_data()
    # Seed the in-memory recommender with all historical interactions
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        rows = await db.execute("SELECT exporter_id, buyer_id, action FROM interactions")
        interactions = await rows.fetchall()
    recommender.seed_interactions([dict(r) for r in interactions])
    print(f"Seeded recommender with {len(interactions)} historical interactions")
    print(f"SPA directory: {SPA_DIR} (exists: {os.path.exists(SPA_DIR)})")
    yield


app = FastAPI(title="Swipe2Export API", version="2.0.0", lifespan=lifespan)

# CORS — in production FastAPI serves the frontend directly (same origin),
# so this only matters for local dev where frontend runs on :8080 and API on :8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes — registered first so they take priority
app.include_router(auth_router, prefix="/api/auth")
app.include_router(matches_router, prefix="/api")
app.include_router(xai_router, prefix="/api/xai")
app.include_router(news_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "importers_loaded": len(recommender.importers),
        "exporters_loaded": len(recommender.exporters),
    }


# Serve static assets (JS/CSS chunks) if the SPA has been built
if os.path.exists(os.path.join(SPA_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(SPA_DIR, "assets")), name="assets")


# Catch-all: serve React index.html for every non-API route
# This enables React Router (client-side routing) to work on Render
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index = os.path.join(SPA_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    # During local dev the SPA isn't built yet — give a helpful message
    return {"message": "API is running. Build the frontend with 'npm run build:client' to serve the UI here."}
