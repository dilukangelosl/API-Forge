import type { APIForgeRequest } from "./request";
import type { APIForgeResponse } from "./response";
import type { HttpMethod } from "./request";
/**
 * Handler function type for route handlers
 */
export type APIForgeHandler = (request: APIForgeRequest) => Promise<APIForgeResponse> | APIForgeResponse;
/**
 * Middleware function type
 */
export type APIForgeMiddleware = (request: APIForgeRequest, next: () => Promise<APIForgeResponse>) => Promise<APIForgeResponse>;
/**
 * Framework adapter interface
 * Every framework adapter must implement this contract
 */
export interface FrameworkAdapter {
    /** Adapter name (e.g., "express", "hono") */
    name: string;
    /** Adapter version */
    version: string;
    /**
     * Normalize a framework-specific request to APIForgeRequest
     */
    normalizeRequest(raw: unknown): APIForgeRequest;
    /**
     * Send an APIForgeResponse through the framework's response mechanism
     */
    sendResponse(raw: unknown, response: APIForgeResponse): void | Promise<void>;
    /**
     * Register a route with the framework
     */
    registerRoute(method: HttpMethod, path: string, handler: APIForgeHandler): void;
    /**
     * Mount middleware at a path
     */
    mountMiddleware(path: string, middleware: APIForgeMiddleware): void;
    /**
     * Serve static files from a directory
     * Used for the developer portal UI
     */
    serveStatic(path: string, directory: string): void;
    /**
     * Get the underlying framework app instance
     */
    getApp(): unknown;
}
/**
 * Adapter factory function type
 */
export type AdapterFactory<T> = (app: T) => FrameworkAdapter;
//# sourceMappingURL=adapter.d.ts.map