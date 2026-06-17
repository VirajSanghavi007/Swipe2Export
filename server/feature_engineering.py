import pandas as pd
import numpy as np

def build_features(importer_df, exporter_df):
    features = pd.DataFrame()
    features['capacity_ratio'] = (
        exporter_df['Quantity_Tons'].values / importer_df['Avg_Order_Tons'].values
    ).clip(0, 2.0)
    features['intent_alignment'] = np.sqrt(
        exporter_df['Intent_Score'].values * importer_df['Intent_Score'].values
    )
    features['engagement_score'] = importer_df['Engagement_Spike'].values
    features['payment_score'] = importer_df['Good_Payment_History'].values
    features['tariff_alignment'] = 1 - np.abs(
        importer_df['Tariff_News'].values - exporter_df['Tariff_Impact'].values
    )
    features['currency_alignment'] = 1 - np.abs(
        importer_df['Currency_Fluctuation'].values - exporter_df['Currency_Shift'].values
    )
    features['war_alignment'] = 1 - np.abs(
        importer_df['War_Event'].values - exporter_df['War_Risk'].values
    )
    features['natural_alignment'] = 1 - np.abs(
        importer_df['Natural_Calamity'].values - exporter_df['Natural_Calamity_Risk'].values
    )
    features['stock_alignment'] = 1 - np.abs(
        importer_df['StockMarket_Shock'].values - exporter_df['StockMarket_Impact'].values
    )
    cols_to_clip_01 = [
        'intent_alignment', 'engagement_score', 'payment_score',
        'tariff_alignment', 'currency_alignment', 'war_alignment',
        'natural_alignment', 'stock_alignment'
    ]
    for col in cols_to_clip_01:
        features[col] = features[col].clip(0, 1)
    return features
