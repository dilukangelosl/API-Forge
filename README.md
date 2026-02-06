# API Forge

OAuth + API Gateway + Developer Portal for Any JS/TS Framework

Turn any JS/TS HTTP app into a full developer platform with OAuth, APIs, docs, and a dev portal in one middleware call.

## Features

- OAuth 2.0 authorization server (Authorization Code, PKCE, Client Credentials)
- API rate limiting with customizable strategies
- Auto-generated API documentation
- Self-service developer portal
- Framework-agnostic (Express, Hono, Fastify, and more)

## Installation

```bash
bun add api-forge
# or
npm install api-forge
```

## Quick Start

```typescript
import express from "express";
import { APIForge } from "api-forge";
import { expressAdapter } from "api-forge/express";

const app = express();
const platform = new APIForge({
  adapter: expressAdapter(app),
  app: {
    name: "My API",
    version: "1.0.0",
  },
});

// Define an API
const api = platform.api({
  name: "Users API",
  basePath: "/api/v1",
});

api.endpoint({
  method: "GET",
  path: "/users",
  scopes: ["users:read"],
  handler: async (ctx) => {
    return { status: 200, body: { users: [] } };
  },
});

// Mount OAuth, docs, and portal at /developer
platform.mount("/developer");

app.listen(3000);
```

## Supported Frameworks

| Framework | Import |
|-----------|--------|
| Express | `api-forge/express` |
| Hono | `api-forge/hono` |
| Fastify | `api-forge/fastify` |

## Storage Adapters

| Adapter | Use Case |
|---------|----------|
| Memory | Development (default) |
| Redis | Production |
| Custom | Implement `StorageAdapter` interface |

## Documentation

Full documentation available at the mounted developer portal.

## License

MIT - Diluk Angelo
