import express from "express";
import {
    APIForge,
    oauthPlugin,
    rateLimitPlugin,
    Response,
} from "@api-forge/core";
import { expressAdapter } from "@api-forge/adapter-express";

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define the issuer URL
const ISSUER = process.env.ISSUER ?? "http://localhost:3000";

// Initialize API Forge with configuration
const forge = new APIForge({
    auth: {
        grants: ["client_credentials", "authorization_code", "refresh_token"],
        scopes: {
            "read:users": "Read user information",
            "write:users": "Create and update users",
            "read:products": "Read product catalog",
            "write:products": "Manage product catalog",
            "admin": "Full administrative access",
        },
        pkce: {
            required: "public_clients",
        },
    },

    rateLimit: {
        global: "1000/hour",
        headers: true,
    },
});

// Register plugins
forge.use(oauthPlugin({
    issuer: ISSUER,
    audience: ISSUER,
}));

forge.use(rateLimitPlugin({
    globalLimit: "1000/hour",
    includeHeaders: true,
}));

// Define Users API
forge
    .api({
        name: "users",
        basePath: "/api/v1/users",
        description: "User management",
        defaultScopes: ["read:users"],
    })
    .endpoint({
        method: "GET",
        path: "/",
        description: "List all users",
        scopes: ["read:users"],
        rateLimit: "100/min",
        handler: async () => {
            return Response.ok({
                users: [
                    { id: "1", name: "Alice", email: "alice@example.com" },
                    { id: "2", name: "Bob", email: "bob@example.com" },
                ],
            });
        },
    })
    .endpoint({
        method: "GET",
        path: "/:id",
        description: "Get user by ID",
        scopes: ["read:users"],
        handler: async (ctx) => {
            const { id } = ctx.request.params;

            if (id === "1") {
                return Response.ok({
                    id: "1",
                    name: "Alice",
                    email: "alice@example.com",
                    createdAt: "2024-01-01T00:00:00Z",
                });
            }

            return Response.notFound("User", id);
        },
    })
    .endpoint({
        method: "POST",
        path: "/",
        description: "Create a new user",
        scopes: ["write:users"],
        handler: async (ctx) => {
            const body = ctx.request.body as { name?: string; email?: string };

            if (!body.name || !body.email) {
                return Response.badRequest("Name and email are required");
            }

            return Response.created({
                id: "3",
                name: body.name,
                email: body.email,
                createdAt: new Date().toISOString(),
            });
        },
    });

// Define Products API
forge
    .api({
        name: "products",
        basePath: "/api/v1/products",
        description: "Product catalog",
    })
    .endpoint({
        method: "GET",
        path: "/",
        description: "List all products",
        scopes: ["read:products"],
        handler: async () => {
            return Response.ok({
                products: [
                    { id: "p1", name: "Widget", price: 9.99 },
                    { id: "p2", name: "Gadget", price: 19.99 },
                ],
            });
        },
    });

// Define Health API (no auth required)
forge
    .api({
        name: "health",
        basePath: "/health",
        description: "Health checks",
    })
    .endpoint({
        method: "GET",
        path: "/",
        description: "Health check endpoint",
        handler: async () => {
            return Response.ok({
                status: "healthy",
                timestamp: new Date().toISOString(),
                version: "0.1.0",
            });
        },
    })
    .endpoint({
        method: "GET",
        path: "/ready",
        description: "Readiness check",
        handler: async () => {
            return Response.ok({ ready: true });
        },
    });

// Mount API Forge on Express
const adapter = expressAdapter(app);
forge.mount(adapter);

// Start server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, () => {
    console.log(`API Forge example server running at http://localhost:${PORT}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET  /health                    - Health check`);
    console.log(`  GET  /health/ready              - Readiness check`);
    console.log(`  POST /oauth/token               - OAuth token endpoint`);
    console.log(`  POST /oauth/revoke              - Token revocation`);
    console.log(`  POST /oauth/introspect          - Token introspection`);
    console.log(`  GET  /.well-known/jwks.json     - JWKS endpoint`);
    console.log(`  GET  /.well-known/oauth-authorization-server - Server metadata`);
    console.log(`  GET  /api/v1/users              - List users (requires read:users)`);
    console.log(`  GET  /api/v1/users/:id          - Get user (requires read:users)`);
    console.log(`  POST /api/v1/users              - Create user (requires write:users)`);
    console.log(`  GET  /api/v1/products           - List products (requires read:products)`);
    console.log(`\nTo test, first create a client by running: bun run seed`);
});
