import type { APIForgePlugin } from "../../abstractions/plugin";
/**
 * Rate limit plugin configuration
 */
export interface RateLimitPluginConfig {
    /** Global rate limit (applied to all endpoints without specific limits) */
    globalLimit?: string;
    /** Whether to include rate limit headers in responses */
    includeHeaders?: boolean;
    /** Key prefix for storage */
    keyPrefix?: string;
}
/**
 * Rate limit info returned in headers
 */
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
}
/**
 * Create the rate limiting plugin
 */
export declare function rateLimitPlugin(config?: RateLimitPluginConfig): APIForgePlugin;
//# sourceMappingURL=index.d.ts.map