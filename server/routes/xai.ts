import { Router, Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, "../users.json");

const router = Router();

// Retrieve the user from the local JSON store to get their full dataset
const getExporterData = (userId: string) => {
    if (!fs.existsSync(USERS_FILE)) return null;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    return users.find((u: any) => u.userId === userId);
};

router.post("/analyze", async (req: Request, res: Response) => {
    const { exporter_id, matchDetails } = req.body;

    if (!exporter_id || !matchDetails) {
        return res.status(400).json({ error: "Missing required fields for analysis" });
    }

    const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAMUxS4WKRLMzGyirlddDeoWTu--5-Bky0";

    const exporterData = getExporterData(exporter_id);
    const exporterContext = exporterData ? JSON.stringify(exporterData, null, 2) : "Unknown exporter details";
    const importerContext = JSON.stringify(matchDetails, null, 2);

    const systemPrompt = "Your tasks is basically to evaluate the PCA score prediction and give a brief analysis of why and how  was the prediction made and also explain why was that confidence level selected. Don't go too much deep in mathematics, just assume that you are explain it someone who know about import and export stuff.\nBelow is the format that you'll receive as an input.\n\"exporter_side -> all the inputs of exporter(the user) that is passed into the PCA model\nimporter_side -> the row values of importer that that the model gives as an output\nmatch score\nconfidence\"\nDon't include any additional text.\nExplain it in layman terms with some examples if possible.";

    const userPrompt = `exporter_side -> \n${exporterContext}\nimporter_side -> \n${importerContext}\nmatch score: ${matchDetails.match_score}\nconfidence: ${matchDetails.confidence || 'N/A'}`;

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                system_instruction: {
                    parts: { text: systemPrompt }
                },
                contents: [{
                    parts: [{ text: userPrompt }]
                }]
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const explanation = response.data.candidates[0].content.parts[0].text;
        res.status(200).json({ explanation });
    } catch (error: any) {
        console.error("Error communicating with AI API:", error.response?.data || error.message);

        // Extract the exact error message from the Gemini API to show the user
        const errorMessage = error.response?.data?.error?.message || error.message || "Failed to generate AI analysis.";
        res.status(500).json({ error: errorMessage });
    }
});

export default router;
