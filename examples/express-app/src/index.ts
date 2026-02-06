import express from "express";
import path from "path";
import {
    APIForge,
    oauthPlugin,
    rateLimitPlugin,
    Response,
    hashSecret,
} from "@api-forge/core";
import { expressAdapter } from "@api-forge/adapter-express";
import { openapiPlugin } from "@api-forge/plugin-openapi";

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

// OpenAPI documentation
forge.use(openapiPlugin({
    title: "API Forge Demo",
    version: "1.0.0",
    description: "Demo API built with API Forge",
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
            const id = ctx.request.params.id as string;

            if (id === "1") {
                return Response.ok({
                    id: "1",
                    name: "Alice",
                    email: "alice@example.com",
                    createdAt: "2024-01-01T00:00:00Z",
                });
            }

            return Response.notFound(`User ${id} not found`);
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

// Portal API endpoints (for the developer portal to use)
forge
    .api({
        name: "portal",
        basePath: "/portal/api",
        description: "Portal API",
    })
    .endpoint({
        method: "GET",
        path: "/endpoints",
        description: "List all API endpoints",
        handler: async () => {
            return Response.ok({
                endpoints: [
                    {
                        method: "GET",
                        path: "/api/v1/users",
                        description: "List all users",
                        scopes: ["read:users"],
                    },
                    {
                        method: "GET",
                        path: "/api/v1/users/:id",
                        description: "Get user by ID",
                        scopes: ["read:users"],
                    },
                    {
                        method: "POST",
                        path: "/api/v1/users",
                        description: "Create a new user",
                        scopes: ["write:users"],
                    },
                    {
                        method: "GET",
                        path: "/api/v1/products",
                        description: "List all products",
                        scopes: ["read:products"],
                    },
                ],
            });
        },
    })
    .endpoint({
        method: "GET",
        path: "/apps",
        description: "List OAuth apps for current user",
        handler: async () => {
            // Fetch from storage
            const storage = forge.getStorage();
            const clients = await storage.getClientByOwnerId("demo-user");

            return Response.ok({
                apps: clients.map((client) => ({
                    id: client.clientId,
                    name: client.name,
                    clientId: client.clientId,
                    scopes: client.scopes,
                    redirectUris: client.redirectUris,
                    grantTypes: client.grantTypes,
                    isActive: client.isActive,
                    createdAt: client.createdAt.toISOString(),
                })),
            });
        },
    })
    .endpoint({
        method: "POST",
        path: "/apps",
        description: "Create a new OAuth app",
        handler: async (ctx) => {
            const body = ctx.request.body as {
                name?: string;
                scopes?: string[];
                redirectUri?: string;
            };

            if (!body.name) {
                return Response.badRequest("Name is required");
            }

            // Generate credentials
            const clientId = `cli_${Date.now()}`;
            const clientSecret = `sec_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            // Store the client in OAuth storage
            const storage = forge.getStorage();
            await storage.createClient({
                clientId,
                clientSecretHash: hashSecret(clientSecret), // Hash the secret for secure storage
                name: body.name,
                redirectUris: body.redirectUri ? [body.redirectUri] : [],
                grantTypes: ["authorization_code", "client_credentials", "refresh_token"],
                scopes: body.scopes ?? [],
                isConfidential: true,
                ownerId: "demo-user",
                isActive: true,
            });

            return Response.created({
                id: clientId,
                name: body.name,
                clientId,
                clientSecret,
                scopes: body.scopes ?? [],
                redirectUri: body.redirectUri,
                createdAt: new Date().toISOString(),
            });
        },
    })
    .endpoint({
        method: "GET",
        path: "/apps/:id",
        description: "Get single app details",
        handler: async (ctx) => {
            const id = ctx.request.params.id as string;
            const storage = forge.getStorage();
            const client = await storage.getClient(id);

            if (!client || client.ownerId !== "demo-user") {
                return Response.notFound("App not found");
            }

            return Response.ok({
                id: client.clientId,
                name: client.name,
                clientId: client.clientId,
                scopes: client.scopes,
                redirectUris: client.redirectUris,
                grantTypes: client.grantTypes,
                isActive: client.isActive,
                createdAt: client.createdAt.toISOString(),
            });
        },
    })
    .endpoint({
        method: "PUT",
        path: "/apps/:id",
        description: "Update app settings",
        handler: async (ctx) => {
            const id = ctx.request.params.id as string;
            const body = ctx.request.body as {
                name?: string;
                scopes?: string[];
                redirectUris?: string[];
                isActive?: boolean;
            };

            const storage = forge.getStorage();
            const client = await storage.getClient(id);

            if (!client || client.ownerId !== "demo-user") {
                return Response.notFound("App not found");
            }

            const updated = await storage.updateClient(id, {
                ...(body.name && { name: body.name }),
                ...(body.scopes && { scopes: body.scopes }),
                ...(body.redirectUris && { redirectUris: body.redirectUris }),
                ...(body.isActive !== undefined && { isActive: body.isActive }),
            });

            return Response.ok({
                id: updated!.clientId,
                name: updated!.name,
                clientId: updated!.clientId,
                scopes: updated!.scopes,
                redirectUris: updated!.redirectUris,
                grantTypes: updated!.grantTypes,
                isActive: updated!.isActive,
                updatedAt: updated!.updatedAt.toISOString(),
            });
        },
    })
    .endpoint({
        method: "DELETE",
        path: "/apps/:id",
        description: "Delete an app",
        handler: async (ctx) => {
            const id = ctx.request.params.id as string;
            const storage = forge.getStorage();
            const client = await storage.getClient(id);

            if (!client || client.ownerId !== "demo-user") {
                return Response.notFound("App not found");
            }

            await storage.deleteClient(id);
            // Also revoke all tokens for this client
            await storage.revokeAllClientTokens(id);

            return Response.noContent();
        },
    })
    .endpoint({
        method: "POST",
        path: "/apps/:id/regenerate-secret",
        description: "Regenerate client secret",
        handler: async (ctx) => {
            const id = ctx.request.params.id as string;
            const storage = forge.getStorage();
            const client = await storage.getClient(id);

            if (!client || client.ownerId !== "demo-user") {
                return Response.notFound("App not found");
            }

            // Generate new secret
            const newSecret = `sec_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            await storage.updateClient(id, {
                clientSecretHash: hashSecret(newSecret),
            });

            // Revoke all existing tokens for security
            await storage.revokeAllClientTokens(id);

            return Response.ok({
                clientId: id,
                clientSecret: newSecret,
                message: "Secret regenerated. All existing tokens have been revoked.",
            });
        },
    })
    .endpoint({
        method: "GET",
        path: "/scopes",
        description: "List available scopes",
        handler: async () => {
            return Response.ok({
                scopes: [
                    { name: "read:users", description: "Read user information" },
                    { name: "write:users", description: "Create and update users" },
                    { name: "read:products", description: "Read product catalog" },
                    { name: "write:products", description: "Manage product catalog" },
                    { name: "admin", description: "Full administrative access" },
                ],
            });
        },
    })
    .endpoint({
        method: "GET",
        path: "/client",
        description: "Get client info for consent page",
        handler: async (ctx) => {
            const clientId = (ctx.request.query as Record<string, string>).client_id;

            if (!clientId) {
                return Response.badRequest("Missing client_id parameter");
            }

            // Fetch from storage
            const storage = forge.getStorage();
            const client = await storage.getClient(clientId);

            if (!client) {
                return Response.notFound("Client not found");
            }

            return Response.ok({
                name: client.name,
                logoUrl: client.logoUrl ?? null,
                websiteUrl: client.websiteUrl ?? null,
            });
        },
    })
    .endpoint({
        method: "POST",
        path: "/authorize",
        description: "Process consent approval and issue authorization code",
        handler: async (ctx) => {
            const body = ctx.request.body as {
                client_id?: string;
                redirect_uri?: string;
                scope?: string;
                state?: string;
                code_challenge?: string;
                code_challenge_method?: string;
                approved?: boolean;
            };

            if (!body.client_id || !body.redirect_uri) {
                return Response.badRequest("Missing required parameters");
            }

            if (!body.approved) {
                // User denied - redirect with error
                const url = new URL(body.redirect_uri);
                url.searchParams.set("error", "access_denied");
                url.searchParams.set("error_description", "The user denied the authorization request");
                if (body.state) url.searchParams.set("state", body.state);
                return Response.ok({ redirect_url: url.toString() });
            }

            // Generate authorization code
            const code = `authcode_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            // Store the auth code with all parameters
            const storage = forge.getStorage();
            const scopes = body.scope?.split(" ").filter(Boolean) ?? [];

            const authCodeRecord: Parameters<typeof storage.storeAuthCode>[0] = {
                code,
                clientId: body.client_id,
                userId: "demo-user", // In real app, get from session
                redirectUri: body.redirect_uri,
                scopes,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            };

            // Add PKCE if provided
            if (body.code_challenge) {
                authCodeRecord.codeChallenge = body.code_challenge;
                if (body.code_challenge_method === "S256" || body.code_challenge_method === "plain") {
                    authCodeRecord.codeChallengeMethod = body.code_challenge_method;
                }
            }

            await storage.storeAuthCode(authCodeRecord);

            const url = new URL(body.redirect_uri);
            url.searchParams.set("code", code);
            if (body.state) url.searchParams.set("state", body.state);

            return Response.ok({ redirect_url: url.toString() });
        },
    });

// Mount API Forge on Express
const adapter = expressAdapter(app);
forge.mount(adapter);

// Serve the portal static files (AFTER API routes so /portal/api/* works)
const portalPath = path.resolve(import.meta.dir, "../../../packages/portal/dist");
app.use("/portal", express.static(portalPath));

// SPA fallback - serve index.html for all non-API portal routes
app.get("/portal/*", (req, res, next) => {
    // Don't handle API routes - they should have been handled by forge.mount above
    if (req.path.startsWith("/portal/api")) {
        return next();
    }
    res.sendFile(path.join(portalPath, "index.html"));
});

// Redirect root portal to /portal/
app.get("/portal", (_req, res) => {
    res.redirect("/portal/");
});

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
    console.log(`\n  📚 Developer Portal: http://localhost:${PORT}/portal/`);
    console.log(`\nTo test, first create a client by running: bun run seed`);
});
