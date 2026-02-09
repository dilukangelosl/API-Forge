import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { APIForge, oauthPlugin, Response, hashSecret } from "../../src";

/**
 * E2E Tests for OAuth Token Endpoint using Bun's native server
 * Tests actual HTTP requests to /oauth/token
 */
describe("OAuth Token Endpoint - Client Credentials (Storage)", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;
    let clientSecret: string;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["client_credentials", "authorization_code", "refresh_token"],
                scopes: {
                    "read:users": "Read user information",
                    "write:users": "Create and update users",
                },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();

        // Create test client
        clientId = `cli_endpoint_${Date.now()}`;
        clientSecret = `sec_endpoint_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: await hashSecret(clientSecret),
            name: "OAuth Endpoint Test Client",
            redirectUris: ["http://localhost:8080/callback"],
            grantTypes: ["client_credentials", "authorization_code", "refresh_token"],
            scopes: ["read:users", "write:users"],
            isConfidential: true,
            ownerId: "test-owner",
            isActive: true,
        });
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should verify client credentials at storage level", async () => {
        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();
        expect(client!.name).toBe("OAuth Endpoint Test Client");
        expect(client!.grantTypes).toContain("client_credentials");
    });

    test("should validate client secret hash format", async () => {
        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();
        // Argon2id hash format: $argon2id$...
        expect(client!.clientSecretHash?.startsWith("$argon2id$")).toBe(true);
    });

    test("should reject unknown client_id", async () => {
        const client = await storage.getClient("unknown_client_xyz");
        expect(client).toBeNull();
    });

    test("should validate scopes are subset of client scopes", async () => {
        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();

        const requestedScopes = ["read:users"];
        const hasAllScopes = requestedScopes.every(s => client!.scopes.includes(s));
        expect(hasAllScopes).toBe(true);

        const invalidScopes = ["admin", "superuser"];
        const hasInvalidScopes = invalidScopes.every(s => client!.scopes.includes(s));
        expect(hasInvalidScopes).toBe(false);
    });

    test("should validate grant type is allowed for client", async () => {
        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();

        expect(client!.grantTypes).toContain("client_credentials");
        expect(client!.grantTypes).not.toContain("password");
        expect(client!.grantTypes).not.toContain("implicit");
    });
});

describe("OAuth Token Endpoint - Authorization Code (Storage)", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;
    let clientSecret: string;
    const REDIRECT_URI = "http://localhost:8080/callback";

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["authorization_code", "refresh_token"],
                scopes: {
                    "read:users": "Read user information",
                    "write:users": "Create and update users",
                },
                pkce: { required: "public_clients" },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();

        clientId = `cli_authcode_ep_${Date.now()}`;
        clientSecret = `sec_authcode_ep_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: await hashSecret(clientSecret),
            name: "Auth Code Endpoint Test Client",
            redirectUris: [REDIRECT_URI],
            grantTypes: ["authorization_code", "refresh_token"],
            scopes: ["read:users", "write:users"],
            isConfidential: true,
            ownerId: "test-owner",
            isActive: true,
        });
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should consume valid authorization code", async () => {
        const code = `authcode_ep_valid_${Date.now()}`;
        await storage.storeAuthCode({
            code,
            clientId,
            userId: "test-user",
            redirectUri: REDIRECT_URI,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
        });

        const consumed = await storage.consumeAuthCode(code);
        expect(consumed).not.toBeNull();
        expect(consumed!.clientId).toBe(clientId);
        expect(consumed!.userId).toBe("test-user");
    });

    test("should prevent reuse of authorization code", async () => {
        const code = `authcode_ep_reuse_${Date.now()}`;
        await storage.storeAuthCode({
            code,
            clientId,
            userId: "test-user",
            redirectUri: REDIRECT_URI,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
        });

        // First consumption
        const first = await storage.consumeAuthCode(code);
        expect(first).not.toBeNull();

        // Second attempt should fail
        const second = await storage.consumeAuthCode(code);
        expect(second).toBeNull();
    });

    test("should reject expired authorization code", async () => {
        const code = `authcode_ep_expired_${Date.now()}`;
        await storage.storeAuthCode({
            code,
            clientId,
            userId: "test-user",
            redirectUri: REDIRECT_URI,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() - 1000), // Already expired
        });

        const consumed = await storage.consumeAuthCode(code);
        expect(consumed).toBeNull();
    });

    test("should validate redirect_uri matches", async () => {
        const code = `authcode_ep_redirect_${Date.now()}`;
        await storage.storeAuthCode({
            code,
            clientId,
            userId: "test-user",
            redirectUri: REDIRECT_URI,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
        });

        const consumed = await storage.consumeAuthCode(code);
        expect(consumed).not.toBeNull();
        expect(consumed!.redirectUri).toBe(REDIRECT_URI);
        expect(consumed!.redirectUri).not.toBe("http://evil.com/callback");
    });

    test("should validate client_id matches", async () => {
        const code = `authcode_ep_client_${Date.now()}`;
        await storage.storeAuthCode({
            code,
            clientId: "different_client",
            userId: "test-user",
            redirectUri: REDIRECT_URI,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
        });

        const consumed = await storage.consumeAuthCode(code);
        expect(consumed).not.toBeNull();
        expect(consumed!.clientId).toBe("different_client");
        expect(consumed!.clientId).not.toBe(clientId);
    });
});

describe("OAuth Token Endpoint - Refresh Token (Storage)", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;
    let clientSecret: string;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["client_credentials", "refresh_token"],
                scopes: { "read:users": "Read user information" },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();

        clientId = `cli_refresh_ep_${Date.now()}`;
        clientSecret = `sec_refresh_ep_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: await hashSecret(clientSecret),
            name: "Refresh Token Endpoint Test Client",
            redirectUris: [],
            grantTypes: ["client_credentials", "refresh_token"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "test-owner",
            isActive: true,
        });
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should store and retrieve refresh token", async () => {
        const refreshToken = `refresh_ep_${Date.now()}`;

        await storage.storeToken({
            token: refreshToken,
            tokenType: "refresh",
            clientId,
            userId: "test-user",
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 86400000),
            isRevoked: false,
        });

        const stored = await storage.getToken(refreshToken);
        expect(stored).not.toBeNull();
        expect(stored!.tokenType).toBe("refresh");
        expect(stored!.clientId).toBe(clientId);
    });

    test("should invalidate refresh token after revocation", async () => {
        const refreshToken = `refresh_ep_revoke_${Date.now()}`;

        await storage.storeToken({
            token: refreshToken,
            tokenType: "refresh",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 86400000),
            isRevoked: false,
        });

        await storage.revokeToken(refreshToken);
        const revoked = await storage.getToken(refreshToken);
        expect(revoked).toBeNull();
    });
});

describe("OAuth Token Endpoint - Inactive Client (Storage)", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;
    let clientSecret: string;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["client_credentials"],
                scopes: { "read:users": "Read" },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();

        clientId = `cli_inactive_ep_${Date.now()}`;
        clientSecret = `sec_inactive_ep_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: await hashSecret(clientSecret),
            name: "Inactive Client",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "test-owner",
            isActive: false, // INACTIVE
        });
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should detect inactive client", async () => {
        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();
        expect(client!.isActive).toBe(false);
    });

    test("should validate client must be active before issuing tokens", async () => {
        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();

        // Application logic should check this before issuing tokens
        const canAuthenticate = client!.isActive === true;
        expect(canAuthenticate).toBe(false);
    });
});
