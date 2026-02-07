/**
 * Blog Platform Example
 *
 * Demonstrates:
 * - Host app auth integration (session-based)
 * - Protected portal endpoints
 * - Public vs Private routes
 * - Resource ownership checks
 * - App creation limits
 * - OAuth for third-party integrations
 */

import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import {
    APIForge,
    oauthPlugin,
    rateLimitPlugin,
    Response,
    hashSecret,
    type AuthenticatedUser,
} from "@api-forge/core";
import { expressAdapter } from "@api-forge/adapter-express";
import { openapiPlugin } from "@api-forge/plugin-openapi";

// ============================================================================
// TYPES
// ============================================================================

interface BlogPost {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    published: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface User {
    id: string;
    email: string;
    name: string;
    password: string; // In production, this would be hashed
}

// ============================================================================
// IN-MEMORY DATA STORE (Replace with real DB in production)
// ============================================================================

const users: Map<string, User> = new Map([
    ["user_1", { id: "user_1", email: "alice@example.com", name: "Alice", password: "password123" }],
    ["user_2", { id: "user_2", email: "bob@example.com", name: "Bob", password: "password456" }],
]);

const posts: Map<string, BlogPost> = new Map([
    ["post_1", {
        id: "post_1",
        title: "Getting Started with API Forge",
        content: "API Forge makes building OAuth-protected APIs easy...",
        authorId: "user_1",
        authorName: "Alice",
        published: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }],
]);

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to true in production with HTTPS
}));

// Extend session types
declare module "express-session" {
    interface SessionData {
        userId?: string;
    }
}

const ISSUER = process.env.ISSUER ?? "http://localhost:4000";

// ============================================================================
// API FORGE SETUP
// ============================================================================

const forge = new APIForge({
    auth: {
        grants: ["client_credentials", "authorization_code", "refresh_token"],
        scopes: {
            "read:posts": "Read blog posts",
            "write:posts": "Create and edit blog posts",
            "delete:posts": "Delete blog posts",
            "read:profile": "Read user profile",
        },
        pkce: { required: "public_clients" },
    },
});

// OAuth plugin with HOST APP AUTH INTEGRATION
forge.use(oauthPlugin({
    issuer: ISSUER,
    audience: ISSUER,

    // 🔑 INTEGRATE WITH HOST APP'S AUTH SYSTEM
    userAuth: {
        // Get current user from session
        getCurrentUser: (req: unknown): AuthenticatedUser | null => {
            const expressReq = req as express.Request;
            const userId = expressReq.session?.userId;
            if (!userId) return null;

            const user = users.get(userId);
            if (!user) return null;

            return {
                id: user.id,
                name: user.name,
                email: user.email,
            };
        },

        // Where to redirect if not logged in
        loginUrl: "/auth/login",

        // Optional: Check if user can create apps
        canCreateApps: (user) => {
            // You could check user roles, subscription tier, etc.
            return true;
        },
    },

    // 🔒 LIMIT APPS PER USER
    maxAppsPerUser: 5,
    maxRedirectUrisPerApp: 10,
}));

// Rate limiting: configurable per-user or per-app
forge.use(rateLimitPlugin({
    globalLimit: "1000/hour",
    includeHeaders: true,
}));

// OpenAPI documentation
forge.use(openapiPlugin({
    title: "Blog Platform API",
    version: "1.0.0",
    description: "A blog platform demonstrating API Forge with auth integration",
}));

// ============================================================================
// PUBLIC ROUTES (No auth required)
// ============================================================================

forge
    .api({
        name: "posts-public",
        basePath: "/api/v1/posts",
        description: "Public blog post endpoints",
    })
    // GET /posts - List published posts (PUBLIC)
    .endpoint({
        method: "GET",
        path: "/",
        description: "List all published posts",
        // No scopes = public endpoint
        handler: async () => {
            const publishedPosts = Array.from(posts.values())
                .filter(p => p.published)
                .map(({ content, ...rest }) => rest); // Omit full content

            return Response.ok({ posts: publishedPosts });
        },
    })
    // GET /posts/:id - Read single post (PUBLIC)
    .endpoint({
        method: "GET",
        path: "/:id",
        description: "Get a blog post by ID",
        handler: async (ctx) => {
            const id = ctx.request.params.id as string;
            const post = posts.get(id);

            if (!post || !post.published) {
                return Response.notFound("Post not found");
            }

            return Response.ok({ post });
        },
    });

// ============================================================================
// PROTECTED ROUTES (Token required)
// ============================================================================

forge
    .api({
        name: "posts-protected",
        basePath: "/api/v1/posts",
        description: "Protected blog post endpoints",
    })
    // POST /posts - Create post (REQUIRES write:posts SCOPE)
    .endpoint({
        method: "POST",
        path: "/",
        description: "Create a new blog post",
        scopes: ["write:posts"],
        handler: async (ctx) => {
            const oauth = ctx.request.oauth;
            if (!oauth?.sub) {
                return Response.json(401, { error: "unauthorized" });
            }

            const body = ctx.request.body as { title: string; content: string };
            const authorId = oauth.sub;
            const author = users.get(authorId);

            const post: BlogPost = {
                id: `post_${Date.now()}`,
                title: body.title,
                content: body.content,
                authorId,
                authorName: author?.name ?? "Unknown",
                published: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            posts.set(post.id, post);

            return Response.created({ post });
        },
    })
    // PUT /posts/:id - Update post (REQUIRES OWNERSHIP)
    .endpoint({
        method: "PUT",
        path: "/:id",
        description: "Update a blog post (owner only)",
        scopes: ["write:posts"],
        // 🔒 OWNERSHIP CHECK: Only author can edit
        handler: async (ctx) => {
            const id = ctx.request.params.id as string;
            const oauth = ctx.request.oauth;

            if (!oauth?.sub) {
                return Response.json(401, { error: "unauthorized" });
            }

            const post = posts.get(id);
            if (!post) {
                return Response.notFound("Post not found");
            }

            // 🔒 OWNERSHIP CHECK
            if (post.authorId !== oauth.sub) {
                return Response.json(403, {
                    error: "forbidden",
                    message: "You can only edit your own posts",
                });
            }

            const body = ctx.request.body as Partial<BlogPost>;
            const updated: BlogPost = {
                ...post,
                title: body.title ?? post.title,
                content: body.content ?? post.content,
                published: body.published ?? post.published,
                updatedAt: new Date(),
            };

            posts.set(id, updated);

            return Response.ok({ post: updated });
        },
    })
    // DELETE /posts/:id - Delete post (REQUIRES OWNERSHIP)
    .endpoint({
        method: "DELETE",
        path: "/:id",
        description: "Delete a blog post (owner only)",
        scopes: ["delete:posts"],
        handler: async (ctx) => {
            const id = ctx.request.params.id as string;
            const oauth = ctx.request.oauth;

            if (!oauth?.sub) {
                return Response.json(401, { error: "unauthorized" });
            }

            const post = posts.get(id);
            if (!post) {
                return Response.notFound("Post not found");
            }

            // 🔒 OWNERSHIP CHECK
            if (post.authorId !== oauth.sub) {
                return Response.json(403, {
                    error: "forbidden",
                    message: "You can only delete your own posts",
                });
            }

            posts.delete(id);

            return Response.noContent();
        },
    });

// ============================================================================
// USER PROFILE ROUTES
// ============================================================================

forge
    .api({
        name: "profile",
        basePath: "/api/v1/me",
        description: "User profile endpoints",
    })
    .endpoint({
        method: "GET",
        path: "/",
        description: "Get current user profile",
        scopes: ["read:profile"],
        handler: async (ctx) => {
            const oauth = ctx.request.oauth;
            if (!oauth?.sub) {
                return Response.json(401, { error: "unauthorized" });
            }

            const user = users.get(oauth.sub);
            if (!user) {
                return Response.notFound("User not found");
            }

            // Get user's posts
            const userPosts = Array.from(posts.values())
                .filter(p => p.authorId === oauth.sub)
                .map(({ content, ...rest }) => rest);

            return Response.ok({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
                posts: userPosts,
            });
        },
    });

// ============================================================================
// PORTAL API ROUTES (Developer Portal)
// ============================================================================

// Helper to get current user from session via the raw Express request
function getCurrentUserId(ctx: { request: { _originalRequest?: unknown } }): string | null {
    const req = ctx.request._originalRequest as express.Request | undefined;
    return req?.session?.userId ?? null;
}

// Response for redirecting to login
function loginRequired() {
    return Response.json(401, {
        error: "login_required",
        login_url: "/auth/login",
        message: "Please log in to access this feature",
    });
}

forge
    .api({
        name: "portal",
        basePath: "/portal/api",
        description: "Developer Portal API",
    })
    .endpoint({
        method: "GET",
        path: "/endpoints",
        description: "List all API endpoints",
        handler: async () => {
            return Response.ok({
                endpoints: [
                    { method: "GET", path: "/api/v1/posts", description: "List all posts", scopes: [] },
                    { method: "GET", path: "/api/v1/posts/:id", description: "Get a post", scopes: [] },
                    { method: "POST", path: "/api/v1/posts", description: "Create post", scopes: ["write:posts"] },
                    { method: "PUT", path: "/api/v1/posts/:id", description: "Update post", scopes: ["write:posts"] },
                    { method: "DELETE", path: "/api/v1/posts/:id", description: "Delete post", scopes: ["delete:posts"] },
                    { method: "GET", path: "/api/v1/me", description: "Get profile", scopes: ["read:profile"] },
                ],
            });
        },
    })
    .endpoint({
        method: "GET",
        path: "/apps",
        description: "List OAuth apps for current user",
        handler: async (ctx) => {
            const userId = getCurrentUserId(ctx);
            if (!userId) {
                return Response.ok({ apps: [] });
            }

            const storage = forge.getStorage();
            const clients = await storage.getClientByOwnerId(userId);

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
            const userId = getCurrentUserId(ctx);
            if (!userId) {
                return loginRequired();
            }

            const body = ctx.request.body as { name?: string; scopes?: string[]; redirectUri?: string };
            if (!body.name) {
                return Response.badRequest("Name is required");
            }

            const clientId = `cli_${Date.now()}`;
            const clientSecret = `sec_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            const storage = forge.getStorage();
            await storage.createClient({
                clientId,
                clientSecretHash: hashSecret(clientSecret),
                name: body.name,
                redirectUris: body.redirectUri ? [body.redirectUri] : [],
                grantTypes: ["authorization_code", "client_credentials", "refresh_token"],
                scopes: body.scopes ?? [],
                isConfidential: true,
                ownerId: userId,
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
            const userId = getCurrentUserId(ctx);
            const storage = forge.getStorage();
            const client = await storage.getClient(id);

            if (!client || client.ownerId !== userId) {
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
            const userId = getCurrentUserId(ctx);
            const body = ctx.request.body as { name?: string; scopes?: string[]; redirectUris?: string[]; isActive?: boolean };

            const storage = forge.getStorage();
            const client = await storage.getClient(id);

            if (!client || client.ownerId !== userId) {
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
                scopes: updated!.scopes,
                redirectUris: updated!.redirectUris,
                isActive: updated!.isActive,
            });
        },
    })
    .endpoint({
        method: "DELETE",
        path: "/apps/:id",
        description: "Delete an app",
        handler: async (ctx) => {
            const id = ctx.request.params.id as string;
            const userId = getCurrentUserId(ctx);
            const storage = forge.getStorage();
            const client = await storage.getClient(id);

            if (!client || client.ownerId !== userId) {
                return Response.notFound("App not found");
            }

            await storage.deleteClient(id);
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
            const userId = getCurrentUserId(ctx);
            const storage = forge.getStorage();
            const client = await storage.getClient(id);

            if (!client || client.ownerId !== userId) {
                return Response.notFound("App not found");
            }

            const newSecret = `sec_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            await storage.updateClient(id, { clientSecretHash: hashSecret(newSecret) });
            await storage.revokeAllClientTokens(id);

            return Response.ok({ clientId: id, clientSecret: newSecret, message: "Secret regenerated" });
        },
    })
    .endpoint({
        method: "GET",
        path: "/scopes",
        description: "List available scopes",
        handler: async () => {
            return Response.ok({
                scopes: [
                    { name: "read:posts", description: "Read blog posts" },
                    { name: "write:posts", description: "Create and edit blog posts" },
                    { name: "delete:posts", description: "Delete blog posts" },
                    { name: "read:profile", description: "Read user profile" },
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
            if (!clientId) return Response.badRequest("Missing client_id");

            const storage = forge.getStorage();
            const client = await storage.getClient(clientId);
            if (!client) return Response.notFound("Client not found");

            return Response.ok({ name: client.name, logoUrl: client.logoUrl ?? null });
        },
    })
    .endpoint({
        method: "POST",
        path: "/authorize",
        description: "Process consent approval",
        handler: async (ctx) => {
            const userId = getCurrentUserId(ctx);
            if (!userId) return Response.json(401, { error: "Login required" });

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
                const url = new URL(body.redirect_uri);
                url.searchParams.set("error", "access_denied");
                if (body.state) url.searchParams.set("state", body.state);
                return Response.ok({ redirect_url: url.toString() });
            }

            const code = `authcode_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const storage = forge.getStorage();
            const scopes = body.scope?.split(" ").filter(Boolean) ?? [];

            const authCodeRecord: Parameters<typeof storage.storeAuthCode>[0] = {
                code,
                clientId: body.client_id,
                userId,
                redirectUri: body.redirect_uri,
                scopes,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            };

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

// ============================================================================
// HOST APP AUTH ROUTES (Not part of API Forge)
// ============================================================================

// Login page
app.get("/auth/login", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Login - Blog Platform</title></head>
        <body style="font-family: system-ui; max-width: 400px; margin: 100px auto; padding: 20px;">
            <h1>Login</h1>
            <form method="POST" action="/auth/login">
                <div style="margin-bottom: 16px;">
                    <label>Email:</label><br>
                    <input type="email" name="email" value="alice@example.com" style="width: 100%; padding: 8px;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label>Password:</label><br>
                    <input type="password" name="password" value="password123" style="width: 100%; padding: 8px;">
                </div>
                <button type="submit" style="padding: 8px 24px;">Login</button>
            </form>
            <p style="color: #666; font-size: 14px;">
                Demo accounts: alice@example.com / password123, bob@example.com / password456
            </p>
        </body>
        </html>
    `);
});

// Login handler
app.post("/auth/login", express.urlencoded({ extended: true }), (req, res) => {
    const { email, password } = req.body;

    const user = Array.from(users.values()).find(
        u => u.email === email && u.password === password
    );

    if (!user) {
        res.status(401).send("Invalid credentials");
        return;
    }

    // Set session
    req.session.userId = user.id;

    // Redirect to portal or original destination
    const returnTo = req.query.returnTo as string || "/portal";
    res.redirect(returnTo);
});

// Logout
app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// ============================================================================
// MOUNT API FORGE
// ============================================================================

const adapter = expressAdapter(app);
forge.mount(adapter);

// Serve portal static files - PROTECTED by login
import path from "path";
const portalPath = path.resolve(import.meta.dir, "../../../packages/portal/dist");

// Auth middleware for portal pages (not API routes - those handle auth themselves)
app.use("/portal", (req, res, next) => {
    // Allow API routes through - they handle auth themselves
    if (req.path.startsWith("/api")) {
        return next();
    }

    // Check if user is logged in
    if (!req.session?.userId) {
        // Redirect to login with return URL
        const returnTo = encodeURIComponent(req.originalUrl);
        return res.redirect(`/auth/login?returnTo=${returnTo}`);
    }

    next();
});

app.use("/portal", express.static(portalPath));

// SPA fallback for portal
app.get("/portal/*", (req, res, next) => {
    if (req.path.startsWith("/portal/api")) return next();
    res.sendFile(path.join(portalPath, "index.html"));
});

app.get("/portal", (_req, res) => res.redirect("/portal/"));

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    Blog Platform Example                      ║
╠══════════════════════════════════════════════════════════════╣
║  Server:     http://localhost:${PORT}                           ║
║  Docs:       http://localhost:${PORT}/docs                      ║
║  Portal:     http://localhost:${PORT}/portal                    ║
║  Login:      http://localhost:${PORT}/auth/login                ║
╠══════════════════════════════════════════════════════════════╣
║  DEMO:                                                        ║
║  1. Login at /auth/login (alice@example.com / password123)   ║
║  2. Go to /portal to create OAuth apps                       ║
║  3. Use /docs to explore the API                             ║
╚══════════════════════════════════════════════════════════════╝
    `);
});

