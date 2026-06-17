"""
Hybrid Recommendation Engine for Swipe2Export.

Architecture (identical to how Netflix and Spotify approach cold/warm states):
  1. Content-Based Filtering  — always available, used for cold-start users.
     Each importer is encoded as a feature vector derived from their trade profile.
     Exporter preference is either inferred from their industry/profile or built
     from the centroid of importers they previously liked.

  2. Collaborative Filtering via SVD — activated once the exporter has ≥3 swipes.
     We build a sparse exporter×importer rating matrix from all historical
     interactions (connect=+1, pass=-0.3), subtract per-user means, and factorise
     with truncated SVD (same idea as the Netflix Prize winning approach).
     The reconstructed matrix gives predicted ratings for unseen pairs.

  3. Hybrid blend:
       alpha = min(1.0, n_user_interactions / 10)
       score = (1 - alpha) * content_score + alpha * cf_score

     Alpha grows smoothly from 0 (pure content-based) to 1 (pure CF) as the
     user accumulates interaction history, solving the cold-start problem.

  4. Geo multiplier is applied last (FTA bonus / tension penalty).
"""

from __future__ import annotations

import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse.linalg import svds
from scipy.sparse import csr_matrix

from ml.geo import get_geo_multiplier

# Resolve paths relative to this file so they never depend on cwd
_ML_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_ML_DIR)
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)

# Auto-detect data directory: prefer data/, fall back to server/ (legacy layout)
def _find_data_dir() -> str:
    # 1. Explicit env var (must be absolute or resolvable from project root)
    env = os.getenv("DATA_DIR")
    if env:
        p = env if os.path.isabs(env) else os.path.join(_PROJECT_ROOT, env)
        if os.path.exists(os.path.join(p, "importers_cleaned.csv")):
            return p
    # 2. data/ at project root
    p = os.path.join(_PROJECT_ROOT, "data")
    if os.path.exists(os.path.join(p, "importers_cleaned.csv")):
        return p
    # 3. server/ at project root (original layout)
    p = os.path.join(_PROJECT_ROOT, "server")
    if os.path.exists(os.path.join(p, "importers_cleaned.csv")):
        return p
    return os.path.join(_PROJECT_ROOT, "data")  # will raise a clear error on load


NUMERIC_FEATURES = [
    'Tariff_News', 'Currency_Fluctuation', 'War_Event',
    'Natural_Calamity', 'StockMarket_Shock',
    'Intent_Score', 'Avg_Order_Tons',
    'Engagement_Spike', 'Good_Payment_History',
]

N_FACTORS = 20  # latent SVD dimensions


class HybridRecommender:
    def __init__(self):
        self.importers: pd.DataFrame = pd.DataFrame()
        self.exporters: pd.DataFrame = pd.DataFrame()
        self._interactions: dict[str, dict[str, float]] = {}
        self._scaler = MinMaxScaler()
        self._importer_features: np.ndarray | None = None
        self._importer_ids: list[str] = []

    # ------------------------------------------------------------------ #
    #  Data loading                                                         #
    # ------------------------------------------------------------------ #

    def load_data(self):
        data_dir = _find_data_dir()
        imp_path = os.path.join(data_dir, "importers_cleaned.csv")
        exp_path = os.path.join(data_dir, "exporters_cleaned.csv")
        if not os.path.exists(imp_path):
            raise FileNotFoundError(
                f"importers_cleaned.csv not found in {data_dir}. "
                "Set DATA_DIR env var to the folder containing the CSV files."
            )
        self.importers = pd.read_csv(imp_path)
        self.exporters = pd.read_csv(exp_path)
        self._build_importer_matrix()
        print(f"Recommender loaded: {len(self.importers)} importers, {len(self.exporters)} exporters from {data_dir}")

    def _build_importer_matrix(self):
        available = [c for c in NUMERIC_FEATURES if c in self.importers.columns]
        X = self.importers[available].fillna(0).values.astype(float)
        self._importer_features = self._scaler.fit_transform(X)
        self._importer_ids = self.importers['Buyer_ID'].tolist()

    # ------------------------------------------------------------------ #
    #  Interaction management                                               #
    # ------------------------------------------------------------------ #

    def record_interaction(self, exporter_id: str, buyer_id: str, action: str):
        rating = 1.0 if action == "connect" else -0.3
        self._interactions.setdefault(exporter_id, {})[buyer_id] = rating

    def seed_interactions(self, rows: list[dict]):
        for r in rows:
            self.record_interaction(r["exporter_id"], r["buyer_id"], r["action"])

    # ------------------------------------------------------------------ #
    #  Content-based scoring                                                #
    # ------------------------------------------------------------------ #

    def _content_scores(self, exporter_id: str, exporter_row: pd.Series | None,
                        candidate_indices: np.ndarray) -> np.ndarray:
        liked_ids = {bid for bid, r in self._interactions.get(exporter_id, {}).items() if r > 0}

        if liked_ids:
            liked_idx = [i for i, bid in enumerate(self._importer_ids) if bid in liked_ids]
            pref_vec = (self._importer_features[liked_idx].mean(axis=0, keepdims=True)
                        if liked_idx else self._cold_start_pref(exporter_row))
        else:
            pref_vec = self._cold_start_pref(exporter_row)

        sims = cosine_similarity(pref_vec, self._importer_features[candidate_indices])[0]
        mn, mx = sims.min(), sims.max()
        return (sims - mn) / (mx - mn + 1e-9)

    def _cold_start_pref(self, exporter_row: pd.Series | None) -> np.ndarray:
        available = [c for c in NUMERIC_FEATURES if c in self.importers.columns]
        col_map = {
            'Tariff_News': 'Tariff_Impact', 'Currency_Fluctuation': 'Currency_Shift',
            'War_Event': 'War_Risk', 'Natural_Calamity': 'Natural_Calamity_Risk',
            'StockMarket_Shock': 'StockMarket_Impact', 'Intent_Score': 'Intent_Score',
            'Avg_Order_Tons': 'Quantity_Tons', 'Engagement_Spike': 'Intent_Score',
            'Good_Payment_History': 'Intent_Score',
        }
        vec = np.zeros(len(available), dtype=float)
        if exporter_row is not None:
            for i, imp_col in enumerate(available):
                exp_col = col_map.get(imp_col, imp_col)
                if exp_col in exporter_row.index:
                    vec[i] = float(exporter_row[exp_col])
        return self._scaler.transform([vec])

    # ------------------------------------------------------------------ #
    #  Collaborative filtering (SVD)                                        #
    # ------------------------------------------------------------------ #

    def _cf_scores(self, exporter_id: str, candidate_indices: np.ndarray) -> np.ndarray | None:
        all_exp_ids = list(self._interactions.keys())
        if len(all_exp_ids) < 2:
            return None

        n_exp = len(all_exp_ids)
        n_imp = len(self._importer_ids)
        exp_idx = {eid: i for i, eid in enumerate(all_exp_ids)}
        imp_idx = {bid: j for j, bid in enumerate(self._importer_ids)}

        rows_i, cols_j, vals = [], [], []
        for eid, ratings in self._interactions.items():
            ei = exp_idx[eid]
            for bid, r in ratings.items():
                ji = imp_idx.get(bid)
                if ji is not None:
                    rows_i.append(ei)
                    cols_j.append(ji)
                    vals.append(r)

        if not vals:
            return None

        R = csr_matrix((vals, (rows_i, cols_j)), shape=(n_exp, n_imp), dtype=float)
        R_dense = R.toarray()

        user_means = np.zeros(n_exp)
        for ei in range(n_exp):
            rated = R_dense[ei] != 0
            if rated.any():
                user_means[ei] = R_dense[ei][rated].mean()

        R_norm = R_dense.copy()
        for ei in range(n_exp):
            mask = R_dense[ei] != 0
            R_norm[ei][mask] -= user_means[ei]

        k = min(N_FACTORS, n_exp - 1, n_imp - 1)
        if k < 1:
            return None

        try:
            U, sigma, Vt = svds(csr_matrix(R_norm), k=k)
        except Exception:
            return None

        R_pred = U @ np.diag(sigma) @ Vt + user_means[:, np.newaxis]

        target_ei = exp_idx.get(exporter_id)
        pred_row = R_pred[target_ei] if target_ei is not None else R_pred.mean(axis=0)

        candidate_scores = pred_row[candidate_indices]
        mn, mx = candidate_scores.min(), candidate_scores.max()
        return (candidate_scores - mn) / (mx - mn + 1e-9)

    # ------------------------------------------------------------------ #
    #  Main recommendation entry point                                      #
    # ------------------------------------------------------------------ #

    def recommend(
        self,
        exporter_id: str,
        industry: str,
        exporter_row: pd.Series | None = None,
        top_n: int = 25,
    ) -> list[dict]:
        if self.importers.empty:
            return []

        # Bug fix: case-insensitive industry match (user signs up "electronics", CSV has "Electronics")
        mask = self.importers['Industry'].str.lower() == industry.lower()
        candidate_indices = np.where(mask.values)[0]

        if len(candidate_indices) == 0:
            # Fallback: all importers (no industry match found in CSV)
            candidate_indices = np.arange(len(self.importers))

        # Exclude already-seen importers, but show all if everything's been seen
        seen = set(self._interactions.get(exporter_id, {}).keys())
        unseen = np.array([i for i in candidate_indices if self._importer_ids[i] not in seen])
        candidate_indices = unseen if len(unseen) > 0 else candidate_indices

        # Cold-start blend factor
        n_interactions = len(self._interactions.get(exporter_id, {}))
        alpha = min(1.0, n_interactions / 10.0)

        cb = self._content_scores(exporter_id, exporter_row, candidate_indices)
        cf = self._cf_scores(exporter_id, candidate_indices) if alpha > 0 else None
        raw_scores = (1.0 - alpha) * cb + alpha * cf if cf is not None else cb

        # Rank descending and convert to percentile scores
        ranks = raw_scores.argsort()[::-1]
        match_scores_pct = np.linspace(100, 60, len(ranks))

        mean, std = raw_scores.mean(), raw_scores.std()
        z = np.abs((raw_scores - mean) / (std + 1e-9))
        conf_norm = (z - z.min()) / (z.max() - z.min() + 1e-9)

        results = []
        for rank_pos, local_idx in enumerate(ranks[:top_n]):
            global_idx = candidate_indices[local_idx]
            row = self.importers.iloc[global_idx]
            buyer_id = str(row['Buyer_ID'])
            country = str(row.get('Country', ''))
            geo_mult, geo_label = get_geo_multiplier(country)

            results.append({
                "buyer_id": buyer_id,
                "match_score": float(round(min(100.0, match_scores_pct[rank_pos] * geo_mult), 1)),
                "confidence": float(round(float(conf_norm[local_idx]) * 100, 1)),
                "geo_label": geo_label,
                "industry": str(row.get('Industry', '')),
                "country": country,
                "algorithm": "hybrid-svd" if cf is not None else "content-based",
                "cf_weight": float(round(alpha, 2)),
            })

        return results

    # ------------------------------------------------------------------ #
    #  Exporter profile lookup                                              #
    # ------------------------------------------------------------------ #

    def get_exporter_row(self, exporter_id: str) -> pd.Series | None:
        if self.exporters.empty:
            return None
        match = self.exporters[self.exporters['Exporter_ID'] == exporter_id]
        return match.iloc[0] if not match.empty else None


recommender = HybridRecommender()
