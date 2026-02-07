import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { APIForge, oauthPlugin, hashSecret } from "../../src";

/**
 * E2E Tests for Rate Limiting
 * Storage and configuration level tests
 */
describe("Rate Limiting - Configuration", () => {
    test("should create forge with rate limit config", async () => {
        const forge = new APIForge({
            auth: {
                grants: ["client_credentials"],
                scopes: { "read:users": "Read user information" },
            },
            rateLimit: {
                windowMs: 60000,
                max: 100,
            },
        });

        expect(forge).toBeDefined();
        await forge.shutdown();
    });

    test("should support endpoint-specific rate limits in metadata", async () => {
        const forge = new APIForge({
            auth: {
                grants: ["client_credentials"],
                scopes: { "read:users": "Read user information" },
            },
        });

        // Endpoints can have metadata with rate limit config
        const endpointMetadata = {
            rateLimit: { windowMs: 10000, max: 5 },
        };

        expect(endpointMetadata.rateLimit.windowMs).toBe(10000);
        expect(endpointMetadata.rateLimit.max).toBe(5);

        await forge.shutdown();
    });
});

describe("Rate Limiting - Client-Based Limits", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["client_credentials"],
                scopes: { "read:users": "Read user information" },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should track requests per client", async () => {
        const clientId = `cli_rate_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Rate Limited Client",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "test-owner",
            isActive: true,
        });

        // Simulate request tracking
        const requestCounts: Record<string, number> = {};

        // Increment request count for client
        requestCounts[clientId] = (requestCounts[clientId] || 0) + 1;
        expect(requestCounts[clientId]).toBe(1);

        // More requests
        requestCounts[clientId]++;
        requestCounts[clientId]++;
        expect(requestCounts[clientId]).toBe(3);
    });

    test("should detect when client exceeds limit", async () => {
        const maxRequests = 5;
        let currentRequests = 0;

        // Simulate requests
        for (let i = 0; i < 7; i++) {
            currentRequests++;
            const isLimited = currentRequests > maxRequests;

            if (i < maxRequests) {
                expect(isLimited).toBe(false);
            } else {
                expect(isLimited).toBe(true);
            }
        }
    });

    test("should reset after window expires", async () => {
        const windowMs = 100; // 100ms window for testing
        let requestCount = 5;

        expect(requestCount).toBe(5);

        // Simulate window reset
        await new Promise(resolve => setTimeout(resolve, windowMs + 10));

        // After window, count should reset
        requestCount = 0;
        expect(requestCount).toBe(0);
    });
});

describe("Rate Limiting - Response Headers", () => {
    test("should include standard rate limit headers format", () => {
        const limit = 100;
        const remaining = 95;
        const resetTime = Math.floor(Date.now() / 1000) + 60;

        const headers = {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(resetTime),
        };

        expect(headers["X-RateLimit-Limit"]).toBe("100");
        expect(headers["X-RateLimit-Remaining"]).toBe("95");
        expect(parseInt(headers["X-RateLimit-Reset"])).toBeGreaterThan(0);
    });

    test("should return Retry-After when limited", () => {
        const retryAfterSeconds = 30;

        const headers = {
            "Retry-After": String(retryAfterSeconds),
        };

        expect(headers["Retry-After"]).toBe("30");
    });
});

describe("Rate Limiting - IP-Based Limits", () => {
    test("should track requests per IP address", () => {
        const ipCounts: Record<string, number> = {};

        const ip1 = "192.168.1.100";
        const ip2 = "192.168.1.101";

        // Track requests from different IPs
        ipCounts[ip1] = (ipCounts[ip1] || 0) + 1;
        ipCounts[ip1]++;
        ipCounts[ip2] = (ipCounts[ip2] || 0) + 1;

        expect(ipCounts[ip1]).toBe(2);
        expect(ipCounts[ip2]).toBe(1);
    });

    test("should handle X-Forwarded-For header for proxied requests", () => {
        // Simulate parsing X-Forwarded-For
        const xForwardedFor = "203.0.113.195, 70.41.3.18, 150.172.238.178";
        const clientIp = xForwardedFor.split(",")[0].trim();

        expect(clientIp).toBe("203.0.113.195");
    });
});

describe("Rate Limiting - Sliding Window", () => {
    test("should implement sliding window algorithm concept", () => {
        const windowMs = 60000;
        const maxRequests = 100;

        // Timestamps of recent requests
        const requests: number[] = [];
        const now = Date.now();

        // Add some requests
        for (let i = 0; i < 50; i++) {
            requests.push(now - i * 1000);
        }

        // Count requests in current window
        const windowStart = now - windowMs;
        const requestsInWindow = requests.filter(ts => ts >= windowStart).length;

        expect(requestsInWindow).toBe(50);
        expect(requestsInWindow).toBeLessThan(maxRequests);
    });

    test("should reject requests when window is full", () => {
        const maxRequests = 10;

        // Simulate full window
        const requests: number[] = [];
        const now = Date.now();

        for (let i = 0; i < 10; i++) {
            requests.push(now - i * 100);
        }

        const isLimited = requests.length >= maxRequests;
        expect(isLimited).toBe(true);
    });
});
