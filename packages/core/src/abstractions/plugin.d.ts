import type { APIForgeContext } from "./context";
import type { APIForgeResponse } from "./response";
/**
 * Route definition registered by plugins or API definitions
 */
export interface RouteDefinition {
    /** HTTP method */
    method: string;
    /** Route path */
    path: string;
    /** Route handler */
    handler: (ctx: APIForgeContext) => Promise<APIForgeResponse> | APIForgeResponse;
    /** Route metadata */
    metadata?: RouteMetadata;
}
/**
 * Route metadata for documentation and enforcement
 */
export interface RouteMetadata {
    /** Route description for docs */
    description?: string;
    /** Required OAuth scopes */
    scopes?: string[];
    /** Rate limit string (e.g., "30/min") */
    rateLimit?: string;
    /** Tags for documentation grouping */
    tags?: string[];
    /** Whether this route requires authentication */
    requiresAuth?: boolean;
}
/**
 * Plugin interface for extending API Forge
 */
export interface APIForgePlugin {
    /** Plugin name */
    name: string;
    /** Plugin version */
    version: string;
    /**
     * Called when the platform is initialized
     * Use to register routes, set up resources, etc.
     */
    onInit?(platform: PluginPlatformAPI): void | Promise<void>;
    /**
     * Called when a route is registered
     * Use to modify or wrap route handlers
     */
    onRouteRegistered?(route: RouteDefinition): void;
    /**
     * Called before each request is processed
     * Return a response to short-circuit the request
     */
    onRequest?(ctx: APIForgeContext): APIForgeResponse | void | Promise<APIForgeResponse | void>;
    /**
     * Called after each response is generated
     * Use for logging, metrics, response modification
     */
    onResponse?(ctx: APIForgeContext, response: APIForgeResponse): void | Promise<void>;
    /**
     * Called when the platform is shutting down
     */
    onShutdown?(): void | Promise<void>;
    /**
     * Routes contributed by this plugin
     */
    routes?: RouteDefinition[];
}
/**
 * API exposed to plugins for platform operations
 */
export interface PluginPlatformAPI {
    /** Register a route */
    registerRoute(route: RouteDefinition): void;
    /** Get all registered routes */
    getRoutes(): RouteDefinition[];
    /** Get platform configuration */
    getConfig(): unknown;
    /** Get storage adapter */
    getStorage(): unknown;
}
/**
 * Plugin factory function type
 */
export type PluginFactory<TOptions = unknown> = (options?: TOptions) => APIForgePlugin;
//# sourceMappingURL=plugin.d.ts.map