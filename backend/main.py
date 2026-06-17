import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import aiosqlite

from database import init_db, DB_PATH
from ml.recommender import recommender
from routes.auth import router as auth_router
from routes.matches import router as matches_router
from routes.xai import router as xai_router
from routes.news import router as news_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise SQLite schema
    await init_db()

    # Load CSV data and seed interaction history into the recommender
    recommender.load_data()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        rows = await db.execute("SELECT exporter_id, buyer_id, action FROM interactions")
        interactions = await rows.fetchall()
    recommender.seed_interactions([dict(r) for r in interactions])
    print(f"Seeded recommender with {len(interactions)} historical interactions")

    yield


app = FastAPI(title="Swipe2Export API", version="2.0.0", lifespan=lifespan)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
