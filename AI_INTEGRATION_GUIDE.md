# API Forge - AI Integration Guide

Welcome to the **API Forge** AI Integration Guide. This document is intended to help Large Language Models (LLMs) and intelligent agents understand the architecture and integration patterns of the `@dilukangelo/api-forge-*` framework ecosystem.

If an AI agent is working inside your repository and you want it to build APIs using API Forge, direct it to read this file or load the `.agent/skills/api-forge-integration/SKILL.md` file.

## What is API Forge?
API Forge is a modular, framework-agnostic TypeScript toolkit for rapidly bootstrapping unified API gateways. It provides out-of-the-box support for:
- 🔐 Complete OAuth 2.0 Auth Server
- 📖 Auto-generated OpenAPI (Swagger / Scalar) documentation 
- 🗄️ Pluggable Storage (Memory, Prisma, Drizzle)
- 🔌 Pluggable Web Frameworks (Express, with Fastify/Hono coming soon)

## Install Packages

Whenever interacting with packages, ensure you are utilizing the user's correct namespace: `@dilukangelo`.

**IMPORTANT**: Adapt the installation commands to match the host project's package manager (`npm install`, `bun add`, `pnpm add`, or `yarn add`). Do not force `npm` if the project uses a different package manager!

```bash
# Core
<package-manager> add @dilukangelo/api-forge-core

# Adapters (choose your framework)
<package-manager> add @dilukangelo/api-forge-adapter-express

# StorageBackends (choose your ORM)
<package-manager> add @dilukangelo/api-forge-storage-prisma
<package-manager> add @dilukangelo/api-forge-storage-drizzle

# Plugins
<package-manager> add @dilukangelo/api-forge-plugin-openapi
```

## Architecture Flow

1. **Storage Definition**: Instantiate a `StorageAdapter` (e.g., `MemoryStorageAdapter`, `PrismaStorageAdapter`).
2. **Platform Configuration**: Instantiate the `Platform`, passing the storage adapter and your JWT secret.
3. **Plugin Registration**: Add plugins to the platform (e.g., `platform.use(new OpenAPIPlugin(...))`).
4. **Router Construction**: Use `Router` from `@dilukangelo/api-forge-core` to define endpoints, applying scopes where OAuth security is needed.
5. **Adapter Mounting**: Pass the `Platform` and `Router` to the integration adapter (e.g., `expressAdapter`) and mount it onto the host application (e.g., `app.use('/api', expressAdapter(platform, router))`).
6. **Developer Portal (Optional but Recommended)**: API Forge ships with a React SPA package (`@dilukangelo/api-forge-portal`) to manage applications and tokens. Mount its static files to your server (e.g., at `/portal`) with an SPA fallback, then access it in your browser (`http://localhost:3000/portal/`).

## Agent Instructions
- **Do not mix routers**: Use API Forge's `Router` for API business logic, and only use your web framework (like Express) for the top-level application bootstrapping and static file serving.
- **Request/Response Objects**: The injected `req` and `res` objects on API Forge routes are framework-agnostic wrappers, not raw Express/Fastify request objects.
- **Dependency Paths**: Make sure your imports are prefixed correctly: `import { Router } from "@dilukangelo/api-forge-core"`. 

For deep technical patterns and specific setup commands regarding Data Definition and Integrations, please refer to the specific example projects inside the `/examples` folder.
