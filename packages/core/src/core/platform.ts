import type { ZodType } from "zod";
import type { APIForgeConfig, ResolvedConfig } from "./config";
import type { RouteDefinition, APIForgePlugin, PluginPlatformAPI } from "../abstractions/plugin";
import type { FrameworkAdapter } from "../abstractions/adapter";
import type { StorageAdapter } from "../abstractions/storage";
import type { APIForgeRequest, HttpMethod } from "../abstractions/request";
import type { APIForgeResponse } from "../abstractions/response";
import type { APIForgeContext } from "../abstractions/context";
import { Router } from "./router";
import { DEFAULT_CONFIG } from "./config";
import { Response } from "../abstractions/response";
import { MemoryStorageAdapter } from "../storage/memory";

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
export class APIDefinition {
    private endpoints: RouteDefinition[] = [];

    constructor(
        private platform: APIForge,
        private options: APIDefinitionOptions
    ) { }

    /**
     * Define an endpoint within this API
     */
    endpoint<TInput = unknown, TOutput = unknown>(
        options: EndpointOptions<TInput, TOutput>
    ): this {
        const fullPath = `${this.options.basePath}${options.path}`;

        const route: RouteDefinition = {
            method: options.method,
            path: fullPath,
            handler: async (ctx) => {
                // Validate input if schema provided
                if (options.input) {
                    const parseResult = options.input.safeParse(ctx.request.body);
                    if (!parseResult.success) {
                        return Response.badRequest("Validation failed", parseResult.error.issues);
                    }
                    (ctx as APIForgeContext<TInput>).input = parseResult.data;
                }

                return options.handler(ctx as APIForgeContext<TInput>);
            },
            metadata: {
                ...(options.description && { description: options.description }),
                ...(options.scopes || this.options.defaultScopes ? { scopes: options.scopes ?? this.options.defaultScopes } : {}),
                ...(options.rateLimit || this.options.defaultRateLimit ? { rateLimit: options.rateLimit ?? this.options.defaultRateLimit } : {}),
                tags: [...(this.options.tags ?? []), ...(options.tags ?? [])],
                requiresAuth: (options.scopes?.length ?? 0) > 0,
            },
        };

        this.endpoints.push(route);
        this.platform.registerRoute(route);

        return this;
    }

    /**
     * Get all endpoints in this API
     */
    getEndpoints(): RouteDefinition[] {
        return [...this.endpoints];
    }
}

/**
 * Main API Forge platform class
 */
export class APIForge implements PluginPlatformAPI {
    private adapter: FrameworkAdapter | null = null;
    private storage: StorageAdapter;
    private router: Router;
    private config: ResolvedConfig;
    private plugins: APIForgePlugin[] = [];
    private apis: APIDefinition[] = [];
    private initialized = false;
    // @ts-expect-error: mountPath will be used for portal routes
    private mountPath = "";

    constructor(userConfig: APIForgeConfig = {}) {
        this.adapter = userConfig.adapter ?? null;
        this.router = new Router();

        // Resolve storage adapter
        this.storage = this.resolveStorage(userConfig.storage);

        // Merge configuration with defaults
        this.config = this.resolveConfig(userConfig);

        // Initialize plugins from config
        if (userConfig.plugins) {
            this.plugins = userConfig.plugins;
        }
    }

    /**
     * Add a plugin to the platform
     */
    use(plugin: APIForgePlugin): this {
        this.plugins.push(plugin);
        return this;
    }

    /**
     * Create a new API definition group
     */
    api(options: APIDefinitionOptions): APIDefinition {
        const apiDef = new APIDefinition(this, options);
        this.apis.push(apiDef);
        return apiDef;
    }

    /**
     * Register a route directly
     */
    registerRoute(route: RouteDefinition): void {
        this.router.register(route);

        // Notify plugins
        for (const plugin of this.plugins) {
            plugin.onRouteRegistered?.(route);
        }

        // Register with adapter if already mounted
        if (this.initialized) {
            this.registerRouteWithAdapter(route);
        }
    }

    /**
     * Get all registered routes
     */
    getRoutes(): RouteDefinition[] {
        return this.router.getRoutes();
    }

    /**
     * Get platform configuration
     */
    getConfig(): ResolvedConfig {
        return this.config;
    }

    /**
     * Get storage adapter
     */
    getStorage(): StorageAdapter {
        return this.storage;
    }

    /**
     * Mount the platform at a path
     * This registers all routes with the framework adapter
     */
    async mount(adapter: FrameworkAdapter): Promise<void> {
        if (this.initialized) {
            throw new Error("Platform already mounted");
        }

        this.adapter = adapter;
        this.mountPath = "/";

        // Initialize storage
        await this.storage.initialize?.();

        // Initialize plugins
        for (const plugin of this.plugins) {
            await plugin.onInit?.(this);

            // Register plugin routes
            if (plugin.routes) {
                for (const route of plugin.routes) {
                    this.registerRoute(route);
                }
            }
        }

        // Register all routes with adapter
        for (const route of this.router.getRoutes()) {
            this.registerRouteWithAdapter(route);
        }

        this.initialized = true;
    }

    /**
     * Shutdown the platform gracefully
     */
    async shutdown(): Promise<void> {
        for (const plugin of this.plugins) {
            await plugin.onShutdown?.();
        }

        await this.storage.close?.();
    }

    private registerRouteWithAdapter(route: RouteDefinition): void {
        const handler = async (request: APIForgeRequest): Promise<APIForgeResponse> => {
            // Create context
            const ctx: APIForgeContext = {
                request,
                input: request.body,
                state: new Map(),
                storage: this.storage,
                config: this.config,
            };

            // Run plugin onRequest hooks
            for (const plugin of this.plugins) {
                const response = await plugin.onRequest?.(ctx);
                if (response) {
                    return response;
                }
            }

            // Check scope requirements
            const requiredScopes = route.metadata?.scopes as string[] | undefined;
            if (requiredScopes && requiredScopes.length > 0) {
                const tokenScopes = ctx.request.oauth?.scopes ?? [];

                // Check if token is present
                if (!ctx.request.oauth) {
                    return Response.json(401, {
                        error: "unauthorized",
                        error_description: "Authentication required",
                    }, {
                        "WWW-Authenticate": 'Bearer realm="API"',
                    });
                }

                // Check if token has all required scopes
                const missingScopes = requiredScopes.filter(
                    (scope) => !tokenScopes.includes(scope)
                );

                if (missingScopes.length > 0) {
                    return Response.json(403, {
                        error: "insufficient_scope",
                        error_description: `Missing required scopes: ${missingScopes.join(", ")}`,
                        required_scopes: requiredScopes,
                        granted_scopes: tokenScopes,
                    });
                }
            }

            // Execute handler
            let response: APIForgeResponse;
            try {
                response = await route.handler(ctx);
            } catch (error) {
                console.error("Handler error:", error);
                response = Response.serverError(
                    error instanceof Error ? error.message : "Internal server error"
                );
            }

            // Run plugin onResponse hooks
            for (const plugin of this.plugins) {
                await plugin.onResponse?.(ctx, response);
            }

            return response;
        };

        if (!this.adapter) {
            throw new Error("Cannot register route before platform is mounted");
        }

        this.adapter.registerRoute(
            route.method as HttpMethod,
            route.path,
            handler
        );
    }

    private resolveStorage(storage?: APIForgeConfig["storage"]): StorageAdapter {
        if (!storage || storage === "memory") {
            return new MemoryStorageAdapter();
        }

        if (storage === "redis") {
            // Will be implemented separately
            throw new Error("Redis storage requires @api-forge/storage-redis package");
        }

        if (typeof storage === "object" && "adapter" in storage) {
            return storage.adapter;
        }

        throw new Error(`Unknown storage configuration: ${storage}`);
    }

    private resolveConfig(userConfig: APIForgeConfig): ResolvedConfig {
        return {
            adapter: this.adapter as FrameworkAdapter, // Will be set at mount time
            app: { ...DEFAULT_CONFIG.app, ...userConfig.app },
            auth: {
                currentUser: userConfig.auth?.currentUser ?? (() => null),
                adminAccess: userConfig.auth?.adminAccess ?? {},
                tokens: {
                    accessToken: {
                        ...DEFAULT_CONFIG.auth.tokens.accessToken,
                        ...userConfig.auth?.tokens?.accessToken,
                    },
                    refreshToken: {
                        ...DEFAULT_CONFIG.auth.tokens.refreshToken,
                        ...userConfig.auth?.tokens?.refreshToken,
                    },
                },
                scopes: userConfig.auth?.scopes ?? DEFAULT_CONFIG.auth.scopes,
                grants: userConfig.auth?.grants ?? DEFAULT_CONFIG.auth.grants,
                pkce: { ...DEFAULT_CONFIG.auth.pkce, ...userConfig.auth?.pkce },
                consent: { ...DEFAULT_CONFIG.auth.consent, ...userConfig.auth?.consent },
            },
            storage: this.storage,
            rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...userConfig.rateLimit },
            portal: {
                enabled: userConfig.portal?.enabled ?? DEFAULT_CONFIG.portal.enabled,
                branding: { ...DEFAULT_CONFIG.portal.branding, ...userConfig.portal?.branding },
                features: { ...DEFAULT_CONFIG.portal.features, ...userConfig.portal?.features },
                pages: { ...DEFAULT_CONFIG.portal.pages, ...userConfig.portal?.pages },
                codeExamples: userConfig.portal?.codeExamples ?? [...DEFAULT_CONFIG.portal.codeExamples],
            },
            docs: {
                enabled: userConfig.docs?.enabled ?? DEFAULT_CONFIG.docs.enabled,
                export: userConfig.docs?.export ?? [...DEFAULT_CONFIG.docs.export],
                groupBy: userConfig.docs?.groupBy ?? DEFAULT_CONFIG.docs.groupBy,
            },
            plugins: this.plugins,
            hooks: userConfig.hooks ?? {},
        };
    }
}
