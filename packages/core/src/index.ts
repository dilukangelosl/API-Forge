// Main entry point for @api-forge/core

// Abstractions
export * from "./abstractions";

// Core
export { APIForge, APIDefinition } from "./core/platform";
export type { APIDefinitionOptions, EndpointOptions } from "./core/platform";
export * from "./core/config";
export { Router } from "./core/router";

// Storage
export { MemoryStorageAdapter } from "./storage/memory";

// Utils
export * from "./utils/crypto";
export * from "./utils/errors";
export * from "./utils/audit";

// Plugins
export { oauthPlugin } from "./plugins/oauth";
export type { UserAuthAdapter, AuthenticatedUser } from "./plugins/oauth";
export { rateLimitPlugin } from "./plugins/rate-limit";

// Re-export commonly used types for convenience
export type {
    APIForgeRequest,
    APIForgeResponse,
    APIForgeContext,
    StorageAdapter,
    FrameworkAdapter,
    APIForgePlugin,
    HttpMethod,
    RouteMetadata,
} from "./abstractions";
