import type { APIForgeRequest, HttpMethod } from "../abstractions/request";
import type { APIForgeResponse } from "../abstractions/response";
import type { RouteDefinition, RouteMetadata } from "../abstractions/plugin";
import { Response } from "../abstractions/response";

/**
 * Route matcher result
 */
export interface RouteMatch {
    route: RouteDefinition;
    params: Record<string, string>;
}

/**
 * Compiled route pattern for efficient matching
 */
interface CompiledRoute {
    definition: RouteDefinition;
    pattern: RegExp;
    paramNames: string[];
}

/**
 * Internal route registry
 * Handles route registration, matching, and parameter extraction
 */
export class Router {
    private routes: Map<HttpMethod, CompiledRoute[]> = new Map();

    /**
     * Register a route
     */
    register(definition: RouteDefinition): void {
        const method = definition.method.toUpperCase() as HttpMethod;

        if (!this.routes.has(method)) {
            this.routes.set(method, []);
        }

        const compiled = this.compileRoute(definition);
        this.routes.get(method)!.push(compiled);
    }

    /**
     * Match a request to a route
     */
    match(request: APIForgeRequest): RouteMatch | null {
        const method = request.method.toUpperCase() as HttpMethod;
        const routes = this.routes.get(method);

        if (!routes) {
            return null;
        }

        for (const compiled of routes) {
            const match = compiled.pattern.exec(request.path);
            if (match) {
                const params: Record<string, string> = {};
                compiled.paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });
                return { route: compiled.definition, params };
            }
        }

        return null;
    }

    /**
     * Get all registered routes
     */
    getRoutes(): RouteDefinition[] {
        const allRoutes: RouteDefinition[] = [];
        for (const routes of this.routes.values()) {
            for (const compiled of routes) {
                allRoutes.push(compiled.definition);
            }
        }
        return allRoutes;
    }

    /**
     * Check if a route with the same method and path exists
     */
    has(method: HttpMethod, path: string): boolean {
        const routes = this.routes.get(method);
        if (!routes) return false;

        return routes.some(r => r.definition.path === path);
    }

    /**
     * Remove a route by method and path
     */
    remove(method: HttpMethod, path: string): boolean {
        const routes = this.routes.get(method);
        if (!routes) return false;

        const index = routes.findIndex(r => r.definition.path === path);
        if (index !== -1) {
            routes.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Compile a path pattern into a regex
     * Supports :param and *wildcard patterns
     */
    private compileRoute(definition: RouteDefinition): CompiledRoute {
        const paramNames: string[] = [];
        let pattern = definition.path;

        // Escape regex special characters except : and *
        pattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

        // Replace :param with capture group
        pattern = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
            paramNames.push(name);
            return "([^/]+)";
        });

        // Replace * with wildcard capture
        pattern = pattern.replace(/\*/g, "(.*)");

        // Anchor the pattern
        pattern = `^${pattern}$`;

        return {
            definition,
            pattern: new RegExp(pattern),
            paramNames,
        };
    }
}

/**
 * Create a 404 response for unmatched routes
 */
export function notFoundHandler(request: APIForgeRequest): APIForgeResponse {
    return Response.notFound(`Cannot ${request.method} ${request.path}`);
}

/**
 * Create a 405 response for method not allowed
 */
export function methodNotAllowedHandler(
    request: APIForgeRequest,
    allowedMethods: HttpMethod[]
): APIForgeResponse {
    return {
        status: 405,
        headers: { Allow: allowedMethods.join(", ") },
        body: {
            error: "method_not_allowed",
            message: `Method ${request.method} not allowed`
        },
    };
}
