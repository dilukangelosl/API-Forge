import { describe, test, expect, beforeEach, mock } from "bun:test";
import { PrismaStorageAdapter } from "../src/adapter";

/**
 * Mock Prisma Client for testing
 */
function createMockPrisma() {
    const storage = {
        clients: new Map(),
        tokens: new Map(),
        authCodes: new Map(),
        rateLimits: new Map(),
        consents: new Map(),
    };

    return {
        oAuthClient: {
            create: mock(async ({ data }: any) => {
                const client = { ...data, createdAt: new Date(), updatedAt: new Date() };
                storage.clients.set(data.clientId, client);
                return client;
            }),
            findUnique: mock(async ({ where }: any) => {
                return storage.clients.get(where.clientId) ?? null;
            }),
            findMany: mock(async ({ where }: any) => {
                return Array.from(storage.clients.values()).filter(c => c.ownerId === where.ownerId);
            }),
            update: mock(async ({ where, data }: any) => {
                const existing = storage.clients.get(where.clientId);
                if (!existing) throw new Error("Not found");
                const updated = { ...existing, ...data, updatedAt: new Date() };
                storage.clients.set(where.clientId, updated);
                return updated;
            }),
            delete: mock(async ({ where }: any) => {
                storage.clients.delete(where.clientId);
                return { clientId: where.clientId };
            }),
        },
        oAuthToken: {
            create: mock(async ({ data }: any) => {
                const token = { ...data, createdAt: new Date() };
                storage.tokens.set(data.token, token);
                return token;
            }),
            findUnique: mock(async ({ where }: any) => {
                return storage.tokens.get(where.token) ?? null;
            }),
            update: mock(async ({ where, data }: any) => {
                const existing = storage.tokens.get(where.token);
                if (!existing) throw new Error("Not found");
                const updated = { ...existing, ...data };
                storage.tokens.set(where.token, updated);
                return updated;
            }),
            updateMany: mock(async ({ where, data }: any) => {
                let count = 0;
                for (const [key, token] of storage.tokens) {
                    if (token.clientId === where.clientId || token.userId === where.userId) {
                        if (!token.isRevoked) {
                            token.isRevoked = true;
                            count++;
                        }
                    }
                }
                return { count };
            }),
            deleteMany: mock(async () => ({ count: 0 })),
        },
        oAuthAuthCode: {
            create: mock(async ({ data }: any) => {
                const code = { ...data, createdAt: new Date() };
                storage.authCodes.set(data.code, code);
                return code;
            }),
            findUnique: mock(async ({ where }: any) => {
                return storage.authCodes.get(where.code) ?? null;
            }),
            delete: mock(async ({ where }: any) => {
                storage.authCodes.delete(where.code);
                return { code: where.code };
            }),
            deleteMany: mock(async () => ({ count: 0 })),
        },
        oAuthRateLimit: {
            findUnique: mock(async ({ where }: any) => {
                return storage.rateLimits.get(where.key) ?? null;
            }),
            upsert: mock(async ({ where, create, update }: any) => {
                const existing = storage.rateLimits.get(where.key);
                if (existing) {
                    const updated = { ...existing, ...update };
                    storage.rateLimits.set(where.key, updated);
                    return updated;
                }
                storage.rateLimits.set(where.key, create);
                return create;
            }),
            update: mock(async ({ where, data }: any) => {
                const existing = storage.rateLimits.get(where.key);
                if (!existing) throw new Error("Not found");
                const updated = { ...existing, count: existing.count + 1 };
                storage.rateLimits.set(where.key, updated);
                return updated;
            }),
            delete: mock(async ({ where }: any) => {
                storage.rateLimits.delete(where.key);
                return { key: where.key };
            }),
        },
        oAuthConsent: {
            findUnique: mock(async ({ where }: any) => {
                const key = `${where.userId_clientId.userId}:${where.userId_clientId.clientId}`;
                return storage.consents.get(key) ?? null;
            }),
            upsert: mock(async ({ where, create, update }: any) => {
                const key = `${where.userId_clientId.userId}:${where.userId_clientId.clientId}`;
                const existing = storage.consents.get(key);
                if (existing) {
                    const updated = { ...existing, ...update };
                    storage.consents.set(key, updated);
                    return updated;
                }
                storage.consents.set(key, create);
                return create;
            }),
            delete: mock(async ({ where }: any) => {
                const key = `${where.userId_clientId.userId}:${where.userId_clientId.clientId}`;
                storage.consents.delete(key);
                return {};
            }),
        },
        $disconnect: mock(async () => { }),
        _storage: storage, // Expose for testing
    };
}

describe("PrismaStorageAdapter - Clients", () => {
    let adapter: PrismaStorageAdapter;
    let mockPrisma: ReturnType<typeof createMockPrisma>;

    beforeEach(() => {
        mockPrisma = createMockPrisma();
        adapter = new PrismaStorageAdapter({ prisma: mockPrisma as any });
    });

    test("should create client", async () => {
        const client = await adapter.createClient({
            clientId: "test-client",
            clientSecretHash: "hash123",
            name: "Test Client",
            redirectUris: ["http://localhost:8080/callback"],
            grantTypes: ["authorization_code"],
            scopes: ["read:users"],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        expect(client.clientId).toBe("test-client");
        expect(client.name).toBe("Test Client");
        expect(client.createdAt).toBeInstanceOf(Date);
        expect(mockPrisma.oAuthClient.create).toHaveBeenCalled();
    });

    test("should get client by id", async () => {
        await adapter.createClient({
            clientId: "get-test",
            clientSecretHash: "hash",
            name: "Get Test",
            redirectUris: [],
            grantTypes: ["client_credentials"],
            scopes: ["read"],
            isConfidential: true,
            ownerId: "owner",
            isActive: true,
        });

        const client = await adapter.getClient("get-test");
        expect(client).not.toBeNull();
        expect(client!.clientId).toBe("get-test");
    });

    test("should return null for unknown client", async () => {
        const client = await adapter.getClient("unknown");
        expect(client).toBeNull();
    });

    test("should update client", async () => {
        await adapter.createClient({
            clientId: "update-test",
            clientSecretHash: "hash",
            name: "Original",
            redirectUris: [],
            grantTypes: [],
            scopes: [],
            isConfidential: true,
            ownerId: "owner",
            isActive: true,
        });

        const updated = await adapter.updateClient("update-test", { name: "Updated" });
        expect(updated).not.toBeNull();
        expect(updated!.name).toBe("Updated");
    });

    test("should delete client", async () => {
        await adapter.createClient({
            clientId: "delete-test",
            clientSecretHash: "hash",
            name: "Delete Me",
            redirectUris: [],
            grantTypes: [],
            scopes: [],
            isConfidential: true,
            ownerId: "owner",
            isActive: true,
        });

        const deleted = await adapter.deleteClient("delete-test");
        expect(deleted).toBe(true);
    });

    test("should get clients by owner", async () => {
        await adapter.createClient({
            clientId: "owner-1-client",
            clientSecretHash: "hash",
            name: "Client 1",
            redirectUris: [],
            grantTypes: [],
            scopes: [],
            isConfidential: true,
            ownerId: "owner-1",
            isActive: true,
        });

        const clients = await adapter.getClientByOwnerId("owner-1");
        expect(clients.length).toBeGreaterThanOrEqual(1);
    });
});

describe("PrismaStorageAdapter - Tokens", () => {
    let adapter: PrismaStorageAdapter;
    let mockPrisma: ReturnType<typeof createMockPrisma>;

    beforeEach(() => {
        mockPrisma = createMockPrisma();
        adapter = new PrismaStorageAdapter({ prisma: mockPrisma as any });
    });

    test("should store token", async () => {
        const token = await adapter.storeToken({
            token: "access_token_123",
            type: "access",
            clientId: "client-1",
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        expect(token.token).toBe("access_token_123");
        expect(token.type).toBe("access");
        expect(token.createdAt).toBeInstanceOf(Date);
    });

    test("should get valid token", async () => {
        await adapter.storeToken({
            token: "valid_token",
            type: "access",
            clientId: "client-1",
            scopes: ["read"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        const token = await adapter.getToken("valid_token");
        expect(token).not.toBeNull();
        expect(token!.token).toBe("valid_token");
    });

    test("should return null for expired token", async () => {
        await adapter.storeToken({
            token: "expired_token",
            type: "access",
            clientId: "client-1",
            scopes: ["read"],
            expiresAt: new Date(Date.now() - 1000), // Expired
            isRevoked: false,
        });

        const token = await adapter.getToken("expired_token");
        expect(token).toBeNull();
    });

    test("should return null for revoked token", async () => {
        await adapter.storeToken({
            token: "revoked_token",
            type: "access",
            clientId: "client-1",
            scopes: ["read"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: true, // Revoked
        });

        const token = await adapter.getToken("revoked_token");
        expect(token).toBeNull();
    });

    test("should revoke token", async () => {
        await adapter.storeToken({
            token: "to_revoke",
            type: "access",
            clientId: "client-1",
            scopes: ["read"],
            expiresAt: new Date(Date.now() + 3600000),
            isRevoked: false,
        });

        const result = await adapter.revokeToken("to_revoke");
        expect(result).toBe(true);
    });
});

describe("PrismaStorageAdapter - Auth Codes", () => {
    let adapter: PrismaStorageAdapter;
    let mockPrisma: ReturnType<typeof createMockPrisma>;

    beforeEach(() => {
        mockPrisma = createMockPrisma();
        adapter = new PrismaStorageAdapter({ prisma: mockPrisma as any });
    });

    test("should store auth code", async () => {
        const code = await adapter.storeAuthCode({
            code: "auth_code_123",
            clientId: "client-1",
            userId: "user-1",
            redirectUri: "http://localhost:8080/callback",
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
        });

        expect(code.code).toBe("auth_code_123");
        expect(code.clientId).toBe("client-1");
        expect(code.createdAt).toBeInstanceOf(Date);
    });

    test("should consume valid auth code", async () => {
        await adapter.storeAuthCode({
            code: "consume_code",
            clientId: "client-1",
            userId: "user-1",
            redirectUri: "http://localhost:8080/callback",
            scopes: ["read"],
            expiresAt: new Date(Date.now() + 600000),
        });

        const consumed = await adapter.consumeAuthCode("consume_code");
        expect(consumed).not.toBeNull();
        expect(consumed!.code).toBe("consume_code");
    });

    test("should return null for expired auth code", async () => {
        await adapter.storeAuthCode({
            code: "expired_code",
            clientId: "client-1",
            userId: "user-1",
            redirectUri: "http://localhost:8080/callback",
            scopes: ["read"],
            expiresAt: new Date(Date.now() - 1000), // Expired
        });

        const consumed = await adapter.consumeAuthCode("expired_code");
        expect(consumed).toBeNull();
    });

    test("should store auth code with PKCE", async () => {
        const code = await adapter.storeAuthCode({
            code: "pkce_code",
            clientId: "client-1",
            userId: "user-1",
            redirectUri: "http://localhost:8080/callback",
            scopes: ["read"],
            codeChallenge: "challenge_value",
            codeChallengeMethod: "S256",
            expiresAt: new Date(Date.now() + 600000),
        });

        expect(code.codeChallenge).toBe("challenge_value");
        expect(code.codeChallengeMethod).toBe("S256");
    });
});

describe("PrismaStorageAdapter - Consent", () => {
    let adapter: PrismaStorageAdapter;
    let mockPrisma: ReturnType<typeof createMockPrisma>;

    beforeEach(() => {
        mockPrisma = createMockPrisma();
        adapter = new PrismaStorageAdapter({ prisma: mockPrisma as any });
    });

    test("should store consent", async () => {
        await adapter.storeConsent("user-1", "client-1", ["read:users", "write:users"]);
        expect(mockPrisma.oAuthConsent.upsert).toHaveBeenCalled();
    });

    test("should get consent", async () => {
        await adapter.storeConsent("user-1", "client-1", ["read:users"]);

        const scopes = await adapter.getConsent("user-1", "client-1");
        expect(scopes).toContain("read:users");
    });

    test("should revoke consent", async () => {
        await adapter.storeConsent("user-1", "client-1", ["read:users"]);

        const result = await adapter.revokeConsent("user-1", "client-1");
        expect(result).toBe(true);
    });
});

describe("PrismaStorageAdapter - Lifecycle", () => {
    test("should initialize without error", async () => {
        const mockPrisma = createMockPrisma();
        const adapter = new PrismaStorageAdapter({ prisma: mockPrisma as any });

        await expect(adapter.initialize()).resolves.toBeUndefined();
    });

    test("should close and disconnect", async () => {
        const mockPrisma = createMockPrisma();
        const adapter = new PrismaStorageAdapter({ prisma: mockPrisma as any });

        await adapter.close();
        expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
});
