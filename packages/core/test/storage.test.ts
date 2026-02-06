import { describe, test, expect, beforeEach } from "bun:test";
import { MemoryStorageAdapter } from "../src/storage/memory";

describe("MemoryStorageAdapter", () => {
    let storage: MemoryStorageAdapter;

    beforeEach(() => {
        storage = new MemoryStorageAdapter();
    });

    describe("OAuth Clients", () => {
        const testClient = {
            clientId: "test_client_123",
            clientSecretHash: "hashed_secret",
            name: "Test App",
            ownerId: "user_123",
            redirectUris: ["http://localhost:3000/callback"],
            grantTypes: ["client_credentials", "authorization_code"],
            scopes: ["read:users", "write:users"],
            isConfidential: true,
            isActive: true,
        };

        test("createClient should store and return client with timestamps", async () => {
            const client = await storage.createClient(testClient);

            expect(client.clientId).toBe(testClient.clientId);
            expect(client.name).toBe(testClient.name);
            expect(client.createdAt).toBeInstanceOf(Date);
            expect(client.updatedAt).toBeInstanceOf(Date);
        });

        test("getClient should return stored client", async () => {
            await storage.createClient(testClient);
            const client = await storage.getClient(testClient.clientId);

            expect(client).not.toBeNull();
            expect(client?.clientId).toBe(testClient.clientId);
        });

        test("getClient should return null for non-existent client", async () => {
            const client = await storage.getClient("non_existent");
            expect(client).toBeNull();
        });

        test("getClientByOwnerId should return owner's clients", async () => {
            await storage.createClient(testClient);
            await storage.createClient({
                ...testClient,
                clientId: "test_client_456",
                name: "Another App",
            });

            const clients = await storage.getClientByOwnerId("user_123");
            expect(clients).toHaveLength(2);
        });

        test("updateClient should modify client fields", async () => {
            await storage.createClient(testClient);
            const updated = await storage.updateClient(testClient.clientId, {
                name: "Updated App Name",
                isActive: false,
            });

            expect(updated?.name).toBe("Updated App Name");
            expect(updated?.isActive).toBe(false);
        });

        test("deleteClient should remove client", async () => {
            await storage.createClient(testClient);
            const deleted = await storage.deleteClient(testClient.clientId);

            expect(deleted).toBe(true);
            expect(await storage.getClient(testClient.clientId)).toBeNull();
        });
    });

    describe("Tokens", () => {
        const testToken = {
            token: "access_token_xyz",
            type: "access" as const,
            clientId: "test_client_123",
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        };

        test("storeToken should save token", async () => {
            const token = await storage.storeToken(testToken);

            expect(token.token).toBe(testToken.token);
            expect(token.createdAt).toBeInstanceOf(Date);
        });

        test("getToken should return stored token", async () => {
            await storage.storeToken(testToken);
            const token = await storage.getToken(testToken.token);

            expect(token).not.toBeNull();
            expect(token?.clientId).toBe(testToken.clientId);
        });

        test("revokeToken should mark token as revoked", async () => {
            await storage.storeToken(testToken);
            const revoked = await storage.revokeToken(testToken.token);

            expect(revoked).toBe(true);

            // getToken returns null for revoked tokens per implementation
            const token = await storage.getToken(testToken.token);
            expect(token).toBeNull();
        });

        test("revokeAllClientTokens should revoke all tokens for client", async () => {
            await storage.storeToken(testToken);
            await storage.storeToken({
                ...testToken,
                token: "another_token",
            });

            const count = await storage.revokeAllClientTokens(testToken.clientId);
            expect(count).toBe(2);
        });

        test("cleanExpiredTokens should remove expired tokens", async () => {
            await storage.storeToken({
                ...testToken,
                expiresAt: new Date(Date.now() - 1000), // Expired
            });
            await storage.storeToken({
                ...testToken,
                token: "valid_token",
                expiresAt: new Date(Date.now() + 3600000), // Valid
            });

            const cleaned = await storage.cleanExpiredTokens();
            expect(cleaned).toBe(1);
        });
    });

    describe("Authorization Codes", () => {
        const testCode = {
            code: "auth_code_abc",
            clientId: "test_client_123",
            userId: "user_456",
            redirectUri: "http://localhost:3000/callback",
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
        };

        test("storeAuthCode should save authorization code", async () => {
            const code = await storage.storeAuthCode(testCode);

            expect(code.code).toBe(testCode.code);
            expect(code.createdAt).toBeInstanceOf(Date);
        });

        test("consumeAuthCode should return and delete code", async () => {
            await storage.storeAuthCode(testCode);

            const code = await storage.consumeAuthCode(testCode.code);
            expect(code).not.toBeNull();
            expect(code?.code).toBe(testCode.code);

            // Should not be available again
            const secondConsume = await storage.consumeAuthCode(testCode.code);
            expect(secondConsume).toBeNull();
        });
    });

    describe("Rate Limiting", () => {
        test("incrementRateLimit should track request counts", async () => {
            const key = "ratelimit:user:123";
            const windowMs = 60000;

            const count1 = await storage.incrementRateLimit(key, windowMs);
            expect(count1).toBe(1);

            const count2 = await storage.incrementRateLimit(key, windowMs);
            expect(count2).toBe(2);

            const count3 = await storage.incrementRateLimit(key, windowMs);
            expect(count3).toBe(3);
        });

        test("getRateLimitCount should return current count", async () => {
            const key = "ratelimit:api:456";
            const windowMs = 60000;

            await storage.incrementRateLimit(key, windowMs);
            await storage.incrementRateLimit(key, windowMs);

            const count = await storage.getRateLimitCount(key);
            expect(count).toBe(2);
        });

        test("resetRateLimit should clear count", async () => {
            const key = "ratelimit:reset:789";
            const windowMs = 60000;

            await storage.incrementRateLimit(key, windowMs);
            await storage.incrementRateLimit(key, windowMs);

            const reset = await storage.resetRateLimit(key);
            expect(reset).toBe(true);

            const count = await storage.getRateLimitCount(key);
            expect(count).toBe(0);
        });
    });

    describe("Consent Records", () => {
        test("storeConsent should save user consent", async () => {
            await storage.storeConsent("user_123", "client_456", ["read:users", "write:users"]);

            const scopes = await storage.getConsent("user_123", "client_456");
            expect(scopes).toEqual(["read:users", "write:users"]);
        });

        test("revokeConsent should remove consent", async () => {
            await storage.storeConsent("user_123", "client_456", ["read:users"]);
            const revoked = await storage.revokeConsent("user_123", "client_456");

            expect(revoked).toBe(true);

            const scopes = await storage.getConsent("user_123", "client_456");
            expect(scopes).toBeNull();
        });
    });
});
