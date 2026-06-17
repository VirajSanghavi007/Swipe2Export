import numpy as np
import os
import json
from sklearn.decomposition import PCA

FEATURE_COLUMNS = [
    "capacity_ratio",
    "intent_alignment",
    "engagement_score",
    "payment_score",
    "tariff_alignment",
    "currency_alignment",
    "war_alignment",
    "natural_alignment",
    "stock_alignment",
]

SPEC_WEIGHTS = np.array([
    0.45, 0.10, 0.08, 0.07, 0.07, 0.06, 0.06, 0.06, 0.05
])
SPEC_WEIGHTS = SPEC_WEIGHTS / SPEC_WEIGHTS.sum()

BAYESIAN_STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "bayesian_weights.json")
EPSILON = 1e-4

def discover_pca_weights(feature_df):
    X = feature_df[FEATURE_COLUMNS].values
    n_features = X.shape[1]
    if X.shape[0] < 10 or (np.var(X, axis=0) < 1e-8).all():
        return SPEC_WEIGHTS.copy()
    pca = PCA(n_components=1)
    pca.fit(X)
    abs_loadings = np.abs(pca.components_[0])
    if abs_loadings.sum() < 1e-10:
        return SPEC_WEIGHTS.copy()
    pca_weights = abs_loadings / abs_loadings.sum()
    uniform_weights = np.ones(n_features) / n_features
    final_weights = 0.85 * pca_weights + 0.15 * uniform_weights
    return final_weights / final_weights.sum()


def load_bayesian_state(exporter_id):
    if not os.path.exists(BAYESIAN_STATE_FILE):
        return SPEC_WEIGHTS * 100.0
    try:
        with open(BAYESIAN_STATE_FILE, 'r') as f:
            full_state = json.load(f)
            return np.array(full_state.get(exporter_id, SPEC_WEIGHTS * 100.0))
    except (json.JSONDecodeError, IOError):
        return SPEC_WEIGHTS * 100.0

def save_bayesian_state(exporter_id, alpha_prior):
    os.makedirs(os.path.dirname(BAYESIAN_STATE_FILE), exist_ok=True)
    full_state = {}
    if os.path.exists(BAYESIAN_STATE_FILE):
        try:
            with open(BAYESIAN_STATE_FILE, 'r') as f:
                full_state = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    full_state[exporter_id] = np.maximum(alpha_prior, EPSILON).tolist()
    with open(BAYESIAN_STATE_FILE, 'w') as f:
        json.dump(full_state, f)

def adapt_weights_bayesian(exporter_id, feature_vector, outcome):
    alpha_prior = load_bayesian_state(exporter_id)
    f_vec = np.array(feature_vector)
    if outcome == 1:
        alpha_prior += f_vec
    else:
        alpha_prior -= 0.1 * f_vec
    alpha_prior = np.maximum(alpha_prior, EPSILON)
    save_bayesian_state(exporter_id, alpha_prior)
    return alpha_prior / alpha_prior.sum() if alpha_prior.sum() > 0 else SPEC_WEIGHTS.copy()
