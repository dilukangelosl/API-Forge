/**
 * API Forge Error base class
 */
export class APIForgeError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        public details?: unknown
    ) {
        super(message);
        this.name = "APIForgeError";
    }
}

/**
 * OAuth-specific error following RFC 6749
 */
export class OAuthError extends APIForgeError {
    constructor(
        public error: string,
        public errorDescription: string,
        statusCode: number = 400,
        public errorUri?: string
    ) {
        super(errorDescription, error, statusCode);
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
    invalidRequest(description: string): OAuthError {
        return new OAuthError("invalid_request", description, 400);
    },

    invalidClient(description = "Client authentication failed"): OAuthError {
        return new OAuthError("invalid_client", description, 401);
    },

    invalidGrant(description = "The provided grant is invalid"): OAuthError {
        return new OAuthError("invalid_grant", description, 400);
    },

    invalidScope(description = "The requested scope is invalid"): OAuthError {
        return new OAuthError("invalid_scope", description, 400);
    },

    unauthorizedClient(description = "Client is not authorized for this grant type"): OAuthError {
        return new OAuthError("unauthorized_client", description, 403);
    },

    unsupportedGrantType(description = "The grant type is not supported"): OAuthError {
        return new OAuthError("unsupported_grant_type", description, 400);
    },

    accessDenied(description = "The resource owner denied the request"): OAuthError {
        return new OAuthError("access_denied", description, 403);
    },

    serverError(description = "An unexpected error occurred"): OAuthError {
        return new OAuthError("server_error", description, 500);
    },
};

/**
 * Validation error for input validation failures
 */
export class ValidationError extends APIForgeError {
    constructor(message: string, public issues: unknown[]) {
        super(message, "validation_error", 400, issues);
        this.name = "ValidationError";
    }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends APIForgeError {
    constructor(
        public retryAfter: number,
        message = "Rate limit exceeded"
    ) {
        super(message, "rate_limit_exceeded", 429, { retryAfter });
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
    constructor(resource = "Resource", id?: string) {
        const message = id ? `${resource} '${id}' not found` : `${resource} not found`;
        super(message, "not_found", 404);
        this.name = "NotFoundError";
    }
}
