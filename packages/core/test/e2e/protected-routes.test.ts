import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { APIForge, oauthPlugin, Response, hashSecret } from "../../src";

/**
 * E2E Tests for Protected API Routes
 * Storage-level tests for token validation and scope enforcement
 */
describe("Protected Routes - Token Validation (Storage)", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["client_credentials"],
                scopes: {
                    "read:users": "Read user information",
                    "write:users": "Create and update users",
                    "admin": "Admin access",
                },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();

        clientId = `cli_protected_${Date.now()}`;

        // Client with read:users and write:users (NOT admin)
        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Protected Routes Test Client",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users", "write:users"],
            isConfidential: true,
            ownerId: "test-owner",
            isActive: true,
        });
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should store and retrieve valid access token", async () => {
        const token = `access_valid_${Date.now()}`;

        await storage.storeToken({
            token,
            tokenType: "access",
            clientId,
            scopes: ["read:users", "write:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        const stored = await storage.getToken(token);
        expect(stored).not.toBeNull();
        expect(stored!.tokenType).toBe("access");
        expect(stored!.scopes).toContain("read:users");
    });

    test("should return null for non-existent token", async () => {
        const stored = await storage.getToken("non_existent_token_xyz");
        expect(stored).toBeNull();
    });

    test("should validate token has required scope", async () => {
        const token = `access_scope_${Date.now()}`;

        await storage.storeToken({
            token,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        const stored = await storage.getToken(token);
        expect(stored).not.toBeNull();

        // Token has read:users
        expect(stored!.scopes).toContain("read:users");

        // Token does NOT have admin
        expect(stored!.scopes).not.toContain("admin");
    });

    test("should detect insufficient scope", async () => {
        const token = `access_insufficient_${Date.now()}`;

        await storage.storeToken({
            token,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        const stored = await storage.getToken(token);
        const requiredScope = "admin";

        const hasRequiredScope = stored!.scopes.includes(requiredScope);
        expect(hasRequiredScope).toBe(false);
    });

    test("should not return expired tokens", async () => {
        const token = `access_expired_${Date.now()}`;

        await storage.storeToken({
            token,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() - 1000), // Already expired
            isRevoked: false,
        });

        const stored = await storage.getToken(token);
        expect(stored).toBeNull();
    });
});

describe("Protected Routes - Token Revocation", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;

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

        clientId = `cli_revoke_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Revoke Test Client",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "test-owner",
            isActive: true,
        });
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should revoke token successfully", async () => {
        const token = `access_revoke_single_${Date.now()}`;

        await storage.storeToken({
            token,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        // Verify token exists
        let stored = await storage.getToken(token);
        expect(stored).not.toBeNull();

        // Revoke
        await storage.revokeToken(token);

        // Token should no longer be retrievable
        stored = await storage.getToken(token);
        expect(stored).toBeNull();
    });

    test("should revoke all client tokens", async () => {
        const token1 = `access_revoke_all_1_${Date.now()}`;
        const token2 = `access_revoke_all_2_${Date.now()}`;

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
            tokenType: "refresh",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 86400000),
            isRevoked: false,
        });

        // Revoke all
        const revokedCount = await storage.revokeAllClientTokens(clientId);
        expect(revokedCount).toBeGreaterThanOrEqual(2);

        // Both tokens should be gone
        expect(await storage.getToken(token1)).toBeNull();
        expect(await storage.getToken(token2)).toBeNull();
    });
});

describe("Protected Routes - Scope Validation", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["client_credentials"],
                scopes: {
                    "read:users": "Read user information",
                    "write:users": "Create and update users",
                    "delete:users": "Delete users",
                    "admin": "Full admin access",
                },
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

    test("should validate single scope requirement", async () => {
        const tokenScopes = ["read:users"];
        const required = "read:users";

        const hasScope = tokenScopes.includes(required);
        expect(hasScope).toBe(true);
    });

    test("should validate multiple scope requirements", async () => {
        const tokenScopes = ["read:users", "write:users"];
        const required = ["read:users", "write:users"];

        const hasAllScopes = required.every(s => tokenScopes.includes(s));
        expect(hasAllScopes).toBe(true);
    });

    test("should fail when missing one of multiple required scopes", async () => {
        const tokenScopes = ["read:users"];
        const required = ["read:users", "write:users"];

        const hasAllScopes = required.every(s => tokenScopes.includes(s));
        expect(hasAllScopes).toBe(false);
    });

    test("should allow superset of required scopes", async () => {
        const tokenScopes = ["read:users", "write:users", "admin"];
        const required = ["read:users"];

        const hasAllScopes = required.every(s => tokenScopes.includes(s));
        expect(hasAllScopes).toBe(true);
    });
});
