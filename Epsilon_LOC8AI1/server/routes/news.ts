import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

const NEWS_API_URL = "https://newsdata.io/api/1/latest";
const NEWS_API_KEY = "pub_bda12e9c8d4b4a06b9b7afff87b16d84"; // In production, move to .env

router.get("/", async (_req: Request, res: Response) => {
    try {
        const response = await axios.get(`${NEWS_API_URL}?apikey=${NEWS_API_KEY}&language=en`);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching news from newsdata.io:", error);
        res.status(500).json({ error: "Failed to fetch market intelligence news" });
    }
});

export default router;
