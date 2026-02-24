import type { APIForgePlugin } from "../../abstractions/plugin";
/**
 * User authentication adapter for integrating with host app's auth system
 */
export interface UserAuthAdapter {
    /**
     * Get the current authenticated user from the request
     * Return null if user is not authenticated
     */
    getCurrentUser: (request: unknown) => Promise<AuthenticatedUser | null> | AuthenticatedUser | null;
    /**
     * URL to redirect unauthenticated users for login
     */
    loginUrl: string;
    /**
     * Optional: Check if user has permission to create apps
     */
    canCreateApps?: (user: AuthenticatedUser) => boolean;
}
/**
 * Authenticated user from host app
 */
export interface AuthenticatedUser {
    /** Unique user identifier */
    id: string;
    /** Display name */
    name?: string;
    /** Email address */
    email?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * OAuth 2.0 server plugin configuration
 */
export interface OAuthPluginConfig {
    /** Base path for OAuth endpoints (default: /oauth) */
    basePath?: string;
    /** Issuer identifier for tokens */
    issuer: string;
    /** Audience for tokens */
    audience: string;
    /**
     * User authentication adapter for portal protection
     * When provided, portal endpoints will require authentication
     */
    userAuth?: UserAuthAdapter;
    /**
     * Maximum OAuth apps per user (default: unlimited)
     */
    maxAppsPerUser?: number;
    /**
     * Maximum redirect URIs per app (default: 10)
     */
    maxRedirectUrisPerApp?: number;
}
/**
 * Create the OAuth 2.0 server plugin
 */
export declare function oauthPlugin(pluginConfig: OAuthPluginConfig): APIForgePlugin;
export { TokenService } from "./tokens";
export * from "./scopes";
export * from "./grants";
//# sourceMappingURL=index.d.ts.map