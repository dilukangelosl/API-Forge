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
                format: "jwt",
                ttl: "15m",
                signing: "RS256",
            },
            refreshToken: {
                ttl: "30d",
                rotation: true,
                reuseDetection: true,
            },
        },
        scopes: {},
        grants: ["authorization_code", "client_credentials", "refresh_token"],
        pkce: {
            required: "public_clients",
        },
        consent: {
            screen: "built-in",
            rememberDuration: "30d",
        },
    },
    rateLimit: {
        global: "1000/hour",
        storage: "memory",
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
        codeExamples: ["curl", "javascript", "python"],
    },
    docs: {
        enabled: true,
        export: ["openapi"],
        groupBy: "api",
    },
};
/**
 * Parse a duration string to milliseconds
 */
export function parseDuration(duration) {
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
export function parseRateLimit(rateLimit) {
    const match = rateLimit.match(/^(\d+)\/(sec|min|hour|day)$/);
    if (!match) {
        throw new Error(`Invalid rate limit format: ${rateLimit}`);
    }
    const requests = parseInt(match[1], 10);
    const unit = match[2];
    let windowMs;
    switch (unit) {
        case "sec":
            windowMs = 1000;
            break;
        case "min":
            windowMs = 60 * 1000;
            break;
        case "hour":
            windowMs = 60 * 60 * 1000;
            break;
        case "day":
            windowMs = 24 * 60 * 60 * 1000;
            break;
        default: throw new Error(`Unknown rate limit unit: ${unit}`);
    }
    return { requests, windowMs };
}
//# sourceMappingURL=config.js.map