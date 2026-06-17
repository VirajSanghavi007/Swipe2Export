import { Router, Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";

const router = Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";
const intersFile = path.join(process.cwd(), "server", "interactions.json");

function getInteractions(): any[] {
    try {
        if (fs.existsSync(intersFile)) {
             return JSON.parse(fs.readFileSync(intersFile, "utf-8"));
        }
    } catch {}
    return [];
}

function saveInteractions(inters: any[]) {
    fs.writeFileSync(intersFile, JSON.stringify(inters, null, 2));
}

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

router.post("/feedback", async (req: Request, res: Response) => {
    try {
        const { exporter_id, buyer_id, action, matchDetails } = req.body;

        // Save to JSON
        if (matchDetails) {
            const interactions = getInteractions();
            const existing = interactions.find(
                (i: any) => i.exporter_id === exporter_id && i.buyer_id === buyer_id
            );
            
            if (!existing) {
                interactions.push({
                    exporter_id,
                    buyer_id,
                    action,
                    matchDetails,
                    timestamp: new Date().toISOString(),
                    createdAt: new Date().toISOString()
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

router.get("/interactions/:exporterId", async (req: Request, res: Response) => {
    const { exporterId } = req.params;

    try {
        const interactions = getInteractions();
        const filtered = interactions
            .filter((i: any) => i.exporter_id === exporterId && i.action === "connect")
            .sort((a, b) => {
                const tA = new Date(a.createdAt || a.timestamp || 0).getTime();
                const tB = new Date(b.createdAt || b.timestamp || 0).getTime();
                return tB - tA;
            });

        const savedMatches = filtered.map((i) => i.matchDetails);

        res.status(200).json({ matches: savedMatches });
    } catch (err) {
        console.error("Failed to read interactions", err);
        res.status(500).json({ error: "Failed to read interaction history" });
    }
});

export default router;
