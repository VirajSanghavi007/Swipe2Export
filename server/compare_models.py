import pandas as pd
import numpy as np
import os
import random
from scipy.stats import spearmanr
from backend import get_best_matches, _get_data
from regression_inference import get_regression_ranked_importers

def calculate_spearman(pca_ranks, reg_ranks, union_ids):
    """
    Calculate Spearman correlation for two lists of IDs and their ranks.
    If an ID is not in a list, it's assigned rank 11.
    """
    # Create rank vectors
    # pca_ranks/reg_ranks are dicts of {id: rank_index_0_to_9}
    v1 = []
    v2 = []
    
    for uid in union_ids:
        v1.append(pca_ranks.get(uid, 11))
        v2.append(reg_ranks.get(uid, 11))
        
    coef, _ = spearmanr(v1, v2)
    return coef

def compare_models(num_samples=20):
    print(f"Starting model comparison for {num_samples} random exporters...")
    
    # Load exporters for selection
    _, exporters_df = _get_data()
    if exporters_df.empty:
        print("Error: No exporters found in data files.")
        return
        
    sample_ids = exporters_df['Exporter_ID'].unique()
    if len(sample_ids) < num_samples:
        num_samples = len(sample_ids)
        
    selected_exporters = random.sample(list(sample_ids), num_samples)
    
    results = []
    
    for exp_id in selected_exporters:
        # Get PCA Rankings (top 10)
        pca_df, _ = get_best_matches(exp_id, top_n=10)
        if pca_df.empty:
            continue
            
        pca_ids = pca_df['Buyer_ID'].astype(str).tolist()
        pca_ranks = {bid: i+1 for i, bid in enumerate(pca_ids)}
        
        # Get Regression Rankings (top 10)
        reg_data = get_regression_ranked_importers(exp_id, top_n=10)
        if "error" in reg_data or not reg_data.get("matches"):
            continue
            
        reg_ids = [str(m["buyer_id"]) for m in reg_data["matches"]]
        reg_ranks = {bid: i+1 for i, bid in enumerate(reg_ids)}
        
        # Compute Overlap
        set_pca = set(pca_ids)
        set_reg = set(reg_ids)
        intersection = set_pca & set_reg
        overlap_pct = (len(intersection) / 10.0) * 100
        
        # Compute Spearman
        union_ids = list(set_pca | set_reg)
        corr = calculate_spearman(pca_ranks, reg_ranks, union_ids)
        
        results.append({
            "exporter_id": exp_id,
            "overlap_pct": overlap_pct,
            "correlation": corr,
            "pool_size": len(union_ids)
        })
        
    if not results:
        print("No matches were generated during the comparison.")
        return
        
    # Aggregate results
    df_res = pd.DataFrame(results)
    
    print("\n" + "="*40)
    print("      MODEL COMPARISON SUMMARY")
    print("      (PCA vs. Regression)")
    print("="*40)
    print(f"Exporters Sampled:    {len(df_res)}")
    print(f"Mean Overlap (t10):   {df_res['overlap_pct'].mean():.2f}%")
    print(f"Mean Rank Correlation: {df_res['correlation'].mean():.3f}")
    print(f"Max Overlap:          {df_res['overlap_pct'].max():.2f}%")
    print(f"Min Overlap:          {df_res['overlap_pct'].min():.2f}%")
    print("-" * 40)
    print("Detailed metrics saved to 'model_comparison_results.csv'")
    
    df_res.to_csv("model_comparison_results.csv", index=False)

if __name__ == "__main__":
    compare_models(20)
