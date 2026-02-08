<p align="center">
  <img src="https://raw.githubusercontent.com/dilukangelosl/API-Forge/main/packages/portal/public/logo.svg" alt="API Forge" width="120" />
</p>

<h1 align="center">API Forge</h1>

<p align="center">
  <strong>The complete OAuth 2.0 + API Gateway + Developer Portal solution for TypeScript</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#storage-adapters">Storage</a> •
  <a href="#examples">Examples</a>
</p>

---

## Overview

API Forge transforms any TypeScript/JavaScript HTTP application into a full-featured developer platform. Add OAuth 2.0 authentication, rate limiting, auto-generated documentation, and a self-service developer portal with minimal configuration.

```typescript
import { APIForge, oauthPlugin, rateLimitPlugin } from "@api-forge/core";
import { expressAdapter } from "@api-forge/adapter-express";

const forge = new APIForge({
    auth: {
        grants: ["client_credentials", "authorization_code"],
        scopes: { "read:users": "Read user data" },
    },
});

forge.use(oauthPlugin({ issuer: "https://api.example.com" }));
forge.mount(expressAdapter(app));
```

## Features

### 🔐 OAuth 2.0 Authorization Server
- **Authorization Code + PKCE** - Secure flow for web and mobile apps
- **Client Credentials** - Machine-to-machine authentication  
- **Refresh Tokens** - Automatic token renewal
- **JWT Access Tokens** - RS256 signed, industry standard

### ⚡ API Gateway
- **Rate Limiting** - Configurable per-endpoint or global limits
- **Scope-based Authorization** - Fine-grained access control
- **Request Validation** - Schema validation for inputs

### 📚 Auto-Generated Documentation
- **OpenAPI 3.1** - Full specification auto-generated from routes
- **Interactive Docs** - Scalar-powered API explorer
- **Try It Out** - Test endpoints directly from documentation

### 🎨 Developer Portal
- **Self-Service Registration** - Developers create their own apps
- **OAuth Client Management** - Generate and rotate credentials
- **Usage Analytics** - Monitor API consumption

### 🔌 Framework Agnostic
Works with any JavaScript/TypeScript HTTP framework:

| Framework | Package |
|-----------|---------|
| Express | `@api-forge/adapter-express` |
| Hono | `@api-forge/adapter-hono` *(coming soon)* |
| Fastify | `@api-forge/adapter-fastify` *(coming soon)* |

---

## Quick Start

### Installation

```bash
# Core package
npm install @api-forge/core

# Framework adapter (Express)
npm install @api-forge/adapter-express

# Optional: Storage adapters
npm install @api-forge/storage-prisma
# or
npm install @api-forge/storage-drizzle
```

### Basic Setup

```typescript
import express from "express";
import { APIForge, oauthPlugin, rateLimitPlugin, Response } from "@api-forge/core";
import { expressAdapter } from "@api-forge/adapter-express";

// Create Express app
const app = express();
app.use(express.json());

// Initialize API Forge
const forge = new APIForge({
    auth: {
        grants: ["client_credentials", "authorization_code", "refresh_token"],
        scopes: {
            "read:users": "Read user information",
            "write:users": "Create and update users",
        },
    },
    rateLimit: {
        global: "1000/hour",
    },
});

// Register plugins
forge.use(oauthPlugin({
    issuer: "http://localhost:3000",
    audience: "http://localhost:3000",
}));

forge.use(rateLimitPlugin({
    globalLimit: "1000/hour",
    includeHeaders: true,
}));

// Define your API
forge
    .api({
        name: "users",
        basePath: "/api/v1/users",
        description: "User management API",
    })
    .endpoint({
        method: "GET",
        path: "/",
        description: "List all users",
        scopes: ["read:users"],
        handler: async () => {
            return Response.ok({ users: [] });
        },
    })
    .endpoint({
        method: "POST",
        path: "/",
        description: "Create a new user",
        scopes: ["write:users"],
        handler: async (ctx) => {
            const body = ctx.request.body;
            // Create user logic here
            return Response.created({ user: body });
        },
    });

// Mount API Forge on Express
const adapter = expressAdapter(app);
forge.mount(adapter);

// Start server
app.listen(3000, () => {
    console.log("🚀 Server running at http://localhost:3000");
    console.log("📚 API Docs: http://localhost:3000/docs");
    console.log("🔑 OAuth Token: POST http://localhost:3000/oauth/token");
});
```

---

## API Reference

### Creating Endpoints

```typescript
forge
    .api({
        name: "products",
        basePath: "/api/v1/products",
    })
    .endpoint({
        method: "GET",
        path: "/",
        description: "List products",
        scopes: ["read:products"],
        rateLimit: "100/min", // Override global limit
        handler: async (ctx) => {
            return Response.ok({ products: [] });
        },
    })
    .endpoint({
        method: "GET",
        path: "/:id",
        description: "Get product by ID",
        scopes: ["read:products"],
        handler: async (ctx) => {
            const id = ctx.request.params.id;
            return Response.ok({ product: { id } });
        },
    });
```

### Response Helpers

```typescript
import { Response } from "@api-forge/core";

// Success responses
Response.ok({ data: "success" });           // 200
Response.created({ id: "123" });            // 201
Response.noContent();                        // 204

// Error responses
Response.badRequest("Invalid input");        // 400
Response.unauthorized("Invalid token");      // 401
Response.forbidden("Insufficient scope");    // 403
Response.notFound("Resource not found");     // 404

// Custom response
Response.json(418, { message: "I'm a teapot" });
```

### Request Context

```typescript
handler: async (ctx) => {
    // Request data
    ctx.request.body;          // Parsed JSON body
    ctx.request.params;        // URL parameters (:id)
    ctx.request.query;         // Query string (?page=1)
    ctx.request.headers;       // Request headers
    ctx.request.ip;            // Client IP address

    // Authentication (when using OAuth)
    ctx.auth?.clientId;        // OAuth client ID
    ctx.auth?.userId;          // User ID (if user context)
    ctx.auth?.scopes;          // Authorized scopes
}
```

---

## OAuth 2.0 Flows

### Client Credentials Flow

For machine-to-machine authentication:

```bash
# Get access token
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "scope": "read:users write:users"
  }'

# Response
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "read:users write:users"
}
```

### Authorization Code Flow (with PKCE)

For web and mobile applications:

```bash
# Step 1: Redirect user to authorize
GET /oauth/authorize?
  response_type=code&
  client_id=your-client-id&
  redirect_uri=https://yourapp.com/callback&
  scope=read:users&
  state=random-state&
  code_challenge=E9Mz...&
  code_challenge_method=S256

# Step 2: Exchange code for tokens
POST /oauth/token
{
  "grant_type": "authorization_code",
  "code": "auth-code-from-callback",
  "client_id": "your-client-id",
  "redirect_uri": "https://yourapp.com/callback",
  "code_verifier": "original-code-verifier"
}
```

### Using Access Tokens

```bash
curl http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Storage Adapters

API Forge uses storage adapters for persisting OAuth clients, tokens, and rate limit data.

### Memory Storage (Default)

Built-in, perfect for development:

```typescript
const forge = new APIForge({
    // Memory storage is used by default
});
```

### Prisma Storage

Production-ready with any Prisma-supported database:

```bash
npm install @api-forge/storage-prisma
```

```typescript
import { PrismaStorageAdapter } from "@api-forge/storage-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const storage = new PrismaStorageAdapter({ prisma });

const forge = new APIForge({
    storage: { adapter: storage },
});
```

See [Prisma Storage Guide](./packages/storage-prisma/README.md) for schema setup.

### Drizzle Storage

Lightweight ORM alternative:

```bash
npm install @api-forge/storage-drizzle
```

```typescript
import { DrizzleStorageAdapter } from "@api-forge/storage-drizzle";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(pool);
const storage = new DrizzleStorageAdapter({ db });

const forge = new APIForge({
    storage: { adapter: storage },
});
```

See [Drizzle Storage Guide](./packages/storage-drizzle/README.md) for schema setup.

### Custom Storage

Implement the `StorageAdapter` interface:

```typescript
import type { StorageAdapter } from "@api-forge/core";

class MyStorageAdapter implements StorageAdapter {
    async createClient(client) { /* ... */ }
    async getClient(clientId) { /* ... */ }
    async storeToken(token) { /* ... */ }
    // ... implement all methods
}
```

---

## Plugins

### OpenAPI Documentation

Auto-generate OpenAPI 3.1 specs and interactive docs:

```typescript
import { openapiPlugin } from "@api-forge/plugin-openapi";

forge.use(openapiPlugin({
    title: "My API",
    version: "1.0.0",
    description: "API documentation",
}));

// Access docs at:
// GET /docs         - Interactive documentation
// GET /.well-known/openapi.json - OpenAPI spec
```

### Rate Limiting

Protect your API from abuse:

```typescript
import { rateLimitPlugin } from "@api-forge/core";

forge.use(rateLimitPlugin({
    globalLimit: "1000/hour",
    includeHeaders: true, // X-RateLimit-* headers
}));

// Per-endpoint limits
.endpoint({
    method: "POST",
    path: "/expensive",
    rateLimit: "10/min", // Override for this endpoint
    handler: async () => { /* ... */ }
});
```

---

## Examples

### Express App

Complete example with OAuth, rate limiting, and user API:

```bash
cd examples/express-app
bun install
bun run dev
```

### Prisma Storage

Using SQLite with Prisma for OAuth storage:

```bash
cd examples/prisma-storage
bun install
bun run db:push
bun run dev
```

### Drizzle Storage

Using Bun SQLite with Drizzle ORM:

```bash
cd examples/drizzle-storage
bun install
bun run db:push
bun run dev
```

---

## Project Structure

```
@api-forge/
├── core/              # Core functionality (OAuth, rate limiting)
├── adapter-express/   # Express.js adapter
├── plugin-openapi/    # OpenAPI documentation plugin
├── storage-prisma/    # Prisma storage adapter
├── storage-drizzle/   # Drizzle storage adapter
└── portal/            # Developer portal UI
```

---

## Configuration Reference

```typescript
new APIForge({
    // Authentication settings
    auth: {
        grants: ["client_credentials", "authorization_code", "refresh_token"],
        accessTokenTTL: 900,      // 15 minutes
        refreshTokenTTL: 604800,  // 7 days
        authCodeTTL: 600,         // 10 minutes
        pkce: {
            required: "public_clients", // "always" | "public_clients" | "never"
        },
        scopes: {
            "scope:name": "Human readable description",
        },
    },

    // Rate limiting
    rateLimit: {
        global: "1000/hour",
        headers: true,
    },

    // Storage adapter
    storage: {
        adapter: customAdapter, // StorageAdapter implementation
    },
});
```

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT © Diluk Angelo

---

<p align="center">
  Built with ❤️ for the developer community
</p>
