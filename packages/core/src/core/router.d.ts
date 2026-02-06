import type { APIForgeRequest, HttpMethod } from "../abstractions/request";
import type { APIForgeResponse } from "../abstractions/response";
import type { RouteDefinition } from "../abstractions/plugin";
/**
 * Route matcher result
 */
export interface RouteMatch {
    route: RouteDefinition;
    params: Record<string, string>;
}
/**
 * Internal route registry
 * Handles route registration, matching, and parameter extraction
 */
export declare class Router {
    private routes;
    /**
     * Register a route
     */
    register(definition: RouteDefinition): void;
    /**
     * Match a request to a route
     */
    match(request: APIForgeRequest): RouteMatch | null;
    /**
     * Get all registered routes
     */
    getRoutes(): RouteDefinition[];
    /**
     * Check if a route with the same method and path exists
     */
    has(method: HttpMethod, path: string): boolean;
    /**
     * Remove a route by method and path
     */
    remove(method: HttpMethod, path: string): boolean;
    /**
     * Compile a path pattern into a regex
     * Supports :param and *wildcard patterns
     */
    private compileRoute;
}
/**
 * Create a 404 response for unmatched routes
 */
export declare function notFoundHandler(request: APIForgeRequest): APIForgeResponse;
/**
 * Create a 405 response for method not allowed
 */
export declare function methodNotAllowedHandler(request: APIForgeRequest, allowedMethods: HttpMethod[]): APIForgeResponse;
//# sourceMappingURL=router.d.ts.map