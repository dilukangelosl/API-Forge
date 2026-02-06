import type { ZodType } from "zod";
import type { APIForgeConfig, ResolvedConfig } from "./config";
import type { RouteDefinition, APIForgePlugin, PluginPlatformAPI } from "../abstractions/plugin";
import type { FrameworkAdapter } from "../abstractions/adapter";
import type { StorageAdapter } from "../abstractions/storage";
import type { HttpMethod } from "../abstractions/request";
import type { APIForgeResponse } from "../abstractions/response";
import type { APIForgeContext } from "../abstractions/context";
/**
 * API definition options for grouping endpoints
 */
export interface APIDefinitionOptions {
    name: string;
    basePath: string;
    description?: string;
    defaultScopes?: string[];
    defaultRateLimit?: string;
    tags?: string[];
}
/**
 * Endpoint definition options
 */
export interface EndpointOptions<TInput = unknown, TOutput = unknown> {
    method: HttpMethod;
    path: string;
    description?: string;
    scopes?: string[];
    rateLimit?: string;
    tags?: string[];
    input?: ZodType<TInput>;
    output?: ZodType<TOutput>;
    handler: (ctx: APIForgeContext<TInput>) => Promise<APIForgeResponse> | APIForgeResponse;
}
/**
 * API definition builder for grouping related endpoints
 */
export declare class APIDefinition {
    private platform;
    private options;
    private endpoints;
    constructor(platform: APIForge, options: APIDefinitionOptions);
    /**
     * Define an endpoint within this API
     */
    endpoint<TInput = unknown, TOutput = unknown>(options: EndpointOptions<TInput, TOutput>): this;
    /**
     * Get all endpoints in this API
     */
    getEndpoints(): RouteDefinition[];
}
/**
 * Main API Forge platform class
 */
export declare class APIForge implements PluginPlatformAPI {
    private adapter;
    private storage;
    private router;
    private config;
    private plugins;
    private apis;
    private initialized;
    private mountPath;
    constructor(userConfig?: APIForgeConfig);
    /**
     * Add a plugin to the platform
     */
    use(plugin: APIForgePlugin): this;
    /**
     * Create a new API definition group
     */
    api(options: APIDefinitionOptions): APIDefinition;
    /**
     * Register a route directly
     */
    registerRoute(route: RouteDefinition): void;
    /**
     * Get all registered routes
     */
    getRoutes(): RouteDefinition[];
    /**
     * Get platform configuration
     */
    getConfig(): ResolvedConfig;
    /**
     * Get storage adapter
     */
    getStorage(): StorageAdapter;
    /**
     * Mount the platform at a path
     * This registers all routes with the framework adapter
     */
    mount(adapter: FrameworkAdapter): Promise<void>;
    /**
     * Shutdown the platform gracefully
     */
    shutdown(): Promise<void>;
    private registerRouteWithAdapter;
    private resolveStorage;
    private resolveConfig;
}
//# sourceMappingURL=platform.d.ts.map