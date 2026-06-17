import os
import pandas as pd
import numpy as np
import json
import joblib
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from feature_engineering import build_features
from ml_weights import discover_pca_weights, SPEC_WEIGHTS

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
IMPORTERS_FILE = os.path.join(BASE_DIR, "importers_cleaned.csv")
EXPORTERS_FILE = os.path.join(BASE_DIR, "exporters_cleaned.csv")

# Feature definition
FEATURE_COLUMNS = [
    "capacity_ratio", "intent_alignment", "engagement_score", "payment_score",
    "tariff_alignment", "currency_alignment", "war_alignment", "natural_alignment", "stock_alignment"
]

RISK_COLUMNS = [
    "tariff_alignment", "currency_alignment", "war_alignment", "natural_alignment", "stock_alignment"
]

def train_model():
    print("Starting historical regression training pipeline...")
    
    # 1. Load Data
    if not os.path.exists(IMPORTERS_FILE) or not os.path.exists(EXPORTERS_FILE):
        print("Historical data files missing.")
        return

    importers = pd.read_csv(IMPORTERS_FILE)
    exporters = pd.read_csv(EXPORTERS_FILE)
    
    print(f"Loaded {len(importers)} importers and {len(exporters)} exporters.")

    # 2. Merge on Industry + Date
    # Note: Using literal 'Date' as requested. Earlier heuristic logic used 'Month'.
    print("Merging datasets on Industry and Date...")
    full_corpus = pd.merge(
        importers, 
        exporters, 
        on=['Industry', 'Date'], 
        suffixes=('_imp', '_exp')
    )
    
    sample_count = len(full_corpus)
    print(f"Number of training samples generated: {sample_count}")
    
    if sample_count == 0:
        print("Failure: No overlap found on Industry + Date. Switching to Month/Year logic as fallback...")
        full_corpus = pd.merge(
            importers, 
            exporters, 
            on=['Industry', 'Month', 'Year'], 
            suffixes=('_imp', '_exp')
        )
        sample_count = len(full_corpus)
        print(f"Retried with Month/Year logic. Samples: {sample_count}")

    if sample_count == 0:
        print("Error: No training data could be generated.")
        return

    # 3. Build Features
    print("Building alignment features for the corpus...")
    # Map back to column names expected by build_features
    # Importers: Avg_Order_Tons, Intent_Score, Engagement_Spike, Good_Payment_History, Tariff_News, Currency_Fluctuation, War_Event, Natural_Calamity, StockMarket_Shock (approx)
    # The merged DF has suffixes. We need to create subsets that look like the original DFs.
    features_df = build_features(
        full_corpus.rename(columns=lambda x: x.replace('_imp', '')),
        full_corpus.rename(columns=lambda x: x.replace('_exp', ''))
    )

    # 4. Generate Target (Distilled Heuristic Score)
    print("Generating training labels (Distilled Heuristic Scores)...")
    try:
        pca_weights = discover_pca_weights(features_df)
        weights = pca_weights if pca_weights is not None else np.array([SPEC_WEIGHTS[c] for c in FEATURE_COLUMNS])
    except:
        weights = np.array([SPEC_WEIGHTS[c] for c in FEATURE_COLUMNS])

    X_raw = features_df[FEATURE_COLUMNS].values
    raw_scores = X_raw @ weights
    # Logic from backend.py: score = (raw ** 1.8) * 100
    y = np.clip(raw_scores, 0, 1) ** 1.8 * 100

    # 5. Fit Scalers
    print("Fitting scalers...")
    feature_scaler = StandardScaler()
    feature_scaler.fit(features_df[FEATURE_COLUMNS])
    
    risk_scaler = StandardScaler()
    risk_scaler.fit(features_df[RISK_COLUMNS])
    
    # 6. Fit Linear Regression
    print("Training LinearRegression model on the historical corpus...")
    X_train = feature_scaler.transform(features_df[FEATURE_COLUMNS])
    
    model = LinearRegression()
    model.fit(X_train, y)
    
    # 7. Save Artifacts
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    
    joblib.dump(model, os.path.join(ARTIFACTS_DIR, "model.pkl"))
    joblib.dump(feature_scaler, os.path.join(ARTIFACTS_DIR, "feature_scaler.pkl"))
    joblib.dump(risk_scaler, os.path.join(ARTIFACTS_DIR, "risk_scaler.pkl"))
    
    with open(os.path.join(ARTIFACTS_DIR, "features.json"), "w") as f:
        json.dump({
            "all_features": FEATURE_COLUMNS,
            "risk_features": RISK_COLUMNS,
            "sample_count": sample_count
        }, f)
        
    print(f"Training complete. Artifacts saved to {ARTIFACTS_DIR}")
    print(f"Final training sample size: {sample_count}")

if __name__ == "__main__":
    train_model()
