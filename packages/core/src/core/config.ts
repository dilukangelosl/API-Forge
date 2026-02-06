
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
export type OAuthGrant =
    | "authorization_code"
    | "client_credentials"
    | "refresh_token"
    | "device_code";

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
export type StorageConfig =
    | "memory"
    | "redis"
    | { adapter: StorageAdapter };

/**
 * Main API Forge configuration
 */
export interface APIForgeConfig {
    /** Framework adapter (required) */
    adapter: FrameworkAdapter;

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
export const DEFAULT_CONFIG = {
    app: {
        name: "API Forge",
        description: "API Platform",
        version: "1.0.0",
        logo: "",
        tosUrl: "",
        privacyUrl: "",
    },
    auth: {
        tokens: {
            accessToken: {
                format: "jwt" as TokenFormat,
                ttl: "15m",
                signing: "RS256" as JWTAlgorithm,
            },
            refreshToken: {
                ttl: "30d",
                rotation: true,
                reuseDetection: true,
            },
        },
        scopes: {},
        grants: ["authorization_code", "client_credentials", "refresh_token"] as OAuthGrant[],
        pkce: {
            required: "public_clients" as PKCERequirement,
        },
        consent: {
            screen: "built-in" as const,
            rememberDuration: "30d",
        },
    },
    rateLimit: {
        global: "1000/hour" as RateLimitString,
        storage: "memory" as const,
        headers: true,
    },
    portal: {
        enabled: true,
        branding: {},
        features: {
            apiConsole: true,
            codeExamples: true,
            changelog: false,
            statusPage: false,
        },
        pages: {},
        codeExamples: ["curl", "javascript", "python"] as const,
    },
    docs: {
        enabled: true,
        export: ["openapi"] as const,
        groupBy: "api" as const,
    },
} as const;

/**
 * Parse a duration string to milliseconds
 */
export function parseDuration(duration: Duration): number {
    if (typeof duration === "number") {
        return duration;
    }

    const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) {
        throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case "ms": return value;
        case "s": return value * 1000;
        case "m": return value * 60 * 1000;
        case "h": return value * 60 * 60 * 1000;
        case "d": return value * 24 * 60 * 60 * 1000;
        default: throw new Error(`Unknown duration unit: ${unit}`);
    }
}

/**
 * Parse a rate limit string
 */
export function parseRateLimit(rateLimit: RateLimitString): { requests: number; windowMs: number } {
    const match = rateLimit.match(/^(\d+)\/(sec|min|hour|day)$/);
    if (!match) {
        throw new Error(`Invalid rate limit format: ${rateLimit}`);
    }

    const requests = parseInt(match[1], 10);
    const unit = match[2];

    let windowMs: number;
    switch (unit) {
        case "sec": windowMs = 1000; break;
        case "min": windowMs = 60 * 1000; break;
        case "hour": windowMs = 60 * 60 * 1000; break;
        case "day": windowMs = 24 * 60 * 60 * 1000; break;
        default: throw new Error(`Unknown rate limit unit: ${unit}`);
    }

    return { requests, windowMs };
}
