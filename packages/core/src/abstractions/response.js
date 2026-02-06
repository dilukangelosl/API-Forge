/**
 * Shorthand response creators
 */
export const Response = {
    ok(body, headers = {}) {
        return { status: 200, headers, body };
    },
    created(body, headers = {}) {
        return { status: 201, headers, body };
    },
    noContent(headers = {}) {
        return { status: 204, headers, body: null };
    },
    badRequest(message, details) {
        return {
            status: 400,
            headers: {},
            body: { error: "bad_request", message, details },
        };
    },
    unauthorized(message = "Unauthorized") {
        return {
            status: 401,
            headers: { "WWW-Authenticate": "Bearer" },
            body: { error: "unauthorized", message },
        };
    },
    forbidden(message = "Forbidden") {
        return {
            status: 403,
            headers: {},
            body: { error: "forbidden", message },
        };
    },
    notFound(message = "Not Found") {
        return {
            status: 404,
            headers: {},
            body: { error: "not_found", message },
        };
    },
    tooManyRequests(retryAfter) {
        return {
            status: 429,
            headers: { "Retry-After": String(retryAfter) },
            body: { error: "too_many_requests", message: "Rate limit exceeded" },
        };
    },
    serverError(message = "Internal Server Error") {
        return {
            status: 500,
            headers: {},
            body: { error: "server_error", message },
        };
    },
    json(status, body, headers = {}) {
        return {
            status,
            headers: { "Content-Type": "application/json", ...headers },
            body,
        };
    },
    redirect(location, status = 302) {
        return {
            status,
            headers: { Location: location },
            body: null,
        };
    },
};
//# sourceMappingURL=response.js.map