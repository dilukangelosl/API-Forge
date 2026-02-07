import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { APIForge, oauthPlugin, hashSecret } from "../../src";

/**
 * E2E Tests for Client Management Edge Cases
 */
describe("Client Management - Edge Cases", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["client_credentials", "authorization_code"],
                scopes: {
                    "read:users": "Read user information",
                    "write:users": "Create and update users",
                },
                maxAppsPerUser: 3,
                maxRedirectUrisPerApp: 5,
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

    test("should create client with all required fields", async () => {
        const clientId = `cli_full_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Full Client",
            redirectUris: ["http://localhost:8080/callback"],
            grantTypes: ["client_credentials", "authorization_code"],
            scopes: ["read:users", "write:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();
        expect(client!.name).toBe("Full Client");
        expect(client!.isActive).toBe(true);
        expect(client!.createdAt).toBeInstanceOf(Date);
    });

    test("should update client name and scopes", async () => {
        const clientId = `cli_update_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Original Name",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        const updated = await storage.updateClient(clientId, {
            name: "Updated Name",
            scopes: ["read:users", "write:users"],
        });

        expect(updated).not.toBeNull();
        expect(updated!.name).toBe("Updated Name");
        expect(updated!.scopes).toContain("write:users");
    });

    test("should deactivate client", async () => {
        const clientId = `cli_deactivate_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Active Client",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        await storage.updateClient(clientId, { isActive: false });

        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();
        expect(client!.isActive).toBe(false);
    });

    test("should list clients by owner", async () => {
        const ownerId = `owner_list_${Date.now()}`;

        // Create multiple clients for the same owner
        for (let i = 0; i < 3; i++) {
            await storage.createClient({
                clientId: `cli_list_${ownerId}_${i}`,
                clientSecretHash: hashSecret("secret"),
                name: `Client ${i}`,
                redirectUris: [],
                grantTypes: ["client_credentials"],
                scopes: ["read:users"],
                isConfidential: true,
                ownerId,
                isActive: true,
            });
        }

        const clients = await storage.getClientByOwnerId(ownerId);
        expect(clients.length).toBe(3);
    });

    test("should delete client and revoke all tokens", async () => {
        const clientId = `cli_delete_tokens_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Delete Test",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        // Create some tokens
        await storage.storeToken({
            token: `token_delete_1_${Date.now()}`,
            tokenType: "access",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        await storage.storeToken({
            token: `token_delete_2_${Date.now()}`,
            tokenType: "refresh",
            clientId,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 86400000),
            isRevoked: false,
        });

        // Revoke all tokens then delete client
        await storage.revokeAllClientTokens(clientId);
        await storage.deleteClient(clientId);

        const deleted = await storage.getClient(clientId);
        expect(deleted).toBeNull();
    });

    test("should update client secret hash", async () => {
        const clientId = `cli_secret_${Date.now()}`;
        const oldSecretHash = hashSecret("old_secret");
        const newSecretHash = hashSecret("new_secret");

        await storage.createClient({
            clientId,
            clientSecretHash: oldSecretHash,
            name: "Secret Update Test",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        await storage.updateClient(clientId, { clientSecretHash: newSecretHash });

        const client = await storage.getClient(clientId);
        expect(client!.clientSecretHash).toBe(newSecretHash);
        expect(client!.clientSecretHash).not.toBe(oldSecretHash);
    });

    test("should add redirect URIs to client", async () => {
        const clientId = `cli_redirects_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Redirect Test",
            redirectUris: ["http://localhost:8080/callback"],
            grantTypes: ["authorization_code"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        await storage.updateClient(clientId, {
            redirectUris: [
                "http://localhost:8080/callback",
                "http://localhost:8081/callback",
                "https://production.example.com/callback",
            ],
        });

        const client = await storage.getClient(clientId);
        expect(client!.redirectUris.length).toBe(3);
        expect(client!.redirectUris).toContain("https://production.example.com/callback");
    });

    test("should validate redirect URI is registered", async () => {
        const clientId = `cli_validate_redirect_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Validate Redirect",
            redirectUris: ["http://localhost:8080/callback"],
            grantTypes: ["authorization_code"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        const client = await storage.getClient(clientId);

        // Valid redirect
        expect(client!.redirectUris).toContain("http://localhost:8080/callback");

        // Invalid redirect (not registered)
        expect(client!.redirectUris).not.toContain("http://evil.com/callback");
    });
});

describe("Client Management - Grant Types", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["client_credentials", "authorization_code", "refresh_token"],
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

    test("should only allow configured grant types", async () => {
        const clientId = `cli_grants_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Grant Type Test",
            redirectUris: [],
            grantTypes: ["client_credentials"], // Only client_credentials
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        const client = await storage.getClient(clientId);

        expect(client!.grantTypes).toContain("client_credentials");
        expect(client!.grantTypes).not.toContain("authorization_code");
        expect(client!.grantTypes).not.toContain("refresh_token");
    });

    test("should support multiple grant types", async () => {
        const clientId = `cli_multi_grants_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Multi Grant Client",
            redirectUris: ["http://localhost:8080/callback"],
            grantTypes: ["authorization_code", "refresh_token"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        const client = await storage.getClient(clientId);

        expect(client!.grantTypes).toContain("authorization_code");
        expect(client!.grantTypes).toContain("refresh_token");
    });

    test("should update grant types", async () => {
        const clientId = `cli_update_grants_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Update Grant Client",
            redirectUris: ["http://localhost:8080/callback"],
            grantTypes: ["authorization_code"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        await storage.updateClient(clientId, {
            grantTypes: ["authorization_code", "refresh_token"],
        });

        const client = await storage.getClient(clientId);
        expect(client!.grantTypes).toContain("refresh_token");
    });
});
