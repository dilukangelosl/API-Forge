import { Response } from "../../abstractions/response";
/**
 * Scope enforcement middleware
 * Checks if the request has the required scopes
 */
export function requireScopes(requiredScopes) {
    return async function scopeMiddleware(ctx, next) {
        const oauth = ctx.request.oauth;
        // Check if authenticated
        if (!oauth) {
            return Response.unauthorized("Bearer token required");
        }
        // Check if all required scopes are present
        const missingScopes = requiredScopes.filter((scope) => !oauth.scopes.includes(scope));
        if (missingScopes.length > 0) {
            return Response.forbidden(`Missing required scopes: ${missingScopes.join(", ")}`);
        }
        return next();
    };
}
/**
 * Check if a set of scopes includes all required scopes
 */
export function hasRequiredScopes(grantedScopes, requiredScopes) {
    return requiredScopes.every((scope) => grantedScopes.includes(scope));
}
/**
 * Parse scope string to array
 */
export function parseScopes(scopeString) {
    if (!scopeString)
        return [];
    return scopeString.trim().split(/\s+/);
}
/**
 * Stringify scopes array to space-separated string
 */
export function stringifyScopes(scopes) {
    return scopes.join(" ");
}
/**
 * Validate that requested scopes are allowed for a client
 */
export function validateRequestedScopes(requestedScopes, allowedScopes) {
    const filtered = [];
    const invalid = [];
    for (const scope of requestedScopes) {
        if (allowedScopes.includes(scope)) {
            filtered.push(scope);
        }
        else {
            invalid.push(scope);
        }
    }
    return {
        valid: invalid.length === 0,
        filtered,
        invalid,
    };
}
/**
 * Default scope definitions
 */
export const DEFAULT_SCOPES = {
    "openid": "OpenID Connect authentication",
    "profile": "Basic profile information",
    "email": "Email address",
    "offline_access": "Refresh token access",
};
//# sourceMappingURL=scopes.js.map