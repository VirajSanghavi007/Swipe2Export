import pandas as pd
import numpy as np

def clean_exporter_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if 'Exporter_ID' in df.columns:
        df['Exporter_ID'] = df['Exporter_ID'].astype(str).str.strip()
    str_cols = df.select_dtypes(include=['object']).columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()
    df = df.dropna(subset=['Exporter_ID', 'Industry'])
    df = df[~df['Exporter_ID'].isin(['', 'nan', 'None'])]
    df = df[~df['Industry'].isin(['', 'nan', 'None'])]
    if 'Quantity_Tons' in df.columns:
        df['Quantity_Tons'] = pd.to_numeric(df['Quantity_Tons'], errors='coerce')
        df = df[df['Quantity_Tons'] > 0]
    num_cols = [
        'Quantity_Tons', 'Intent_Score', 'Tariff_Impact', 'Currency_Shift',
        'War_Risk', 'Natural_Calamity_Risk', 'StockMarket_Impact'
    ]
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    for col in num_cols:
        if col in df.columns:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val if not pd.isna(median_val) else 0.0)
    if 'Intent_Score' in df.columns:
        max_score = df['Intent_Score'].max()
        if max_score > 1:
            df['Intent_Score'] = df['Intent_Score'] / max_score
    cols_to_clip = [
        'Intent_Score', 'Tariff_Impact', 'Currency_Shift', 
        'War_Risk', 'Natural_Calamity_Risk', 'StockMarket_Impact'
    ]
    for col in cols_to_clip:
        if col in df.columns:
            df[col] = df[col].clip(0, 1)
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        df = df.dropna(subset=['Date'])
        df['Year'] = df['Date'].dt.year
        df['Month'] = df['Date'].dt.month
    return df

def clean_importer_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if 'Buyer_ID' in df.columns:
        df['Buyer_ID'] = df['Buyer_ID'].astype(str).str.strip()
    str_cols = df.select_dtypes(include=['object']).columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()
    df = df.dropna(subset=['Buyer_ID', 'Industry'])
    df = df[~df['Buyer_ID'].isin(['', 'nan', 'None'])]
    df = df[~df['Industry'].isin(['', 'nan', 'None'])]
    if 'Avg_Order_Tons' in df.columns:
        df['Avg_Order_Tons'] = pd.to_numeric(df['Avg_Order_Tons'], errors='coerce')
        df = df[df['Avg_Order_Tons'] > 0]
    num_cols = [
        'Avg_Order_Tons', 'Intent_Score', 'Engagement_Spike', 'Good_Payment_History', 
        'Tariff_News', 'Currency_Fluctuation', 'War_Event', 
        'Natural_Calamity', 'StockMarket_Shock'
    ]
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    for col in num_cols:
        if col in df.columns:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val if not pd.isna(median_val) else 0.0)
    if 'Intent_Score' in df.columns:
        max_score = df['Intent_Score'].max()
        if max_score > 1:
            df['Intent_Score'] = df['Intent_Score'] / max_score
    cols_to_clip = [
        'Intent_Score', 'Engagement_Spike', 'Good_Payment_History', 
        'Tariff_News', 'Currency_Fluctuation', 'War_Event', 
        'Natural_Calamity', 'StockMarket_Shock'
    ]
    for col in cols_to_clip:
        if col in df.columns:
            df[col] = df[col].clip(0, 1)
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        df = df.dropna(subset=['Date'])
        df['Year'] = df['Date'].dt.year
        df['Month'] = df['Date'].dt.month
    return df
