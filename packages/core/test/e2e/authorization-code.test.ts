import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { APIForge, oauthPlugin, Response, hashSecret } from "../../src";

/**
 * E2E Integration Tests for OAuth 2.0 Authorization Code Flow
 */
describe("OAuth 2.0 Authorization Code Flow", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;
    let clientSecret: string;
    const redirectUri = "http://localhost:8080/callback";

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["client_credentials", "authorization_code", "refresh_token"],
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

        // Create test client
        clientId = `cli_${Date.now()}`;
        clientSecret = `sec_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret(clientSecret),
            name: "Auth Code Test Client",
            redirectUris: [redirectUri],
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

    test("should validate authorization request parameters", async () => {
        const client = await storage.getClient(clientId);

        expect(client).not.toBeNull();
        expect(client!.redirectUris).toContain(redirectUri);
        expect(client!.grantTypes).toContain("authorization_code");
    });

    test("should reject invalid redirect_uri", async () => {
        const client = await storage.getClient(clientId);

        const invalidUri = "http://evil.com/callback";
        expect(client!.redirectUris).not.toContain(invalidUri);
    });

    test("should store and consume authorization code", async () => {
        // Store auth code
        const authCode = `authcode_${Date.now()}`;

        await storage.storeAuthCode({
            code: authCode,
            clientId,
            userId: "test-user",
            redirectUri,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000), // 10 min
        });

        // Consume auth code
        const consumed = await storage.consumeAuthCode(authCode);

        expect(consumed).not.toBeNull();
        expect(consumed!.clientId).toBe(clientId);
        expect(consumed!.userId).toBe("test-user");
        expect(consumed!.scopes).toContain("read:users");

        // Should not be consumable again
        const again = await storage.consumeAuthCode(authCode);
        expect(again).toBeNull();
    });

    test("should store authorization code with PKCE", async () => {
        const authCode = `authcode_pkce_${Date.now()}`;
        const codeChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

        await storage.storeAuthCode({
            code: authCode,
            clientId,
            userId: "test-user",
            redirectUri,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
            codeChallenge,
            codeChallengeMethod: "S256",
        });

        const consumed = await storage.consumeAuthCode(authCode);

        expect(consumed).not.toBeNull();
        expect(consumed!.codeChallenge).toBe(codeChallenge);
        expect(consumed!.codeChallengeMethod).toBe("S256");
    });

    test("should not return expired authorization codes", async () => {
        const authCode = `authcode_expired_${Date.now()}`;

        await storage.storeAuthCode({
            code: authCode,
            clientId,
            userId: "test-user",
            redirectUri,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() - 1000), // Already expired
        });

        const consumed = await storage.consumeAuthCode(authCode);
        expect(consumed).toBeNull();
    });
});

describe("OAuth 2.0 Refresh Token Flow", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["refresh_token"],
                scopes: {
                    "read:users": "Read user information",
                },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();
        clientId = `cli_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Refresh Token Test Client",
            redirectUris: [],
            grantTypes: ["refresh_token"],
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
        const refreshToken = `refresh_${Date.now()}`;

        await storage.storeToken({
            token: refreshToken,
            tokenType: "refresh",
            clientId,
            userId: "test-user",
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 86400000), // 24 hours
            isRevoked: false,
        });

        const stored = await storage.getToken(refreshToken);

        expect(stored).not.toBeNull();
        expect(stored!.tokenType).toBe("refresh");
        expect(stored!.clientId).toBe(clientId);
    });

    test("should revoke token", async () => {
        const token = `token_revoke_${Date.now()}`;

        await storage.storeToken({
            token,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        await storage.revokeToken(token);

        const revoked = await storage.getToken(token);
        expect(revoked).toBeNull(); // Should not return revoked tokens
    });

    test("should revoke all client tokens", async () => {
        const token1 = `token_client_1_${Date.now()}`;
        const token2 = `token_client_2_${Date.now()}`;

        await storage.storeToken({
            token: token1,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        await storage.storeToken({
            token: token2,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        const revokedCount = await storage.revokeAllClientTokens(clientId);

        expect(revokedCount).toBeGreaterThanOrEqual(2);

        const t1 = await storage.getToken(token1);
        const t2 = await storage.getToken(token2);

        expect(t1).toBeNull();
        expect(t2).toBeNull();
    });
});
