import type { APIForgeContext } from "../../abstractions/context";
import type { APIForgeResponse } from "../../abstractions/response";
/**
 * Scope enforcement middleware
 * Checks if the request has the required scopes
 */
export declare function requireScopes(requiredScopes: string[]): (ctx: APIForgeContext, next: () => Promise<APIForgeResponse>) => Promise<APIForgeResponse>;
/**
 * Check if a set of scopes includes all required scopes
 */
export declare function hasRequiredScopes(grantedScopes: string[], requiredScopes: string[]): boolean;
/**
 * Parse scope string to array
 */
export declare function parseScopes(scopeString: string | undefined): string[];
/**
 * Stringify scopes array to space-separated string
 */
export declare function stringifyScopes(scopes: string[]): string;
/**
 * Validate that requested scopes are allowed for a client
 */
export declare function validateRequestedScopes(requestedScopes: string[], allowedScopes: string[]): {
    valid: boolean;
    filtered: string[];
    invalid: string[];
};
/**
 * Default scope definitions
 */
export declare const DEFAULT_SCOPES: {
    openid: string;
    profile: string;
    email: string;
    offline_access: string;
};
//# sourceMappingURL=scopes.d.ts.map