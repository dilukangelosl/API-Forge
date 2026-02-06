/**
 * API Forge Error base class
 */
export declare class APIForgeError extends Error {
    code: string;
    statusCode: number;
    details?: unknown | undefined;
    constructor(message: string, code: string, statusCode?: number, details?: unknown | undefined);
}
/**
 * OAuth-specific error following RFC 6749
 */
export declare class OAuthError extends APIForgeError {
    error: string;
    errorDescription: string;
    errorUri?: string | undefined;
    constructor(error: string, errorDescription: string, statusCode?: number, errorUri?: string | undefined);
    toJSON(): {
        error_uri?: string;
        error: string;
        error_description: string;
    };
}
/**
 * Common OAuth errors
 */
export declare const OAuthErrors: {
    invalidRequest(description: string): OAuthError;
    invalidClient(description?: string): OAuthError;
    invalidGrant(description?: string): OAuthError;
    invalidScope(description?: string): OAuthError;
    unauthorizedClient(description?: string): OAuthError;
    unsupportedGrantType(description?: string): OAuthError;
    accessDenied(description?: string): OAuthError;
    serverError(description?: string): OAuthError;
};
/**
 * Validation error for input validation failures
 */
export declare class ValidationError extends APIForgeError {
    issues: unknown[];
    constructor(message: string, issues: unknown[]);
}
/**
 * Rate limit exceeded error
 */
export declare class RateLimitError extends APIForgeError {
    retryAfter: number;
    constructor(retryAfter: number, message?: string);
}
/**
 * Authentication required error
 */
export declare class AuthenticationError extends APIForgeError {
    constructor(message?: string);
}
/**
 * Authorization (forbidden) error
 */
export declare class AuthorizationError extends APIForgeError {
    constructor(message?: string);
}
/**
 * Resource not found error
 */
export declare class NotFoundError extends APIForgeError {
    constructor(resource?: string, id?: string);
}
//# sourceMappingURL=errors.d.ts.map