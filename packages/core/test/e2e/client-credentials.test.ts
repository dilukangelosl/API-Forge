import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { APIForge, oauthPlugin, Response, hashSecret } from "../../src";

/**
 * E2E Integration Tests for OAuth 2.0 Client Credentials Flow
 * Tests storage-level operations that power the client credentials grant
 */
describe("OAuth 2.0 Client Credentials Flow - Storage", () => {
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
                    "admin": "Full access",
                },
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
            name: "Test Client",
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

    test("should create and retrieve client", async () => {
        const client = await storage.getClient(clientId);

        expect(client).not.toBeNull();
        expect(client!.name).toBe("Test Client");
        expect(client!.grantTypes).toContain("client_credentials");
        expect(client!.scopes).toContain("read:users");
        expect(client!.isConfidential).toBe(true);
    });

    test("should verify client secret hash", async () => {
        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();
        expect(client!.clientSecretHash).toBeDefined();

        // Secret hash should be in format: salt$hash
        expect(client!.clientSecretHash).toContain("$");
    });

    test("should return null for unknown client", async () => {
        const client = await storage.getClient("unknown_client_id");
        expect(client).toBeNull();
    });

    test("should store access token", async () => {
        const accessToken = `access_${Date.now()}`;

        await storage.storeToken({
            token: accessToken,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 900000), // 15 min
            isRevoked: false,
        });

        const stored = await storage.getToken(accessToken);

        expect(stored).not.toBeNull();
        expect(stored!.tokenType).toBe("access");
        expect(stored!.clientId).toBe(clientId);
        expect(stored!.scopes).toContain("read:users");
    });

    test("should not return expired tokens", async () => {
        const expiredToken = `expired_${Date.now()}`;

        await storage.storeToken({
            token: expiredToken,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() - 1000), // Already expired
            isRevoked: false,
        });

        const stored = await storage.getToken(expiredToken);
        expect(stored).toBeNull();
    });

    test("should update client", async () => {
        const updated = await storage.updateClient(clientId, {
            name: "Updated Test Client",
        });

        expect(updated).not.toBeNull();
        expect(updated!.name).toBe("Updated Test Client");
    });

    test("should get clients by owner", async () => {
        const clients = await storage.getClientByOwnerId("test-owner");

        expect(clients.length).toBeGreaterThanOrEqual(1);
        expect(clients.some(c => c.clientId === clientId)).toBe(true);
    });

    test("should delete client", async () => {
        const newClientId = `cli_delete_${Date.now()}`;

        await storage.createClient({
            clientId: newClientId,
            clientSecretHash: hashSecret("secret"),
            name: "Delete Test",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "test-owner",
            isActive: true,
        });

        const deleted = await storage.deleteClient(newClientId);
        expect(deleted).toBe(true);

        const notFound = await storage.getClient(newClientId);
        expect(notFound).toBeNull();
    });
});

describe("OAuth 2.0 Scope Validation", () => {
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
                    "admin": "Full access",
                },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();
        clientId = `cli_scope_${Date.now()}`;

        // Client with limited scopes
        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Limited Scope Client",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users"], // Only read:users, not write:users or admin
            isConfidential: true,
            ownerId: "test-owner",
            isActive: true,
        });
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should validate client has requested scope", async () => {
        const client = await storage.getClient(clientId);

        expect(client).not.toBeNull();
        expect(client!.scopes).toContain("read:users");
        expect(client!.scopes).not.toContain("write:users");
        expect(client!.scopes).not.toContain("admin");
    });

    test("should check scope subset validation", () => {
        const clientScopes = ["read:users"];
        const requestedScopes = ["read:users", "write:users"];

        const hasAllScopes = requestedScopes.every(s => clientScopes.includes(s));
        expect(hasAllScopes).toBe(false);

        const validRequest = ["read:users"];
        const validCheck = validRequest.every(s => clientScopes.includes(s));
        expect(validCheck).toBe(true);
    });
});
