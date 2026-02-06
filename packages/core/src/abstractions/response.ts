/**
 * Framework-agnostic response abstraction
 * Handlers return this interface, adapters translate to framework-specific responses
 */
export interface APIForgeResponse {
    /** HTTP status code */
    status: number;

    /** Response headers */
    headers: Record<string, string>;

    /** Response body (will be serialized based on content type) */
    body: unknown;
}

/**
 * Shorthand response creators
 */
export const Response = {
    ok<T>(body: T, headers: Record<string, string> = {}): APIForgeResponse {
        return { status: 200, headers, body };
    },

    created<T>(body: T, headers: Record<string, string> = {}): APIForgeResponse {
        return { status: 201, headers, body };
    },

    noContent(headers: Record<string, string> = {}): APIForgeResponse {
        return { status: 204, headers, body: null };
    },

    badRequest(message: string, details?: unknown): APIForgeResponse {
        return {
            status: 400,
            headers: {},
            body: { error: "bad_request", message, details },
        };
    },

    unauthorized(message = "Unauthorized"): APIForgeResponse {
        return {
            status: 401,
            headers: { "WWW-Authenticate": "Bearer" },
            body: { error: "unauthorized", message },
        };
    },

    forbidden(message = "Forbidden"): APIForgeResponse {
        return {
            status: 403,
            headers: {},
            body: { error: "forbidden", message },
        };
    },

    notFound(message = "Not Found"): APIForgeResponse {
        return {
            status: 404,
            headers: {},
            body: { error: "not_found", message },
        };
    },

    tooManyRequests(retryAfter: number): APIForgeResponse {
        return {
            status: 429,
            headers: { "Retry-After": String(retryAfter) },
            body: { error: "too_many_requests", message: "Rate limit exceeded" },
        };
    },

    serverError(message = "Internal Server Error"): APIForgeResponse {
        return {
            status: 500,
            headers: {},
            body: { error: "server_error", message },
        };
    },

    json<T>(status: number, body: T, headers: Record<string, string> = {}): APIForgeResponse {
        return {
            status,
            headers: { "Content-Type": "application/json", ...headers },
            body,
        };
    },

    redirect(location: string, status: 301 | 302 | 303 | 307 | 308 = 302): APIForgeResponse {
        return {
            status,
            headers: { Location: location },
            body: null,
        };
    },
};
