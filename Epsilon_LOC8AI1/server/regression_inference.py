import os
import pandas as pd
import numpy as np
import json
import joblib
from feature_engineering import build_features
from backend import _get_exporter_row

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
IMPORTERS_FILE = os.path.join(BASE_DIR, "importers_cleaned.csv")
EXPORTERS_FILE = os.path.join(BASE_DIR, "exporters_cleaned.csv")

# Eager loading of artifacts and data at module startup
try:
    if not os.path.exists(os.path.join(ARTIFACTS_DIR, "model.pkl")):
        raise RuntimeError("Regression artifacts not found. Run training first.")
    
    _model = joblib.load(os.path.join(ARTIFACTS_DIR, "model.pkl"))
    _feature_scaler = joblib.load(os.path.join(ARTIFACTS_DIR, "feature_scaler.pkl"))
    _risk_scaler = joblib.load(os.path.join(ARTIFACTS_DIR, "risk_scaler.pkl"))
    with open(os.path.join(ARTIFACTS_DIR, "features.json"), "r") as f:
        _features_list = json.load(f)["all_features"]
    
    _importers_df = pd.read_csv(IMPORTERS_FILE) if os.path.exists(IMPORTERS_FILE) else pd.DataFrame()
    _exporters_df = pd.read_csv(EXPORTERS_FILE) if os.path.exists(EXPORTERS_FILE) else pd.DataFrame()
except Exception as e:
    if isinstance(e, RuntimeError):
        raise e
    raise RuntimeError(f"Failed to initialize regression inference: {e}")

def get_regression_ranked_importers(exporter_id, top_n=5):
    """
    Main inference function to rank importers using the trained regression model.
    Pure inference: no model fitting happens here.
    """
    if _importers_df.empty or _exporters_df.empty:
        return {"error": "Data files missing or empty"}
    
    # Identify exporter
    exporter_row = _get_exporter_row(exporter_id, _exporters_df, _importers_df)
    if exporter_row is None:
        return {"error": f"Exporter {exporter_id} not found"}
    
    # Filter candidates (using same baseline logic as training: Industry)
    candidates = _importers_df[
        (_importers_df['Industry'] == exporter_row['Industry'])
    ].copy()
    
    if candidates.empty:
        return {
            "exporter_id": exporter_id,
            "matches": [],
            "diagnostics": {
                "candidate_pool_size": 0,
                "message": "No importers found matching industry and month profile."
            }
        }
    
    # Build Features
    exp_broadcast = pd.DataFrame([exporter_row] * len(candidates))
    features_df = build_features(candidates, exp_broadcast)
    
    # Transform and Predict
    X = _feature_scaler.transform(features_df[_features_list])
    preds = _model.predict(X)
    
    # Ensure scores are within 0-100 range
    scores = np.clip(preds, 0, 100)
    
    candidates['regression_score'] = scores
    
    # Prepare Output
    top_matches = candidates.sort_values('regression_score', ascending=False).head(top_n)
    
    output = []
    for _, row in top_matches.iterrows():
        output.append({
            "buyer_id": str(row["Buyer_ID"]),
            "match_score": round(float(row["regression_score"]), 2),
            "industry": str(row["Industry"]),
            "country": str(row["Country"]),
            "status": "ranked"
        })
        
    return {
        "exporter_id": exporter_id,
        "matches": output,
        "diagnostics": {
            "candidate_pool_size": len(candidates),
            "model_type": "LinearRegressionPersistence"
        }
    }

if __name__ == "__main__":
    # Test inference locally
    test_id = "EXP_5094"
    print(f"Running inference for {test_id}...")
    result = get_regression_ranked_importers(test_id)
    print(json.dumps(result, indent=2))
