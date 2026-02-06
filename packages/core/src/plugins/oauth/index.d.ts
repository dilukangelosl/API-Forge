import type { APIForgePlugin } from "../../abstractions/plugin";
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
}
/**
 * Create the OAuth 2.0 server plugin
 */
export declare function oauthPlugin(pluginConfig: OAuthPluginConfig): APIForgePlugin;
export { TokenService } from "./tokens";
export * from "./scopes";
export * from "./grants";
//# sourceMappingURL=index.d.ts.map