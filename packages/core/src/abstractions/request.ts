/**
 * HTTP Method types supported by the API
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

/**
 * Framework-agnostic request abstraction
 * All framework adapters normalize their requests to this interface
 */
export interface APIForgeRequest {
    /** HTTP method */
    method: HttpMethod;

    /** Request path without query string */
    path: string;

    /** Request headers (lowercase keys) */
    headers: Record<string, string>;

    /** Parsed query parameters */
    query: Record<string, string | string[]>;

    /** URL path parameters extracted by router */
    params: Record<string, string>;

    /** Parsed request body */
    body: unknown;

    /** Client IP address */
    ip: string;

    /** OAuth context (set by OAuth middleware if authenticated) */
    oauth?: OAuthRequestContext;

    /** Original framework request (for session access, etc.) */
    _originalRequest?: unknown;
}

/**
 * OAuth context attached to authenticated requests
 */
export interface OAuthRequestContext {
    /** OAuth client ID that made the request */
    clientId: string;

    /** Scopes granted to this token */
    scopes: string[];

    /** User ID if this is a user-authorized token */
    userId?: string;

    /** Token expiration timestamp */
    expiresAt: number;
}

/**
 * Create a minimal request for testing
 */
export function createRequest(overrides: Partial<APIForgeRequest> = {}): APIForgeRequest {
    return {
        method: "GET",
        path: "/",
        headers: {},
        query: {},
        params: {},
        body: undefined,
        ip: "127.0.0.1",
        ...overrides,
    };
}
