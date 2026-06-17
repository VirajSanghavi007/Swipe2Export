from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiosqlite
from database import DB_PATH
from ml.recommender import recommender

router = APIRouter()


class FeedbackRequest(BaseModel):
    exporter_id: str
    buyer_id: str
    action: str  # "connect" | "pass"
    matchDetails: dict | None = None


async def _get_exporter_industry(exporter_id: str) -> str:
    """Look up the exporter's industry from the DB (registered users) or CSV."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        row = await db.execute("SELECT industry FROM users WHERE user_id = ?", (exporter_id,))
        user = await row.fetchone()
    if user and user["industry"]:
        return user["industry"]
    # Fallback: CSV
    exp_row = recommender.get_exporter_row(exporter_id)
    if exp_row is not None:
        return str(exp_row.get("Industry", ""))
    return ""


@router.get("/hybrid-matches/{exporter_id}")
async def hybrid_matches(exporter_id: str, top_n: int = 25):
    """
    Hybrid SVD + content-based recommendations.
    Automatically blends collaborative filtering (when interaction history exists)
    with content-based similarity (cold-start fallback).
    """
    industry = await _get_exporter_industry(exporter_id)
    if not industry:
        raise HTTPException(status_code=404, detail=f"Exporter {exporter_id} not found")

    exp_row = recommender.get_exporter_row(exporter_id)
    matches = recommender.recommend(exporter_id, industry, exp_row, top_n=top_n)

    if not matches:
        return {"model": "hybrid", "matches": []}

    return {"model": "hybrid", "matches": matches}


# Keep these routes for backward-compat with the existing frontend
@router.get("/pca-matches/{exporter_id}")
async def pca_matches(exporter_id: str):
    return await hybrid_matches(exporter_id)


@router.get("/regression-matches/{exporter_id}")
async def regression_matches(exporter_id: str):
    return await hybrid_matches(exporter_id)


@router.post("/feedback")
async def feedback(body: FeedbackRequest):
    if body.action not in ("connect", "pass"):
        raise HTTPException(status_code=422, detail="action must be 'connect' or 'pass'")

    # Update in-memory recommender (immediate effect on next recommendation)
    recommender.record_interaction(body.exporter_id, body.buyer_id, body.action)

    # Persist to DB — upsert so a later "connect" can overwrite an earlier "pass"
    async with aiosqlite.connect(DB_PATH) as db:
        details = body.matchDetails or {}
        await db.execute(
            """INSERT INTO interactions
               (exporter_id, buyer_id, action, match_score, confidence, geo_label, industry, country)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(exporter_id, buyer_id) DO UPDATE SET
               action=excluded.action, match_score=excluded.match_score,
               confidence=excluded.confidence, geo_label=excluded.geo_label,
               industry=excluded.industry, country=excluded.country""",
            (
                body.exporter_id, body.buyer_id, body.action,
                details.get("match_score"), details.get("confidence"),
                details.get("geo_label"), details.get("industry"), details.get("country"),
            ),
        )
        await db.commit()

    return {"status": "ok"}


@router.get("/interactions/{exporter_id}")
async def get_interactions(exporter_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        rows = await db.execute(
            """SELECT * FROM interactions
               WHERE exporter_id = ? AND action = 'connect'
               ORDER BY created_at DESC""",
            (exporter_id,),
        )
        interactions = await rows.fetchall()

    matches = [
        {
            "buyer_id": r["buyer_id"],
            "match_score": r["match_score"] or 0,
            "confidence": r["confidence"] or 0,
            "geo_label": r["geo_label"] or "",
            "industry": r["industry"] or "",
            "country": r["country"] or "",
        }
        for r in interactions
    ]
    return {"matches": matches}


@router.get("/stats/{exporter_id}")
async def get_stats(exporter_id: str):
    """Dashboard stats derived from real interaction data."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        total = await db.execute(
            "SELECT COUNT(*) as c FROM interactions WHERE exporter_id = ? AND action = 'connect'",
            (exporter_id,),
        )
        total_matches = (await total.fetchone())["c"]

        avg_row = await db.execute(
            "SELECT AVG(match_score) as avg FROM interactions WHERE exporter_id = ? AND action = 'connect'",
            (exporter_id,),
        )
        avg_score = (await avg_row.fetchone())["avg"] or 0

        pending = await db.execute(
            "SELECT COUNT(*) as c FROM interactions WHERE exporter_id = ?",
            (exporter_id,),
        )
        total_reviewed = (await pending.fetchone())["c"]

        # Swipe activity over last 7 days (one row per day)
        daily = await db.execute(
            """SELECT date(created_at) as day, COUNT(*) as swipes
               FROM interactions WHERE exporter_id = ?
               GROUP BY date(created_at)
               ORDER BY day DESC LIMIT 7""",
            (exporter_id,),
        )
        daily_rows = await daily.fetchall()

    return {
        "total_matches": total_matches,
        "avg_match_score": round(avg_score, 1),
        "total_reviewed": total_reviewed,
        "pass_count": total_reviewed - total_matches,
        "daily_activity": [{"day": r["day"], "swipes": r["swipes"]} for r in reversed(daily_rows)],
    }
