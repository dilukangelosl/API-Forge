/**
 * Drizzle Storage Example using Bun's SQLite
 */
import express from "express";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import { APIForge, oauthPlugin, rateLimitPlugin, Response, generateClientSecret, hashSecret } from "@api-forge/core";
import { expressAdapter } from "@api-forge/adapter-express";
import * as schema from "./schema";
import { SQLiteDrizzleAdapter } from "./storage";

// Initialize SQLite + Drizzle
const sqlite = new Database("dev.db");
const db = drizzle(sqlite, { schema });

// Initialize Drizzle storage adapter
const storage = new SQLiteDrizzleAdapter(db as any);

// Create Express app
const app = express();
app.use(express.json());

function generateId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

// Create API Forge instance
const forge = new APIForge({
    storage: {
        adapter: storage,
    },
    auth: {
        grants: ["client_credentials", "authorization_code", "refresh_token"],
        scopes: {
            "read:users": "Read user information",
            "write:users": "Modify user information",
            "read:posts": "Read posts",
            "write:posts": "Create and edit posts",
        },
    },
    rateLimit: {
        global: "100/min",
    },
});

// Register plugins
forge.use(oauthPlugin({
    issuer: "http://localhost:3002",
    audience: "http://localhost:3002",
}));

forge.use(rateLimitPlugin({
    globalLimit: "100/min",
    includeHeaders: true,
}));

// Define Users API
forge
    .api({
        name: "users",
        basePath: "/api/users",
        description: "User management API",
    })
    .endpoint({
        method: "GET",
        path: "/",
        description: "List all users",
        scopes: ["read:users"],
        handler: async () => {
            const users = await db.select({
                id: schema.users.id,
                email: schema.users.email,
                name: schema.users.name,
                createdAt: schema.users.createdAt,
            }).from(schema.users);
            return Response.ok({ users });
        },
    })
    .endpoint({
        method: "POST",
        path: "/",
        description: "Create a user",
        scopes: ["write:users"],
        handler: async (ctx) => {
            const body = ctx.request.body as { email: string; name?: string; password: string };
            const user = {
                id: generateId(),
                email: body.email,
                name: body.name ?? null,
                password: body.password,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await db.insert(schema.users).values(user);
            return Response.created({ user: { id: user.id, email: user.email, name: user.name } });
        },
    })
    .endpoint({
        method: "GET",
        path: "/:id",
        description: "Get user by ID",
        scopes: ["read:users"],
        handler: async (ctx) => {
            const users = await db.select({
                id: schema.users.id,
                email: schema.users.email,
                name: schema.users.name,
                createdAt: schema.users.createdAt,
            }).from(schema.users).where(eq(schema.users.id, ctx.request.params.id)).limit(1);

            if (!users[0]) {
                return Response.notFound("User not found");
            }
            return Response.ok({ user: users[0] });
        },
    });

// Public info endpoint
forge
    .api({ name: "info", basePath: "/api" })
    .endpoint({
        method: "GET",
        path: "/info",
        description: "Server info",
        public: true,
        handler: async () => {
            const clients = await db.select().from(schema.oauthClients);
            const users = await db.select().from(schema.users);
            return Response.ok({
                name: "Drizzle Storage Example",
                storage: "Drizzle + Bun SQLite",
                stats: { clients: clients.length, users: users.length },
            });
        },
    });

// Mount API Forge on Express
const adapter = expressAdapter(app);
forge.mount(adapter);

const PORT = process.env.PORT || 3002;

async function main() {
    try {
        await storage.initialize();

        const existingClient = await storage.getClient("demo-client");
        if (!existingClient) {
            const clientSecret = generateClientSecret();

            await storage.createClient({
                clientId: "demo-client",
                clientSecretHash: hashSecret(clientSecret),
                name: "Demo Application",
                description: "Demo OAuth client for testing",
                redirectUris: ["http://localhost:3002/callback"],
                grantTypes: ["client_credentials", "authorization_code", "refresh_token"],
                scopes: ["read:users", "write:users", "read:posts"],
                isConfidential: true,
                ownerId: "admin",
                isActive: true,
            });

            console.log("\n📝 Created demo client:");
            console.log(`   Client ID: demo-client`);
            console.log(`   Client Secret: ${clientSecret}`);
        }

        app.listen(PORT, () => {
            console.log(`\n🚀 Drizzle Storage Example running at http://localhost:${PORT}`);
            console.log(`\n📖 Endpoints:`);
            console.log(`   GET  /api/info - Public info`);
            console.log(`   POST /oauth/token - Get access token`);
            console.log(`   GET  /api/users - List users`);
            console.log(`   POST /api/users - Create user`);
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
