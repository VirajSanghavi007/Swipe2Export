import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, "../users.json");

const router = Router();

// Helper to interact with the JSON database
const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
};

const saveUsers = (users: any[]) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

router.post("/signup", (req: Request, res: Response) => {
    const { name, email: rawEmail, password, industry } = req.body;

    if (!name || !rawEmail || !password || !industry) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const email = rawEmail.trim().toLowerCase();

    const users = getUsers();

    // Check if user exists
    const existingUser = users.find((u: any) => u.email.toLowerCase() === email);
    if (existingUser) {
        return res.status(409).json({ error: "Email already in use" });
    }

    // Determine the next Exporter ID offset by checking length, or simply randomly
    // Format: EXP_0001
    const nextIdNum = users.filter((u: any) => u.role === "exporter").length + 2000;
    // Starting offset to sound like the dataset
    const generatedId = `EXP_${nextIdNum.toString().padStart(4, "0")}`;

    const newUser = {
        userId: generatedId,
        name,
        email,
        password, // Hardcoded plaintext for demo purposes
        role: "exporter",
        industry
    };

    users.push(newUser);
    saveUsers(users);

    return res.status(201).json({
        message: "Account created successfully",
        user: {
            userId: newUser.userId,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            industry: newUser.industry
        }
    });
});

router.post("/login", (req: Request, res: Response) => {
    const { email: rawEmail, password } = req.body;

    if (!rawEmail || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const email = rawEmail.trim().toLowerCase();

    const users = getUsers();

    // Find matching user
    const user = users.find((u: any) => u.email.toLowerCase() === email && u.password === password);

    if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json({
        message: "Login successful",
        user: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            industry: user.industry
        }
    });
});

router.get("/me/:userId", (req: Request, res: Response) => {
    const { userId } = req.params;
    const users = getUsers();

    const user = users.find((u: any) => u.userId === userId);

    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    // Omit password for security
    const { password: _, ...safeUser } = user;
    return res.status(200).json(safeUser);
});

router.put("/update", (req: Request, res: Response) => {
    const { userId, ...updates } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const users = getUsers();
    const userIndex = users.findIndex((u: any) => u.userId === userId);

    if (userIndex === -1) {
        return res.status(404).json({ error: "User not found" });
    }

    // Update fields except userId
    users[userIndex] = { ...users[userIndex], ...updates, userId: users[userIndex].userId };

    saveUsers(users);

    // Omit password from response
    const { password: _, ...safeUser } = users[userIndex];
    return res.status(200).json({
        message: "Profile updated successfully",
        user: safeUser
    });
});

export default router;
