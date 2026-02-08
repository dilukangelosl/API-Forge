/**
 * Prisma Storage Example
 * 
 * Demonstrates using Prisma ORM with API Forge for persistent OAuth storage
 */
import express from "express";
import { APIForge, createClientCredentials } from "@api-forge/core";
import { createExpressAdapter } from "@api-forge/adapter-express";
import { PrismaClient } from "@prisma/client";
import { SQLitePrismaAdapter } from "./storage";

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize custom SQLite-compatible adapter
const storage = new SQLitePrismaAdapter(prisma);

// Create API Forge instance with Prisma storage
const forge = new APIForge({
    storage: {
        adapter: storage,
    },
    auth: {
        grants: ["client_credentials", "authorization_code", "refresh_token"],
        accessTokenTTL: 3600, // 1 hour
        refreshTokenTTL: 86400 * 7, // 7 days
        scopes: {
            "read:users": "Read user information",
            "write:users": "Modify user information",
            "read:posts": "Read posts",
            "write:posts": "Create and edit posts",
        },
    },
    rateLimit: {
        enabled: true,
        windowMs: 60000,
        max: 100,
    },
});

// Define API routes
forge.get("/users", {
    auth: { scopes: ["read:users"] },
    handler: async (ctx) => {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true, createdAt: true },
        });
        return ctx.json({ users });
    },
});

forge.post("/users", {
    auth: { scopes: ["write:users"] },
    handler: async (ctx) => {
        const body = ctx.body as { email: string; name?: string; password: string };

        const user = await prisma.user.create({
            data: {
                email: body.email,
                name: body.name,
                password: body.password, // In production, hash this!
            },
        });

        return ctx.json({ user: { id: user.id, email: user.email, name: user.name } }, 201);
    },
});

forge.get("/users/:id", {
    auth: { scopes: ["read:users"] },
    handler: async (ctx) => {
        const user = await prisma.user.findUnique({
            where: { id: ctx.params.id },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        if (!user) {
            return ctx.json({ error: "User not found" }, 404);
        }

        return ctx.json({ user });
    },
});

// Public info endpoint
forge.get("/info", {
    auth: false,
    handler: async (ctx) => {
        const clientCount = await prisma.oAuthClient.count();
        const userCount = await prisma.user.count();

        return ctx.json({
            name: "Prisma Storage Example",
            storage: "Prisma + SQLite",
            stats: {
                clients: clientCount,
                users: userCount,
            },
        });
    },
});

// Create Express app
const app = express();

// Use Express adapter
const adapter = createExpressAdapter(forge);
app.use("/api", adapter);

// Start server
const PORT = process.env.PORT || 3001;

async function main() {
    try {
        // Initialize storage
        await storage.initialize();

        // Create a demo client if none exists
        const existingClient = await storage.getClient("demo-client");
        if (!existingClient) {
            const { clientId, clientSecret } = await createClientCredentials();

            await storage.createClient({
                clientId: "demo-client",
                clientSecretHash: clientSecret, // In production, hash this!
                name: "Demo Application",
                description: "Demo OAuth client for testing",
                redirectUris: ["http://localhost:3001/callback"],
                grantTypes: ["client_credentials", "authorization_code", "refresh_token"],
                scopes: ["read:users", "write:users", "read:posts"],
                isConfidential: true,
                ownerId: "admin",
                isActive: true,
            });

            console.log("Created demo client:");
            console.log(`  Client ID: demo-client`);
            console.log(`  Client Secret: ${clientSecret}`);
        }

        app.listen(PORT, () => {
            console.log(`\n🚀 Prisma Storage Example running at http://localhost:${PORT}`);
            console.log(`\n📖 Endpoints:`);
            console.log(`   GET  /api/info - Public info`);
            console.log(`   POST /api/oauth/token - Get access token`);
            console.log(`   GET  /api/users - List users (requires read:users)`);
            console.log(`   POST /api/users - Create user (requires write:users)`);
            console.log(`\n💡 Test with:`);
            console.log(`   curl -X POST http://localhost:${PORT}/api/oauth/token \\`);
            console.log(`     -H "Content-Type: application/json" \\`);
            console.log(`     -d '{"grant_type":"client_credentials","client_id":"demo-client","client_secret":"YOUR_SECRET","scope":"read:users"}'`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

main();

// Cleanup on exit
process.on("SIGINT", async () => {
    await storage.close();
    process.exit(0);
});
