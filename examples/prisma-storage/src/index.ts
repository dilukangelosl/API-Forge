/**
 * Prisma Storage Example
 * 
 * Demonstrates using Prisma ORM with API Forge for persistent OAuth storage
 */
import express from "express";
import { APIForge, oauthPlugin, rateLimitPlugin, Response, generateClientSecret, hashSecret } from "@api-forge/core";
import { expressAdapter } from "@api-forge/adapter-express";
import { PrismaClient } from "@prisma/client";
import { SQLitePrismaAdapter } from "./storage";

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize custom SQLite-compatible adapter
const storage = new SQLitePrismaAdapter(prisma);

// Create Express app
const app = express();
app.use(express.json());

// Create API Forge instance with Prisma storage
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
    issuer: "http://localhost:3001",
    audience: "http://localhost:3001",
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
            const users = await prisma.user.findMany({
                select: { id: true, email: true, name: true, createdAt: true },
            });
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
            const user = await prisma.user.create({
                data: {
                    email: body.email,
                    name: body.name,
                    password: body.password,
                },
            });
            return Response.created({ user: { id: user.id, email: user.email, name: user.name } });
        },
    })
    .endpoint({
        method: "GET",
        path: "/:id",
        description: "Get user by ID",
        scopes: ["read:users"],
        handler: async (ctx) => {
            const user = await prisma.user.findUnique({
                where: { id: ctx.request.params.id },
                select: { id: true, email: true, name: true, createdAt: true },
            });
            if (!user) {
                return Response.notFound("User not found");
            }
            return Response.ok({ user });
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
            const clientCount = await prisma.oAuthClient.count();
            const userCount = await prisma.user.count();
            return Response.ok({
                name: "Prisma Storage Example",
                storage: "Prisma + SQLite",
                stats: { clients: clientCount, users: userCount },
            });
        },
    });

// Mount API Forge on Express
const adapter = expressAdapter(app);
forge.mount(adapter);

const PORT = process.env.PORT || 3001;

async function main() {
    try {
        await storage.initialize();

        // Create demo client if none exists
        const existingClient = await storage.getClient("demo-client");
        if (!existingClient) {
            const clientSecret = generateClientSecret();

            await storage.createClient({
                clientId: "demo-client",
                clientSecretHash: hashSecret(clientSecret),
                name: "Demo Application",
                description: "Demo OAuth client for testing",
                redirectUris: ["http://localhost:3001/callback"],
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
            console.log(`\n🚀 Prisma Storage Example running at http://localhost:${PORT}`);
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

process.on("SIGINT", async () => {
    await storage.close();
    process.exit(0);
});
