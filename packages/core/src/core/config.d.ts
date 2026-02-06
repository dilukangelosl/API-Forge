import type { StorageAdapter } from "../abstractions/storage";
import type { FrameworkAdapter } from "../abstractions/adapter";
import type { APIForgePlugin } from "../abstractions/plugin";
/**
 * Token format configuration
 */
export type TokenFormat = "jwt" | "opaque";
/**
 * JWT signing algorithm
 */
export type JWTAlgorithm = "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512";
/**
 * Durations can be specified as strings (e.g., "15m", "30d") or milliseconds
 */
export type Duration = string | number;
/**
 * Rate limit syntax: "30/min", "200/hour", "1000/day"
 */
export type RateLimitString = `${number}/${"sec" | "min" | "hour" | "day"}`;
/**
 * Rate limit configuration object
 */
export interface RateLimitConfig {
    requests: number;
    window: Duration;
    strategy?: "sliding" | "fixed";
}
/**
 * OAuth grants configuration
 */
export type OAuthGrant = "authorization_code" | "client_credentials" | "refresh_token" | "device_code";
/**
 * PKCE requirement setting
 */
export type PKCERequirement = "always" | "public_clients" | "never";
/**
 * App identity configuration
 */
export interface AppConfig {
    name: string;
    description?: string;
    version?: string;
    logo?: string;
    tosUrl?: string;
    privacyUrl?: string;
}
/**
 * Token configuration
 */
export interface TokenConfig {
    accessToken?: {
        format?: TokenFormat;
        ttl?: Duration;
        signing?: JWTAlgorithm;
    };
    refreshToken?: {
        ttl?: Duration;
        rotation?: boolean;
        reuseDetection?: boolean;
    };
}
/**
 * Authentication and authorization configuration
 */
export interface AuthConfig {
    /** Function to get current user from request (e.g., from session) */
    currentUser?: (request: unknown) => unknown;
    /** Admin access configuration */
    adminAccess?: {
        roles?: string[];
        userIds?: string[];
    };
    /** Token settings */
    tokens?: TokenConfig;
    /** Scope definitions */
    scopes?: Record<string, string>;
    /** Allowed grant types */
    grants?: OAuthGrant[];
    /** PKCE requirement */
    pkce?: {
        required?: PKCERequirement;
    };
    /** Consent screen settings */
    consent?: {
        screen?: "built-in" | "custom";
        rememberDuration?: Duration;
    };
}
/**
 * Rate limiting configuration
 */
export interface RateLimitingConfig {
    /** Global rate limit */
    global?: RateLimitString | RateLimitConfig;
    /** Storage for rate limit counters */
    storage?: "memory" | "redis";
    /** Whether to include rate limit headers */
    headers?: boolean;
}
/**
 * Portal branding configuration
 */
export interface PortalBranding {
    appName?: string;
    primaryColor?: string;
    logo?: string;
    favicon?: string;
}
/**
 * Developer portal configuration
 */
export interface PortalConfig {
    enabled?: boolean;
    branding?: PortalBranding;
    features?: {
        apiConsole?: boolean;
        codeExamples?: boolean;
        changelog?: boolean;
        statusPage?: boolean;
    };
    pages?: {
        landing?: string;
    };
    codeExamples?: ("curl" | "javascript" | "python" | "go")[];
}
/**
 * Documentation configuration
 */
export interface DocsConfig {
    enabled?: boolean;
    export?: ("openapi" | "markdown")[];
    groupBy?: "api" | "tag";
}
/**
 * Lifecycle hooks
 */
export interface LifecycleHooks {
    onClientCreated?: (client: unknown) => void | Promise<void>;
    onTokenIssued?: (token: unknown) => void | Promise<void>;
    onRateLimited?: (clientId: string, endpoint: string) => void | Promise<void>;
}
/**
 * Storage configuration
 */
export type StorageConfig = "memory" | "redis" | {
    adapter: StorageAdapter;
};
/**
 * Main API Forge configuration
 */
export interface APIForgeConfig {
    /** Framework adapter (optional, can be provided at mount time) */
    adapter?: FrameworkAdapter;
    /** App identity */
    app?: AppConfig;
    /** Authentication and authorization */
    auth?: AuthConfig;
    /** Storage */
    storage?: StorageConfig;
    /** Rate limiting */
    rateLimit?: RateLimitingConfig;
    /** Developer portal */
    portal?: PortalConfig;
    /** Documentation */
    docs?: DocsConfig;
    /** Plugins */
    plugins?: APIForgePlugin[];
    /** Lifecycle hooks */
    hooks?: LifecycleHooks;
}
/**
 * Resolved configuration with defaults applied
 */
export interface ResolvedConfig {
    adapter: FrameworkAdapter;
    app: Required<AppConfig>;
    auth: Required<AuthConfig> & {
        tokens: Required<TokenConfig>;
    };
    storage: StorageAdapter;
    rateLimit: Required<RateLimitingConfig>;
    portal: Required<PortalConfig>;
    docs: Required<DocsConfig>;
    plugins: APIForgePlugin[];
    hooks: LifecycleHooks;
}
/**
 * Default configuration values
 */
export declare const DEFAULT_CONFIG: {
    readonly app: {
        readonly name: "API Forge";
        readonly description: "API Platform";
        readonly version: "1.0.0";
        readonly logo: "";
        readonly tosUrl: "";
        readonly privacyUrl: "";
    };
    readonly auth: {
        readonly tokens: {
            readonly accessToken: {
                readonly format: TokenFormat;
                readonly ttl: "15m";
                readonly signing: JWTAlgorithm;
            };
            readonly refreshToken: {
                readonly ttl: "30d";
                readonly rotation: true;
                readonly reuseDetection: true;
            };
        };
        readonly scopes: {};
        readonly grants: OAuthGrant[];
        readonly pkce: {
            readonly required: PKCERequirement;
        };
        readonly consent: {
            readonly screen: "built-in";
            readonly rememberDuration: "30d";
        };
    };
    readonly rateLimit: {
        readonly global: RateLimitString;
        readonly storage: "memory";
        readonly headers: true;
    };
    readonly portal: {
        readonly enabled: true;
        readonly branding: {};
        readonly features: {
            readonly apiConsole: true;
            readonly codeExamples: true;
            readonly changelog: false;
            readonly statusPage: false;
        };
        readonly pages: {};
        readonly codeExamples: readonly ["curl", "javascript", "python"];
    };
    readonly docs: {
        readonly enabled: true;
        readonly export: readonly ["openapi"];
        readonly groupBy: "api";
    };
};
/**
 * Parse a duration string to milliseconds
 */
export declare function parseDuration(duration: Duration): number;
/**
 * Parse a rate limit string
 */
export declare function parseRateLimit(rateLimit: RateLimitString): {
    requests: number;
    windowMs: number;
};
//# sourceMappingURL=config.d.ts.map