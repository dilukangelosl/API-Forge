/**
 * Drizzle Storage Example using Bun's SQLite
 */
import express from "express";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import { APIForge, createClientCredentials } from "@api-forge/core";
import { createExpressAdapter } from "@api-forge/adapter-express";
import * as schema from "./schema";
import { SQLiteDrizzleAdapter } from "./storage";

// Initialize SQLite + Drizzle using Bun's built-in SQLite
const sqlite = new Database("dev.db");
const db = drizzle(sqlite, { schema });

// Initialize Drizzle storage adapter
const storage = new SQLiteDrizzleAdapter(db as any);

function generateId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

// Create API Forge instance with Drizzle storage
const forge = new APIForge({
    storage: {
        adapter: storage,
    },
    auth: {
        grants: ["client_credentials", "authorization_code", "refresh_token"],
        accessTokenTTL: 3600,
        refreshTokenTTL: 86400 * 7,
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
        const users = await db.select({
            id: schema.users.id,
            email: schema.users.email,
            name: schema.users.name,
            createdAt: schema.users.createdAt,
        }).from(schema.users);
        return ctx.json({ users });
    },
});

forge.post("/users", {
    auth: { scopes: ["write:users"] },
    handler: async (ctx) => {
        const body = ctx.body as { email: string; name?: string; password: string };

        const user = {
            id: generateId(),
            email: body.email,
            name: body.name ?? null,
            password: body.password,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.insert(schema.users).values(user);

        return ctx.json({ user: { id: user.id, email: user.email, name: user.name } }, 201);
    },
});

forge.get("/users/:id", {
    auth: { scopes: ["read:users"] },
    handler: async (ctx) => {
        const users = await db.select({
            id: schema.users.id,
            email: schema.users.email,
            name: schema.users.name,
            createdAt: schema.users.createdAt,
        }).from(schema.users).where(eq(schema.users.id, ctx.params.id)).limit(1);

        if (!users[0]) {
            return ctx.json({ error: "User not found" }, 404);
        }

        return ctx.json({ user: users[0] });
    },
});

// Public info endpoint
forge.get("/info", {
    auth: false,
    handler: async (ctx) => {
        const clients = await db.select().from(schema.oauthClients);
        const users = await db.select().from(schema.users);

        return ctx.json({
            name: "Drizzle Storage Example",
            storage: "Drizzle + Bun SQLite",
            stats: {
                clients: clients.length,
                users: users.length,
            },
        });
    },
});

// Create Express app
const app = express();

const adapter = createExpressAdapter(forge);
app.use("/api", adapter);

const PORT = process.env.PORT || 3002;

async function main() {
    try {
        await storage.initialize();

        const existingClient = await storage.getClient("demo-client");
        if (!existingClient) {
            const { clientSecret } = await createClientCredentials();

            await storage.createClient({
                clientId: "demo-client",
                clientSecretHash: clientSecret,
                name: "Demo Application",
                description: "Demo OAuth client for testing",
                redirectUris: ["http://localhost:3002/callback"],
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
            console.log(`\n🚀 Drizzle Storage Example running at http://localhost:${PORT}`);
            console.log(`\n📖 Endpoints:`);
            console.log(`   GET  /api/info - Public info`);
            console.log(`   POST /api/oauth/token - Get access token`);
            console.log(`   GET  /api/users - List users (requires read:users)`);
            console.log(`   POST /api/users - Create user (requires write:users)`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

main();

process.on("SIGINT", () => {
    sqlite.close();
    process.exit(0);
});
