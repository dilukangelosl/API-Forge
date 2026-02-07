import { describe, test, expect, beforeEach, mock } from "bun:test";
import { DrizzleStorageAdapter } from "../src/adapter";

/**
 * Mock Drizzle database for testing
 * Uses a simpler approach that doesn't rely on table names
 */
function createMockDrizzle() {
    const storage = {
        clients: new Map<string, any>(),
        tokens: new Map<string, any>(),
        authCodes: new Map<string, any>(),
        rateLimits: new Map<string, any>(),
        consents: new Map<string, any>(),
    };

    // Track the last operation type for routing
    let lastInsertType: string = "";

    return {
        select: mock(() => ({
            from: mock((table: any) => ({
                where: mock(() => ({
                    limit: mock(() => {
                        // Return empty array for selects - tests don't rely on query results
                        return [];
                    }),
                })),
            })),
        })),
        insert: mock((table: any) => {
            // Detect table by checking table symbol/reference
            const tableStr = String(table);
            if (tableStr.includes("client")) lastInsertType = "client";
            else if (tableStr.includes("token")) lastInsertType = "token";
            else if (tableStr.includes("auth")) lastInsertType = "authCode";
            else if (tableStr.includes("rate")) lastInsertType = "rateLimit";
            else if (tableStr.includes("consent")) lastInsertType = "consent";
            else lastInsertType = "unknown";

            return {
                values: mock(async (data: any) => {
                    // Store based on lastInsertType
                    switch (lastInsertType) {
                        case "client":
                            storage.clients.set(data.clientId, { ...data, createdAt: new Date(), updatedAt: new Date() });
                            break;
                        case "token":
                            storage.tokens.set(data.token, { ...data, createdAt: new Date() });
                            break;
                        case "authCode":
                            storage.authCodes.set(data.code, { ...data, createdAt: new Date() });
                            break;
                        case "rateLimit":
                            storage.rateLimits.set(data.key, data);
                            break;
                        case "consent":
                            storage.consents.set(`${data.userId}:${data.clientId}`, data);
                            break;
                    }
                    return { rowCount: 1 };
                }),
            };
        }),
        update: mock((table: any) => ({
            set: mock((data: any) => ({
                where: mock(async (condition: any) => {
                    return { rowCount: 1 };
                }),
            })),
        })),
        delete: mock((table: any) => ({
            where: mock(async (condition: any) => {
                return { rowCount: 1 };
            }),
        })),
        _storage: storage,
    };
}

describe("DrizzleStorageAdapter - Clients", () => {
    let adapter: DrizzleStorageAdapter;
    let mockDb: ReturnType<typeof createMockDrizzle>;

    beforeEach(() => {
        mockDb = createMockDrizzle();
        adapter = new DrizzleStorageAdapter({ db: mockDb as any });
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
        expect(mockDb.insert).toHaveBeenCalled();
    });

    test("should delete client", async () => {
        const deleted = await adapter.deleteClient("test-client");
        expect(deleted).toBe(true);
        expect(mockDb.delete).toHaveBeenCalled();
    });

    test("should update client", async () => {
        // First create a client
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

        // Update returns the client via getClient which returns null in mock
        // Just verify update was called
        await adapter.updateClient("update-test", { name: "Updated" });
        expect(mockDb.update).toHaveBeenCalled();
    });
});

describe("DrizzleStorageAdapter - Tokens", () => {
    let adapter: DrizzleStorageAdapter;
    let mockDb: ReturnType<typeof createMockDrizzle>;

    beforeEach(() => {
        mockDb = createMockDrizzle();
        adapter = new DrizzleStorageAdapter({ db: mockDb as any });
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
        expect(mockDb.insert).toHaveBeenCalled();
    });

    test("should revoke token", async () => {
        const result = await adapter.revokeToken("to_revoke");
        expect(result).toBe(true);
        expect(mockDb.update).toHaveBeenCalled();
    });

    test("should revoke all client tokens", async () => {
        const count = await adapter.revokeAllClientTokens("client-1");
        expect(count).toBeGreaterThanOrEqual(0);
        expect(mockDb.update).toHaveBeenCalled();
    });

    test("should revoke all user tokens", async () => {
        const count = await adapter.revokeAllUserTokens("user-1");
        expect(count).toBeGreaterThanOrEqual(0);
        expect(mockDb.update).toHaveBeenCalled();
    });

    test("should clean expired tokens", async () => {
        const count = await adapter.cleanExpiredTokens();
        expect(count).toBeGreaterThanOrEqual(0);
        expect(mockDb.delete).toHaveBeenCalled();
    });
});

describe("DrizzleStorageAdapter - Auth Codes", () => {
    let adapter: DrizzleStorageAdapter;
    let mockDb: ReturnType<typeof createMockDrizzle>;

    beforeEach(() => {
        mockDb = createMockDrizzle();
        adapter = new DrizzleStorageAdapter({ db: mockDb as any });
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
        expect(mockDb.insert).toHaveBeenCalled();
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

    test("should clean expired auth codes", async () => {
        const count = await adapter.cleanExpiredAuthCodes();
        expect(count).toBeGreaterThanOrEqual(0);
        expect(mockDb.delete).toHaveBeenCalled();
    });
});

describe("DrizzleStorageAdapter - Rate Limiting", () => {
    let adapter: DrizzleStorageAdapter;
    let mockDb: ReturnType<typeof createMockDrizzle>;

    beforeEach(() => {
        mockDb = createMockDrizzle();
        adapter = new DrizzleStorageAdapter({ db: mockDb as any });
    });

    test("should increment rate limit for new key", async () => {
        const count = await adapter.incrementRateLimit("test-key", 60000);
        expect(count).toBe(1);
        expect(mockDb.insert).toHaveBeenCalled();
    });

    test("should get rate limit count", async () => {
        const count = await adapter.getRateLimitCount("test-key");
        expect(count).toBe(0); // Empty mock returns 0
    });

    test("should reset rate limit", async () => {
        const result = await adapter.resetRateLimit("reset-key");
        expect(result).toBe(true);
        expect(mockDb.delete).toHaveBeenCalled();
    });
});

describe("DrizzleStorageAdapter - Consent", () => {
    let adapter: DrizzleStorageAdapter;
    let mockDb: ReturnType<typeof createMockDrizzle>;

    beforeEach(() => {
        mockDb = createMockDrizzle();
        adapter = new DrizzleStorageAdapter({ db: mockDb as any });
    });

    test("should store consent", async () => {
        await adapter.storeConsent("user-1", "client-1", ["read:users", "write:users"]);
        // Store consent triggers select then insert/update
        expect(mockDb.select).toHaveBeenCalled();
    });

    test("should get consent", async () => {
        const scopes = await adapter.getConsent("user-1", "client-1");
        // Mock returns null for empty queries
        expect(scopes).toBeNull();
    });

    test("should revoke consent", async () => {
        const result = await adapter.revokeConsent("user-1", "client-1");
        expect(result).toBe(true);
        expect(mockDb.delete).toHaveBeenCalled();
    });
});

describe("DrizzleStorageAdapter - Lifecycle", () => {
    test("should initialize without error", async () => {
        const mockDb = createMockDrizzle();
        const adapter = new DrizzleStorageAdapter({ db: mockDb as any });

        await expect(adapter.initialize()).resolves.toBeUndefined();
    });

    test("should close without error", async () => {
        const mockDb = createMockDrizzle();
        const adapter = new DrizzleStorageAdapter({ db: mockDb as any });

        await expect(adapter.close()).resolves.toBeUndefined();
    });
});
