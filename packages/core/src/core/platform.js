import { Router } from "./router";
import { DEFAULT_CONFIG } from "./config";
import { Response } from "../abstractions/response";
import { MemoryStorageAdapter } from "../storage/memory";
/**
 * API definition builder for grouping related endpoints
 */
export class APIDefinition {
    platform;
    options;
    endpoints = [];
    constructor(platform, options) {
        this.platform = platform;
        this.options = options;
    }
    /**
     * Define an endpoint within this API
     */
    endpoint(options) {
        const fullPath = `${this.options.basePath}${options.path}`;
        const route = {
            method: options.method,
            path: fullPath,
            handler: async (ctx) => {
                // Validate input if schema provided
                if (options.input) {
                    const parseResult = options.input.safeParse(ctx.request.body);
                    if (!parseResult.success) {
                        return Response.badRequest("Validation failed", parseResult.error.issues);
                    }
                    ctx.input = parseResult.data;
                }
                return options.handler(ctx);
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
    getEndpoints() {
        return [...this.endpoints];
    }
}
/**
 * Main API Forge platform class
 */
export class APIForge {
    adapter = null;
    storage;
    router;
    config;
    plugins = [];
    apis = [];
    initialized = false;
    // @ts-expect-error: mountPath will be used for portal routes
    mountPath = "";
    constructor(userConfig = {}) {
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
    use(plugin) {
        this.plugins.push(plugin);
        return this;
    }
    /**
     * Create a new API definition group
     */
    api(options) {
        const apiDef = new APIDefinition(this, options);
        this.apis.push(apiDef);
        return apiDef;
    }
    /**
     * Register a route directly
     */
    registerRoute(route) {
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
    getRoutes() {
        return this.router.getRoutes();
    }
    /**
     * Get platform configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Get storage adapter
     */
    getStorage() {
        return this.storage;
    }
    /**
     * Mount the platform at a path
     * This registers all routes with the framework adapter
     */
    async mount(adapter) {
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
    async shutdown() {
        for (const plugin of this.plugins) {
            await plugin.onShutdown?.();
        }
        await this.storage.close?.();
    }
    registerRouteWithAdapter(route) {
        const handler = async (request) => {
            // Create context
            const ctx = {
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
            const requiredScopes = route.metadata?.scopes;
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
                const missingScopes = requiredScopes.filter((scope) => !tokenScopes.includes(scope));
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
            let response;
            try {
                response = await route.handler(ctx);
            }
            catch (error) {
                console.error("Handler error:", error);
                response = Response.serverError(error instanceof Error ? error.message : "Internal server error");
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
        this.adapter.registerRoute(route.method, route.path, handler);
    }
    resolveStorage(storage) {
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
    resolveConfig(userConfig) {
        return {
            adapter: this.adapter, // Will be set at mount time
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
//# sourceMappingURL=platform.js.map