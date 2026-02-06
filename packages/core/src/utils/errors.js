/**
 * API Forge Error base class
 */
export class APIForgeError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = "APIForgeError";
    }
}
/**
 * OAuth-specific error following RFC 6749
 */
export class OAuthError extends APIForgeError {
    error;
    errorDescription;
    errorUri;
    constructor(error, errorDescription, statusCode = 400, errorUri) {
        super(errorDescription, error, statusCode);
        this.error = error;
        this.errorDescription = errorDescription;
        this.errorUri = errorUri;
        this.name = "OAuthError";
    }
    toJSON() {
        return {
            error: this.error,
            error_description: this.errorDescription,
            ...(this.errorUri && { error_uri: this.errorUri }),
        };
    }
}
/**
 * Common OAuth errors
 */
export const OAuthErrors = {
    invalidRequest(description) {
        return new OAuthError("invalid_request", description, 400);
    },
    invalidClient(description = "Client authentication failed") {
        return new OAuthError("invalid_client", description, 401);
    },
    invalidGrant(description = "The provided grant is invalid") {
        return new OAuthError("invalid_grant", description, 400);
    },
    invalidScope(description = "The requested scope is invalid") {
        return new OAuthError("invalid_scope", description, 400);
    },
    unauthorizedClient(description = "Client is not authorized for this grant type") {
        return new OAuthError("unauthorized_client", description, 403);
    },
    unsupportedGrantType(description = "The grant type is not supported") {
        return new OAuthError("unsupported_grant_type", description, 400);
    },
    accessDenied(description = "The resource owner denied the request") {
        return new OAuthError("access_denied", description, 403);
    },
    serverError(description = "An unexpected error occurred") {
        return new OAuthError("server_error", description, 500);
    },
};
/**
 * Validation error for input validation failures
 */
export class ValidationError extends APIForgeError {
    issues;
    constructor(message, issues) {
        super(message, "validation_error", 400, issues);
        this.issues = issues;
        this.name = "ValidationError";
    }
}
/**
 * Rate limit exceeded error
 */
export class RateLimitError extends APIForgeError {
    retryAfter;
    constructor(retryAfter, message = "Rate limit exceeded") {
        super(message, "rate_limit_exceeded", 429, { retryAfter });
        this.retryAfter = retryAfter;
        this.name = "RateLimitError";
    }
}
/**
 * Authentication required error
 */
export class AuthenticationError extends APIForgeError {
    constructor(message = "Authentication required") {
        super(message, "authentication_required", 401);
        this.name = "AuthenticationError";
    }
}
/**
 * Authorization (forbidden) error
 */
export class AuthorizationError extends APIForgeError {
    constructor(message = "Insufficient permissions") {
        super(message, "insufficient_permissions", 403);
        this.name = "AuthorizationError";
    }
}
/**
 * Resource not found error
 */
export class NotFoundError extends APIForgeError {
    constructor(resource = "Resource", id) {
        const message = id ? `${resource} '${id}' not found` : `${resource} not found`;
        super(message, "not_found", 404);
        this.name = "NotFoundError";
    }
}
//# sourceMappingURL=errors.js.map