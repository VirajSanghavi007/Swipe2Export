import os
import sys
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend import get_best_matches

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    imp_path = os.path.join(base_dir, "importers_cleaned.csv")
    exp_path = os.path.join(base_dir, "exporters_cleaned.csv")

    if not os.path.exists(imp_path) or not os.path.exists(exp_path):
        print("Required data files missing.")
        return

    print("System initialized.")
    
    while True:
        try:
            exporter_id = input("\nEnter Exporter_ID (or 'exit' to quit): ").strip()
            if exporter_id.lower() == 'exit':
                break
            
            results, diagnostics = get_best_matches(exporter_id)
            
            if "error" in diagnostics:
                print(f"Error: {diagnostics['error']}")
                continue
                
            if results.empty:
                print("No matches found for this exporter.")
                continue

            print(f"\nTop {len(results)} matches for {exporter_id}:")
            cols = ['Buyer_ID', 'Match_Score', 'geo_label', 'Confidence']
            
            print(results[cols].to_string(index=False))
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()
