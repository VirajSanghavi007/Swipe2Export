import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const usersFile = path.join(process.cwd(), "server", "users.json");

function getUsers(): any[] {
    try {
        if (fs.existsSync(usersFile)) {
             return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
        }
    } catch {}
    return [];
}

function saveUsers(users: any[]) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

router.post("/signup", async (req: Request, res: Response) => {
    const { name, email, password, industry, linkedin, phone, contactEmail } = req.body;

    if (!name || !email || !password || !industry) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const users = getUsers();
        
        // Check if user exists
        const existingUser = users.find((u: any) => u.email === email);
        if (existingUser) {
            return res.status(409).json({ error: "Email already in use" });
        }

        // Generate next Exporter ID
        const exporterCount = users.filter((u: any) => u.role === "exporter").length;
        const nextIdNum = exporterCount + 2000;
        const generatedId = `EXP_${nextIdNum.toString().padStart(4, "0")}`;

        const newUser = {
            userId: generatedId,
            name,
            email,
            password, // Plaintext for demo purposes
            role: "exporter",
            industry,
            linkedin: linkedin || "",
            phone: phone || "",
            contactEmail: contactEmail || email,
            createdAt: new Date().toISOString()
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
                industry: newUser.industry,
                linkedin: newUser.linkedin,
                phone: newUser.phone,
                contactEmail: newUser.contactEmail,
            },
        });
    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({ error: "Failed to sign up" });
    }
});

router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const users = getUsers();
        const user = users.find((u: any) => u.email === email && u.password === password);

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
                industry: user.industry,
                linkedin: user.linkedin || "",
                phone: user.phone || "",
                contactEmail: user.contactEmail || user.email,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Failed to log in" });
    }
});

router.get("/me/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const users = getUsers();
        const user = users.find((u: any) => u.userId === userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const { password: _, ...safeUser } = user;
        return res.status(200).json(safeUser);
    } catch (err) {
        console.error("Get user error:", err);
        return res.status(500).json({ error: "Failed to retrieve user" });
    }
});

router.put("/update", async (req: Request, res: Response) => {
    const { userId, ...updates } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    try {
        const users = getUsers();
        const idx = users.findIndex((u: any) => u.userId === userId);

        if (idx === -1) {
            return res.status(404).json({ error: "User not found" });
        }

        users[idx] = { ...users[idx], ...updates };
        saveUsers(users);

        const { password: _, ...safeUser } = users[idx];
        return res.status(200).json({
            message: "Profile updated successfully",
            user: safeUser,
        });
    } catch (err) {
        console.error("Update user error:", err);
        return res.status(500).json({ error: "Failed to update profile" });
    }
});

export default router;
