import { Router, Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INTERACTIONS_FILE = path.join(__dirname, "../interactions.json");

const router = Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

router.get("/pca-matches/:exporterId", async (req: Request, res: Response) => {
    const { exporterId } = req.params;
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/ml/pca-matches/${exporterId}`);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching PCA matches from ML service:", error);
        res.status(500).json({ error: "ML service unreachable or error in PCA matching" });
    }
});

router.get("/regression-matches/:exporterId", async (req: Request, res: Response) => {
    const { exporterId } = req.params;
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/ml/regression-matches/${exporterId}`);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching Regression matches from ML service:", error);
        res.status(500).json({ error: "ML service unreachable or error in regression matching" });
    }
});

// Helper to interact with the Interactions JSON database
const getInteractions = () => {
    if (!fs.existsSync(INTERACTIONS_FILE)) {
        fs.writeFileSync(INTERACTIONS_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(INTERACTIONS_FILE, "utf-8");
    return JSON.parse(data);
};

const saveInteractions = (interactions: any[]) => {
    fs.writeFileSync(INTERACTIONS_FILE, JSON.stringify(interactions, null, 2));
};

router.post("/feedback", async (req: Request, res: Response) => {
    try {
        const { exporter_id, buyer_id, action, matchDetails } = req.body;

        // Save to interactions.json
        if (matchDetails) {
            const interactions = getInteractions();
            // Optional: avoid exact duplicates
            const isDup = interactions.find((i: any) => i.exporter_id === exporter_id && i.buyer_id === buyer_id);
            if (!isDup) {
                interactions.push({
                    exporter_id,
                    buyer_id,
                    action,
                    matchDetails,
                    timestamp: new Date().toISOString()
                });
                saveInteractions(interactions);
            }
        }

        // Forward to the Python ML server
        const response = await axios.post(`${ML_SERVICE_URL}/ml/feedback`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error("Error posting feedback to ML service:", error);
        res.status(500).json({ error: "ML service unreachable" });
    }
});

router.get("/interactions/:exporterId", (req: Request, res: Response) => {
    const { exporterId } = req.params;

    try {
        const interactions = getInteractions();
        // Filter for matches that the exporter connected with
        const history = interactions.filter((i: any) => i.exporter_id === exporterId && i.action === "connect");

        // Map back to just the original Match objects for the UI
        const savedMatches = history.map((i: any) => i.matchDetails);

        res.status(200).json({ matches: savedMatches.reverse() }); // Reverse so most recent is first
    } catch (err) {
        console.error("Failed to read interactions", err);
        res.status(500).json({ error: "Failed to read interaction history" });
    }
});

export default router;
