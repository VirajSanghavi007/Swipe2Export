import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import MinMaxScaler
from ml_weights import FEATURE_COLUMNS, SPEC_WEIGHTS, discover_pca_weights, load_bayesian_state
from feature_engineering import build_features
from geo import get_geo_multiplier

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMPORTERS_FILE = os.path.join(BASE_DIR, "importers_cleaned.csv")
EXPORTERS_FILE = os.path.join(BASE_DIR, "exporters_cleaned.csv")

_cached_importers = None
_cached_exporters = None

def _get_data():
    global _cached_importers, _cached_exporters
    if _cached_importers is None or _cached_exporters is None:
        if not os.path.exists(IMPORTERS_FILE) or not os.path.exists(EXPORTERS_FILE):
            return pd.DataFrame(), pd.DataFrame()
        _cached_importers = pd.read_csv(IMPORTERS_FILE)
        _cached_exporters = pd.read_csv(EXPORTERS_FILE)
    return _cached_importers, _cached_exporters

def _get_exporter_row(exporter_id, exporter_df, importer_df):
    exp_matches = exporter_df[exporter_df['Exporter_ID'] == exporter_id]
    if not exp_matches.empty:
        return exp_matches.iloc[0]
    
    import json
    users_path = os.path.join(BASE_DIR, "users.json")
    if os.path.exists(users_path):
        try:
            with open(users_path, "r") as f:
                users = json.load(f)
            for u in users:
                if u.get("userId") == exporter_id:
                    month = importer_df['Date'].iloc[0] if not importer_df.empty else "2024-01-01"
                    synth_data = {
                        "Exporter_ID": exporter_id,
                        "Industry": u.get("industry", "Other").title(),
                        "Date": month,
                        "Quantity_Tons": np.random.randint(2000, 8000),
                        "Intent_Score": np.random.uniform(0.5, 1.0),
                        "Tariff_Impact": np.random.uniform(0, 0.4),
                        "Currency_Shift": np.random.uniform(-0.3, 0.3),
                        "War_Risk": np.random.randint(0, 4),
                        "Natural_Calamity_Risk": np.random.randint(0, 4),
                        "StockMarket_Impact": np.random.uniform(0, 0.4)
                    }
                    return pd.Series(synth_data)
        except Exception as e:
            import traceback
            print(f"Error synthesizing exporter {exporter_id}: {e}")
            traceback.print_exc()
    return None

def get_best_matches(exporter_id, top_n=10):
    importer_df, exporter_df = _get_data()
    if importer_df.empty or exporter_df.empty:
        return pd.DataFrame(), {"error": "Data files missing"}
    
    exporter_row = _get_exporter_row(exporter_id, exporter_df, importer_df)
    if exporter_row is None:
        return pd.DataFrame(), {"error": f"Exporter {exporter_id} not found"}
    candidates = importer_df[
        (importer_df['Industry'] == exporter_row['Industry'])
    ].copy()
    
    if candidates.empty:
        return pd.DataFrame(), {"candidate_pool_size": 0}
    
    exp_broadcast = pd.DataFrame([exporter_row] * len(candidates))
    features_df = build_features(candidates, exp_broadcast)
    
    pca_weights = discover_pca_weights(features_df)
    alpha_prior = load_bayesian_state(exporter_id)
    bayesian_weights = alpha_prior / alpha_prior.sum() if alpha_prior.sum() > 0 else SPEC_WEIGHTS.copy()
    
    final_weights = 0.5 * pca_weights + 0.5 * bayesian_weights
    final_weights /= final_weights.sum()
    
    X = features_df[FEATURE_COLUMNS].values
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)
    
    raw_scores = X_scaled @ final_weights
    adjusted_scores = raw_scores ** 1.8
    
    candidates['compatibility_score'] = adjusted_scores
    ranks = candidates['compatibility_score'].rank(method='average')
    candidates['Match_Score_Raw'] = (ranks / len(candidates)) * 100
    
    geo_res = candidates['Country'].apply(get_geo_multiplier)
    candidates['geo_multiplier'] = geo_res.apply(lambda x: x[0])
    candidates['geo_label'] = geo_res.apply(lambda x: x[1])
    candidates['Match_Score'] = (candidates['Match_Score_Raw'] * candidates['geo_multiplier']).clip(0, 100)
    
    mean_score = candidates['compatibility_score'].mean()
    std_score = candidates['compatibility_score'].std()
    z_scores = (candidates['compatibility_score'] - mean_score) / std_score if std_score > 0 else candidates['compatibility_score'] * 0.0
    abs_z = np.abs(z_scores)
    max_abs_z = abs_z.max()
    z_norm = abs_z / max_abs_z if max_abs_z > 0 else abs_z * 0.0
    
    row_vars = np.var(X_scaled, axis=1)
    max_row_var = row_vars.max()
    stability = 1.0 - (row_vars / max_row_var) if max_row_var > 0 else row_vars * 0.0 + 1.0
    
    candidates['Confidence'] = (0.6 * z_norm + 0.4 * stability) * 100
    candidates['_feature_vector'] = list(X_scaled)
    
    top_matches = candidates.sort_values('Match_Score', ascending=False).head(top_n)
    
    diagnostics = {
        "candidate_pool_size": len(candidates),
        "pca_weights": pca_weights.tolist(),
        "bayesian_weights": bayesian_weights.tolist(),
        "final_weights": final_weights.tolist()
    }
    
    return top_matches, diagnostics

def get_pair_features(exporter_id, buyer_id):
    importer_df, exporter_df = _get_data()
    exporter_row = _get_exporter_row(exporter_id, exporter_df, importer_df)
    if exporter_row is None:
        return None
    
    buyer_matches = importer_df[importer_df['Buyer_ID'] == buyer_id]
    if buyer_matches.empty:
        return None
        
    buyer_row = buyer_matches.iloc[0]
    
    # Check if they are compatible for feature engineering (same industry/month usually required for candidates)
    # But even if not, we can build the vector for adaptation
    features_df = build_features(pd.DataFrame([buyer_row]), pd.DataFrame([exporter_row]))
    
    # We need the scaler to get the normalized feature vector as used in get_best_matches
    # However, get_best_matches uses fit_transform on the candidate pool.
    # To be consistent, we should use the same pool-based scaling if possible, 
    # but for individual feedback, we'll use a snapshot or re-run the pool.
    # For now, let's re-run the pool logic to get the same scaling as the user saw.
    
    candidates = importer_df[
        (importer_df['Industry'] == exporter_row['Industry'])
    ].copy()
    
    if candidates.empty or buyer_id not in candidates['Buyer_ID'].values:
        return None
        
    exp_broadcast = pd.DataFrame([exporter_row] * len(candidates))
    pool_features = build_features(candidates, exp_broadcast)
    
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(pool_features[FEATURE_COLUMNS].values)
    
    buyer_idx = candidates[candidates['Buyer_ID'] == buyer_id].index[0]
    # find the position in candidates to get corresponding X_scaled row
    pos = candidates.index.get_loc(buyer_idx)
    
    return X_scaled[pos]
