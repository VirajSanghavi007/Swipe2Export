import pandas as pd
import os
import json

DEAL_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "deal_log.csv")

def load_deal_log():
    if not os.path.exists(DEAL_LOG_FILE):
        return pd.DataFrame(columns=["buyer_id", "exporter_id", "action", "outcome", "score", "feature_vector"])
    try:
        df = pd.read_csv(DEAL_LOG_FILE)
        if "feature_vector" in df.columns:
            df["feature_vector"] = df["feature_vector"].apply(lambda x: json.loads(x) if isinstance(x, str) else x)
        return df
    except Exception:
        return pd.DataFrame(columns=["buyer_id", "exporter_id", "action", "outcome", "score", "feature_vector"])

def save_deal_log(df):
    try:
        df_to_save = df.copy()
        if "feature_vector" in df_to_save.columns:
            df_to_save["feature_vector"] = df_to_save["feature_vector"].apply(
                lambda x: json.dumps(x.tolist()) if hasattr(x, "tolist") else (json.dumps(x) if isinstance(x, list) else x)
            )
        df_to_save.to_csv(DEAL_LOG_FILE, index=False)
    except Exception:
        pass

def log_deal(buyer_id, exporter_id, action, score, feature_vector):
    outcome = 1 if action == "connect" else 0
    new_deal = {
        "buyer_id": buyer_id,
        "exporter_id": exporter_id,
        "action": action,
        "outcome": outcome,
        "score": score,
        "feature_vector": feature_vector
    }
    df = load_deal_log()
    df = pd.concat([df, pd.DataFrame([new_deal])], ignore_index=True)
    save_deal_log(df)
