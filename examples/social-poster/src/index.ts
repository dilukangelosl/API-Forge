/**
 * Social Poster - OAuth Client Example
 *
 * This is a THIRD-PARTY APPLICATION that uses OAuth to post on behalf of users.
 * It demonstrates:
 * - OAuth authorization_code flow with PKCE
 * - Acting on behalf of authenticated users
 * - Scoped access (can only access user's own resources)
 * - Token management (access + refresh tokens)
 *
 * IMPORTANT: This app CANNOT access other users' data because:
 * 1. Tokens are scoped to the user who authorized
 * 2. Blog Platform checks ownership (authorId === oauth.sub)
 */

import express from "express";
import session from "express-session";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "social-poster-secret",
    resave: false,
    saveUninitialized: false,
}));

// Extend session types
declare module "express-session" {
    interface SessionData {
        accessToken?: string;
        refreshToken?: string;
        codeVerifier?: string;
        state?: string;
    }
}

// Configuration - In production, use environment variables
const CONFIG = {
    // This app's settings
    port: 5000,
    baseUrl: "http://localhost:5000",

    // Blog Platform OAuth settings (you'd register this app first)
    blogPlatformUrl: "http://localhost:4000",
    clientId: "social_poster_client", // Register this in Blog Platform
    clientSecret: "social_poster_secret",
    redirectUri: "http://localhost:5000/callback",
    scopes: ["write:posts", "read:profile"],
};

// ============================================================================
// OAUTH UTILITIES
// ============================================================================

function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
    return crypto.randomBytes(16).toString("hex");
}

// ============================================================================
// ROUTES
// ============================================================================

// Home page
app.get("/", (req, res) => {
    const isLoggedIn = !!req.session.accessToken;

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Social Poster - OAuth Client Example</title>
            <style>
                body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 40px; }
                .card { background: #f5f5f5; padding: 24px; border-radius: 8px; margin: 16px 0; }
                button, .btn { padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; text-decoration: none; display: inline-block; }
                button:hover, .btn:hover { background: #1d4ed8; }
                .danger { background: #dc2626; }
                textarea { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #ccc; }
                input { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #ccc; margin-bottom: 12px; }
                .status { padding: 8px 16px; border-radius: 4px; display: inline-block; }
                .status.connected { background: #dcfce7; color: #166534; }
                .status.disconnected { background: #fef2f2; color: #991b1b; }
                h1 { color: #1e293b; }
                h2 { color: #475569; }
            </style>
        </head>
        <body>
            <h1>🐦 Social Poster</h1>
            <p>A third-party app that posts to Blog Platform on your behalf.</p>

            <div class="card">
                <h2>Connection Status</h2>
                ${isLoggedIn
            ? `<span class="status connected">✅ Connected to Blog Platform</span>
                       <br><br>
                       <a href="/disconnect" class="btn danger">Disconnect</a>`
            : `<span class="status disconnected">❌ Not Connected</span>
                       <br><br>
                       <a href="/connect" class="btn">Connect to Blog Platform</a>`
        }
            </div>

            ${isLoggedIn ? `
                <div class="card">
                    <h2>Create Post</h2>
                    <form method="POST" action="/post">
                        <input type="text" name="title" placeholder="Post title" required>
                        <textarea name="content" rows="4" placeholder="Post content..." required></textarea>
                        <br><br>
                        <button type="submit">📝 Post to Blog</button>
                    </form>
                </div>

                <div class="card">
                    <h2>My Profile</h2>
                    <a href="/profile" class="btn">View Profile</a>
                </div>
            ` : ""}

            <div class="card">
                <h2>How This Works</h2>
                <p>This app demonstrates OAuth 2.0 authorization code flow with PKCE:</p>
                <ol>
                    <li>Click "Connect to Blog Platform"</li>
                    <li>You're redirected to Blog Platform to login</li>
                    <li>Blog Platform asks for your consent</li>
                    <li>You're redirected back with an authorization code</li>
                    <li>This app exchanges the code for access tokens</li>
                    <li>Now we can post on YOUR behalf (not other users!)</li>
                </ol>
                <p><strong>Security:</strong> Even with your token, we can only access YOUR posts. The Blog Platform verifies ownership (authorId === your user ID).</p>
            </div>
        </body>
        </html>
    `);
});

// Start OAuth flow
app.get("/connect", (req, res) => {
    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store in session
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    // Build authorization URL
    const authUrl = new URL(`${CONFIG.blogPlatformUrl}/oauth/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", CONFIG.clientId);
    authUrl.searchParams.set("redirect_uri", CONFIG.redirectUri);
    authUrl.searchParams.set("scope", CONFIG.scopes.join(" "));
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    res.redirect(authUrl.toString());
});

// OAuth callback
app.get("/callback", async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        res.status(400).send(`OAuth error: ${error}`);
        return;
    }

    // Verify state
    if (state !== req.session.state) {
        res.status(400).send("Invalid state parameter");
        return;
    }

    // Exchange code for tokens
    try {
        const tokenResponse = await fetch(`${CONFIG.blogPlatformUrl}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code as string,
                redirect_uri: CONFIG.redirectUri,
                client_id: CONFIG.clientId,
                client_secret: CONFIG.clientSecret,
                code_verifier: req.session.codeVerifier!,
            }),
        });

        if (!tokenResponse.ok) {
            const err = await tokenResponse.json();
            res.status(400).send(`Token exchange failed: ${JSON.stringify(err)}`);
            return;
        }

        const tokens = await tokenResponse.json() as {
            access_token: string;
            refresh_token?: string;
        };

        // Store tokens in session
        req.session.accessToken = tokens.access_token;
        req.session.refreshToken = tokens.refresh_token;

        // Clear OAuth state
        delete req.session.codeVerifier;
        delete req.session.state;

        res.redirect("/");
    } catch (err) {
        res.status(500).send(`Error: ${err}`);
    }
});

// Disconnect (revoke tokens)
app.get("/disconnect", async (req, res) => {
    if (req.session.accessToken) {
        // Revoke token at Blog Platform
        try {
            await fetch(`${CONFIG.blogPlatformUrl}/oauth/revoke`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    token: req.session.accessToken,
                    client_id: CONFIG.clientId,
                    client_secret: CONFIG.clientSecret,
                }),
            });
        } catch {
            // Ignore revocation errors
        }
    }

    req.session.destroy(() => {
        res.redirect("/");
    });
});

// Create post (using OAuth token)
app.post("/post", async (req, res) => {
    if (!req.session.accessToken) {
        res.redirect("/connect");
        return;
    }

    const { title, content } = req.body;

    try {
        const response = await fetch(`${CONFIG.blogPlatformUrl}/api/v1/posts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.accessToken}`,
            },
            body: JSON.stringify({ title, content }),
        });

        if (!response.ok) {
            const err = await response.json();
            res.send(`
                <h1>Error Creating Post</h1>
                <pre>${JSON.stringify(err, null, 2)}</pre>
                <a href="/">Back</a>
            `);
            return;
        }

        const result = await response.json();
        res.send(`
            <h1>✅ Post Created!</h1>
            <pre>${JSON.stringify(result, null, 2)}</pre>
            <a href="/">Back</a>
        `);
    } catch (err) {
        res.status(500).send(`Error: ${err}`);
    }
});

// View profile
app.get("/profile", async (req, res) => {
    if (!req.session.accessToken) {
        res.redirect("/connect");
        return;
    }

    try {
        const response = await fetch(`${CONFIG.blogPlatformUrl}/api/v1/me`, {
            headers: {
                "Authorization": `Bearer ${req.session.accessToken}`,
            },
        });

        if (!response.ok) {
            const err = await response.json();
            res.send(`
                <h1>Error Fetching Profile</h1>
                <pre>${JSON.stringify(err, null, 2)}</pre>
                <a href="/">Back</a>
            `);
            return;
        }

        const profile = await response.json();
        res.send(`
            <h1>Your Profile</h1>
            <pre>${JSON.stringify(profile, null, 2)}</pre>
            <a href="/">Back</a>
        `);
    } catch (err) {
        res.status(500).send(`Error: ${err}`);
    }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(CONFIG.port, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  Social Poster (OAuth Client)                 ║
╠══════════════════════════════════════════════════════════════╣
║  This App:      http://localhost:${CONFIG.port}                         ║
║  Blog Platform: http://localhost:4000                        ║
╠══════════════════════════════════════════════════════════════╣
║  SETUP:                                                       ║
║  1. Start Blog Platform first (port 4000)                    ║
║  2. Register this app in Blog Platform's portal              ║
║  3. Update clientId/clientSecret in CONFIG                   ║
║  4. Click "Connect to Blog Platform"                         ║
╚══════════════════════════════════════════════════════════════╝
    `);
});
