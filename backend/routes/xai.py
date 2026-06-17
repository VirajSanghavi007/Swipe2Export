import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiosqlite
from database import DB_PATH

router = APIRouter()

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

SYSTEM_PROMPT = (
    "Your task is to evaluate a trade match score and give a brief, friendly analysis of "
    "why this importer was recommended to this exporter. Explain in layman terms — assume "
    "the reader understands import/export business but not machine learning. "
    "Mention the key factors: industry alignment, geographic trade relationship, risk profile, "
    "and payment history. Use 3–4 short paragraphs. No bullet points. No markdown headers."
)


class AnalyzeRequest(BaseModel):
    exporter_id: str
    matchDetails: dict


@router.post("/analyze")
async def analyze(body: AnalyzeRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI analysis is not configured (missing GEMINI_API_KEY)")

    # Fetch exporter profile from DB
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        row = await db.execute("SELECT * FROM users WHERE user_id = ?", (body.exporter_id,))
        user = await row.fetchone()

    exporter_ctx = (
        f"Exporter ID: {body.exporter_id}\n"
        f"Industry: {user['industry'] if user else 'Unknown'}\n"
        f"Name: {user['name'] if user else 'Unknown'}"
    )

    m = body.matchDetails
    importer_ctx = (
        f"Importer ID: {m.get('buyer_id', '')}\n"
        f"Industry: {m.get('industry', '')}\n"
        f"Country: {m.get('country', '')}\n"
        f"Match Score: {m.get('match_score', '')}%\n"
        f"Confidence: {m.get('confidence', '')}%\n"
        f"Geo Status: {m.get('geo_label', '')}\n"
        f"Algorithm: {m.get('algorithm', 'hybrid-svd')} (CF weight: {m.get('cf_weight', 0)})"
    )

    user_prompt = (
        f"Exporter profile:\n{exporter_ctx}\n\n"
        f"Recommended importer:\n{importer_ctx}\n\n"
        f"Explain why this match was recommended and what the scores mean."
    )

    payload = {
        "system_instruction": {"parts": {"text": SYSTEM_PROMPT}},
        "contents": [{"parts": [{"text": user_prompt}]}],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(f"{GEMINI_API_URL}?key={api_key}", json=payload)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            detail = e.response.json().get("error", {}).get("message", str(e))
            raise HTTPException(status_code=502, detail=f"Gemini API error: {detail}")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to reach Gemini: {str(e)}")

    data = resp.json()
    try:
        explanation = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Unexpected response from Gemini API")

    return {"explanation": explanation}
