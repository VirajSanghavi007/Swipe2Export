import pandas as pd
import numpy as np
import os
from datetime import datetime

# Configuration
NUM_ROWS = 1000
INDUSTRIES = ["Auto Parts", "Pharma", "Electronics", "Textiles", "Steel", "Chemicals"]
COUNTRIES = ["USA", "UK", "Germany", "UAE", "Japan", "Australia", "Brazil", "Canada", "Singapore", "France"]
CITY_MAPPING = {
    "USA": ["Davenport", "Savannah", "Boulder", "Annapolis", "Salem"],
    "UK": ["Derry", "Swansea", "Norwich", "Bath", "Inverness"],
    "Germany": ["Mainz", "Kassel", "Rostock", "Erfurt", "Ulm"],
    "UAE": ["Ajman", "Fujairah", "Umm Al Quwain", "Ras Al Khaimah", "Kalba"],
    "Japan": ["Nagasaki", "Kanazawa", "Matsue", "Takayama", "Hakodate"],
    "Australia": ["Hobart", "Darwin", "Geelong", "Cairns", "Toowoomba"],
    "Brazil": ["Natal", "Vitoria", "Santos", "Joinville", "Cuiaba"],
    "Canada": ["Halifax", "Victoria", "Kelowna", "Kingston", "Saskatoon"],
    "Singapore": ["Bedok", "Punggol", "Jurong", "Woodlands", "Tampines"],
    "France": ["Nantes", "Grenoble", "Nancy", "Reims", "Dijon"]
}
START_DATE = "2022-01-01"
END_DATE = "2025-12-01"

def generate_monthly_dates(n):
    dates = pd.date_range(start=START_DATE, end=END_DATE, freq='MS').strftime('%Y-%m-%d').tolist()
    return np.random.choice(dates, n)

def generate_exporters():
    print("Generating exporters_cleaned.csv...")
    data = {
        "Exporter_ID": [f"EXP_{i+1:04d}" for i in range(NUM_ROWS)],
        "Industry": np.tile(INDUSTRIES, (NUM_ROWS // len(INDUSTRIES)) + 1)[:NUM_ROWS],
        "Date": generate_monthly_dates(NUM_ROWS),
        "Quantity_Tons": np.random.randint(500, 5001, NUM_ROWS),
    }
    
    # Capacity must be >= Quantity
    data["Manufacturing_Capacity_Tons"] = data["Quantity_Tons"] + np.random.randint(500, 2001, NUM_ROWS)
    # Ensure capacity is within requested range 1000-7000 (roughly)
    data["Manufacturing_Capacity_Tons"] = np.clip(data["Manufacturing_Capacity_Tons"], 1000, 7000)
    
    # Intent score normal distribution centered ~0.6
    data["Intent_Score"] = np.random.normal(0.6, 0.15, NUM_ROWS).clip(0, 1)
    
    # Risk variables (0-3 integer)
    data["War_Risk"] = np.random.randint(0, 4, NUM_ROWS)
    data["Natural_Calamity_Risk"] = np.random.randint(0, 4, NUM_ROWS)
    
    # Impacts
    data["StockMarket_Impact"] = np.random.uniform(-1, 1, NUM_ROWS)
    data["Currency_Shift"] = np.random.uniform(-0.5, 0.5, NUM_ROWS)
    data["Tariff_Impact"] = np.random.uniform(0, 1, NUM_ROWS)
    
    df = pd.DataFrame(data)
    # Shuffle to avoid industry grouping
    df = df.sample(frac=1).reset_index(drop=True)
    df.to_csv("exporters_cleaned.csv", index=False)
    return df

def generate_importers():
    print("Generating importers_cleaned.csv with city-country mapping...")
    
    selected_countries = np.random.choice(COUNTRIES, NUM_ROWS)
    city_country_list = []
    
    for country in selected_countries:
        city = np.random.choice(CITY_MAPPING[country])
        city_country_list.append(f"{city}, {country}")
        
    data = {
        "Buyer_ID": [f"BUY_{i+1:04d}" for i in range(NUM_ROWS)],
        "Industry": np.tile(INDUSTRIES, (NUM_ROWS // len(INDUSTRIES)) + 1)[:NUM_ROWS],
        "Date": generate_monthly_dates(NUM_ROWS),
        "Country": city_country_list,
        "Avg_Order_Tons": np.random.randint(200, 4001, NUM_ROWS),
    }
    
    # Intent score normal distribution
    data["Intent_Score"] = np.random.normal(0.6, 0.15, NUM_ROWS).clip(0, 1)
    
    # Binary flags with specific probabilities
    data["Good_Payment_History"] = np.random.choice([0, 1], NUM_ROWS, p=[0.2, 0.8])
    data["Engagement_Spike"] = np.random.choice([0, 1], NUM_ROWS, p=[0.7, 0.3])
    
    # Risk variables
    data["War_Event"] = np.random.randint(0, 4, NUM_ROWS)
    data["Natural_Calamity"] = np.random.randint(0, 4, NUM_ROWS)
    
    # Shocks
    data["StockMarket_Shock"] = np.random.uniform(-1, 1, NUM_ROWS)
    data["Currency_Fluctuation"] = np.random.uniform(-0.5, 0.5, NUM_ROWS)
    data["Tariff_News"] = np.random.uniform(0, 1, NUM_ROWS)
    
    df = pd.DataFrame(data)
    df = df.sample(frac=1).reset_index(drop=True)
    df.to_csv("importers_cleaned.csv", index=False)
    return df

if __name__ == "__main__":
    np.random.seed(42) # For reproducibility
    generate_exporters()
    generate_importers()
    print("Synthetic datasets generated successfully.")
