import os
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

NEWS_API_KEY = os.getenv("NEWS_API_KEY", "pub_bda12e9c8d4b4a06b9b7afff87b16d84")
NEWS_API_URL = "https://newsdata.io/api/1/latest"

# Curated fallback articles shown if the API is unavailable
FALLBACK_ARTICLES = [
    {
        "title": "Global Trade Growth Forecast Upgraded to 3.5% for 2025",
        "description": "WTO revises upward global merchandise trade volume forecast citing robust demand in Asia and recovering European markets.",
        "link": "https://www.wto.org/english/news_e/news25_e/trdev_14apr25_e.htm",
        "pubDate": "2025-04-14",
        "category": ["business"],
        "source_name": "WTO",
    },
    {
        "title": "India Exports Cross $800 Billion Milestone in FY 2024-25",
        "description": "India's merchandise and services exports hit a record high, driven by electronics, pharmaceuticals, and engineering goods.",
        "link": "https://www.commerce.gov.in/",
        "pubDate": "2025-03-31",
        "category": ["business"],
        "source_name": "Ministry of Commerce",
    },
    {
        "title": "ASEAN-India FTA Upgrade Talks Gain Momentum",
        "description": "Trade ministers meet in Jakarta to fast-track the ASEAN-India FTA upgrade, potentially lowering tariffs on 90% of goods.",
        "link": "https://asean.org/",
        "pubDate": "2025-05-02",
        "category": ["politics"],
        "source_name": "ASEAN Secretariat",
    },
    {
        "title": "Red Sea Disruptions Push Container Rates Up 40%",
        "description": "Ongoing shipping diversions around the Cape of Good Hope continue to inflate freight costs for Asia-Europe trade lanes.",
        "link": "https://www.freightos.com/",
        "pubDate": "2025-04-20",
        "category": ["business"],
        "source_name": "Freightos",
    },
    {
        "title": "New Carbon Border Adjustment Mechanism Enters Second Phase",
        "description": "The EU's CBAM now covers steel, aluminium, cement, fertilisers, and electricity — exporters must register emissions data.",
        "link": "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en",
        "pubDate": "2025-02-01",
        "category": ["environment"],
        "source_name": "European Commission",
    },
    {
        "title": "Vietnam Emerges as Top Alternative Sourcing Hub",
        "description": "US and European importers diversify supply chains to Vietnam, with FDI in manufacturing up 28% year-on-year.",
        "link": "https://www.vietnam.vn/en/",
        "pubDate": "2025-04-10",
        "category": ["business"],
        "source_name": "Vietnam Investment Review",
    },
]


@router.get("/news")
async def get_news():
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                NEWS_API_URL,
                params={"apikey": NEWS_API_KEY, "language": "en", "q": "trade export import"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        # Graceful fallback — never error the client just because news is unavailable
        return {"status": "ok", "results": FALLBACK_ARTICLES, "source": "fallback"}
