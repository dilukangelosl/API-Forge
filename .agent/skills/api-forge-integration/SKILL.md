---
name: api-forge-integration
description: Integration patterns for building apps with the API Forge framework
---

# API Forge Integration Skill

You are an expert at integrating the `@dilukangelo/api-forge-*` framework into TypeScript/JavaScript applications. API Forge is a framework-agnostic toolkit for building unified APIs with built-in OAuth, OpenAPI, and interchangeable storage backends.

## Core Packages
- **`@dilukangelo/api-forge-core`**: The essential platform, routing, and plugin interfaces.
- **`@dilukangelo/api-forge-adapter-express`**: The Express.js web framework adapter.
- **`@dilukangelo/api-forge-storage-prisma`**: Prisma ORM storage implementation.
- **`@dilukangelo/api-forge-storage-drizzle`**: Drizzle ORM storage implementation.
- **`@dilukangelo/api-forge-plugin-openapi`**: Automatic Swagger/Scalar REST documentation generator.

## Key Principles

### 1. Framework Agnosticism
API Forge uses its own `Router`, `Request`, and `Response` abstractions. NEVER write native Express/Hono/Fastify route handlers if you can write an API Forge route.

```typescript
import { Router } from "@dilukangelo/api-forge-core";

const router = new Router();
router.get("/hello", async (req, res) => {
    res.json({ message: "Hello World" });
});
```

### 2. Platform Initialization
Always configure the `Platform` instance first. The platform connects the Router, Storage, and Plugins.

```typescript
import { Platform } from "@dilukangelo/api-forge-core";
import { MemoryStorageAdapter } from "@dilukangelo/api-forge-core/storage/memory";

const platform = new Platform({
    storage: new MemoryStorageAdapter(),
    jwtSecret: "your-super-secret-key"
});
```

### 3. Database Selection (Prisma vs Drizzle)

**When using Prisma:**
```typescript
import { PrismaStorageAdapter } from "@dilukangelo/api-forge-storage-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const storage = new PrismaStorageAdapter(prisma);
// Ensure you have copied the necessary schema additions from @dilukangelo/api-forge-storage-prisma/prisma/schema.prisma
```

**When using Drizzle:**
```typescript
import { DrizzleStorageAdapter } from "@dilukangelo/api-forge-storage-drizzle";
import { db } from "./your-db"; // Your drizzle db instance

const storage = new DrizzleStorageAdapter(db);
```

### 4. Mounting to Web Frameworks (Express)
After defining the platform and routing, use the specific adapter to mount it to the web server.

```typescript
import express from "express";
import { expressAdapter } from "@dilukangelo/api-forge-adapter-express";

const app = express();
app.use(express.json());

// Mount the API Forge platform
app.use("/api", expressAdapter(platform, router));

app.listen(3000, () => console.log("Server running"));
```

### 5. Securing Endpoints with OAuth
API Forge comes with native OAuth2 support. You can secure endpoints by requiring specific scopes.

```typescript
// Require the "read:users" scope
router.get("/users/me", async (req, res) => {
    const user = req.context.user; // Injected by the OAuth middleware
    res.json({ user });
}, { scopes: ["read:users"] });
```

### 6. OpenAPI / Swagger Documentation
You can automatically generate docs by adding the OpenAPI plugin to the platform.

```typescript
import { OpenAPIPlugin } from "@dilukangelo/api-forge-plugin-openapi";

platform.use(new OpenAPIPlugin({
    title: "My Awesome API",
    version: "1.0.0",
    docsPath: "/docs" // Docs UI will be served here
}));
```

### 7. Developer Portal
API Forge provides a built-in Developer Portal (React SPA) for managing OAuth apps, webhooks, and accessing API documentation. To run the portal alongside your API Forge application, you must serve the static frontend assets from your web server, making sure they don't conflict with the `forge` API routes.

> ⚠️ **CRITICAL: CORS Middleware Order**
> 
> You **MUST** mount the portal static route **BEFORE** you apply any global `cors()` middleware or strict API security headers. If you mount `cors()` before the static folder, your browser will immediately block the `.js` and `.css` assets with a `500 Not allowed by CORS` error.

**Example for Express:**
```typescript
import path from "path";
import express from "express";
import cors from "cors";

const app = express();

// 1. Mount forge (which claims /portal/api/* internally)
const adapter = expressAdapter(app);
forge.mount(adapter);

// 2. Serve the static portal (React build output) BEFORE CORS
const portalPath = path.resolve(__dirname, "node_modules/@dilukangelo/api-forge-portal/dist");
app.use("/portal", express.static(portalPath));

// 3. SPA fallback to index.html for client-side routing
app.get("/portal/*", (req, res, next) => {
    if (req.path.startsWith("/portal/api")) return next();
    res.sendFile(path.join(portalPath, "index.html"));
});

// 4. NOW apply your strict CORS rules for your actual API
app.use(cors({ origin: "https://your-frontend.com" }));

// 5. Mount your custom routes here...
```
**Accessing the portal:** Once your server is running, you can access the Developer Portal by navigating to `http://localhost:<PORT>/portal/` in your browser.

> ⚠️ **IMPORTANT: Portal APIs Must Be Defined Manually**
>
> The React SPAs require backend data routes under `/portal/api/*` to function (e.g. `/portal/api/apps`, `/portal/api/scopes`, `/portal/api/endpoints`). API Forge currently does *not* auto-inject these routes. 
> 
> You **must manually implement these endpoints** using `forge.api({ name: "portal", basePath: "/portal/api" })` depending on your own API logic. See the `examples/express-app/src/index.ts` file in the main repository for a reference implementation.

## Checklist Before Implementation
- [ ] Have I imported the packages from `@dilukangelo/api-forge-...`?
- [ ] Did I use the host project's correct package manager (`bun add`, `pnpm add`, `yarn add`, or `npm install`) instead of forcing `npm`?
- [ ] Am I using the API Forge `Router` instead of the raw framework router?
- [ ] Have I initialized the `Platform` with a valid `StorageAdapter`?
- [ ] Did I mount the adapter (e.g., `expressAdapter`) correctly to the root app?
