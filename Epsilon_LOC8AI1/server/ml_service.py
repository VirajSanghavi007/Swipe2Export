import os
import sys
from typing import List, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend import get_best_matches, get_pair_features, _get_data
from ml_weights import adapt_weights_bayesian
from regression_inference import get_regression_ranked_importers

app = FastAPI(title="Trade Matching ML Service")

# 3. Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Load data once at startup
@app.on_event("startup")
async def startup_event():
    _get_data()
    print("ML Service started: Data loaded.")

class MatchResponse(BaseModel):
    buyer_id: str
    match_score: float
    confidence: float
    geo_label: str

class MatchesList(BaseModel):
    matches: List[MatchResponse]

class FeedbackRequest(BaseModel):
    exporter_id: str
    buyer_id: str
    action: Literal["connect", "pass"]

# 4. GET /ml/pca-matches/{exporter_id}
@app.get("/ml/pca-matches/{exporter_id}")
async def get_pca_matches(exporter_id: str):
    print(f"Using PCA adaptive model for exporter {exporter_id}")
    results, diagnostics = get_best_matches(exporter_id, top_n=5)
    
    if "error" in diagnostics:
        raise HTTPException(status_code=404, detail=diagnostics["error"])
        
    if results.empty:
        return {"model": "pca", "matches": []}
        
    matches = []
    for _, row in results.iterrows():
        matches.append({
            "buyer_id": str(row["Buyer_ID"]),
            "match_score": float(row["Match_Score"]),
            "confidence": float(row["Confidence"]),
            "geo_label": str(row["geo_label"])
        })
        
    return {
        "model": "pca",
        "matches": matches
    }

# 5. GET /ml/regression-matches/{exporter_id}
@app.get("/ml/regression-matches/{exporter_id}")
async def get_regression_matches(exporter_id: str):
    """
    Expose regression-based ranking via API.
    """
    print(f"Using static regression model for exporter {exporter_id}")
    result = get_regression_ranked_importers(exporter_id, top_n=5)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
        
    return {
        "model": "regression",
        "matches": result.get("matches", []),
        "diagnostics": result.get("diagnostics", {})
    }

# 6. POST /ml/feedback
@app.post("/ml/feedback")
async def post_feedback(feedback: FeedbackRequest):
    outcome = 1 if feedback.action == "connect" else 0
    
    feature_vector = get_pair_features(feedback.exporter_id, feedback.buyer_id)
    
    if feature_vector is None:
        raise HTTPException(
            status_code=404, 
            detail=f"Pair {feedback.exporter_id}-{feedback.buyer_id} not found in candidate pool"
        )
        
    # Trigger Bayesian update
    adapt_weights_bayesian(feedback.exporter_id, feature_vector, outcome)
    
    return {"status": "updated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
