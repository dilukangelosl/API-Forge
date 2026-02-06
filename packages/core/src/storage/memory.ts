import type {
    StorageAdapter,
    OAuthClient,
    TokenRecord,
    AuthCodeRecord,
} from "../abstractions/storage";

/**
 * In-memory storage adapter for development and testing
 * Data is lost when the process exits
 */
export class MemoryStorageAdapter implements StorageAdapter {
    private clients: Map<string, OAuthClient> = new Map();
    private tokens: Map<string, TokenRecord> = new Map();
    private authCodes: Map<string, AuthCodeRecord> = new Map();
    private rateLimits: Map<string, { count: number; resetAt: number }> = new Map();
    private consents: Map<string, string[]> = new Map();

    // OAuth Clients

    async createClient(
        client: Omit<OAuthClient, "createdAt" | "updatedAt">
    ): Promise<OAuthClient> {
        const now = new Date();
        const fullClient: OAuthClient = {
            ...client,
            createdAt: now,
            updatedAt: now,
        };
        this.clients.set(client.clientId, fullClient);
        return fullClient;
    }

    async getClient(clientId: string): Promise<OAuthClient | null> {
        return this.clients.get(clientId) ?? null;
    }

    async getClientByOwnerId(ownerId: string): Promise<OAuthClient[]> {
        return Array.from(this.clients.values()).filter(
            (c) => c.ownerId === ownerId
        );
    }

    async updateClient(
        clientId: string,
        data: Partial<OAuthClient>
    ): Promise<OAuthClient | null> {
        const existing = this.clients.get(clientId);
        if (!existing) return null;

        const updated: OAuthClient = {
            ...existing,
            ...data,
            clientId: existing.clientId, // Cannot change ID
            updatedAt: new Date(),
        };
        this.clients.set(clientId, updated);
        return updated;
    }

    async deleteClient(clientId: string): Promise<boolean> {
        return this.clients.delete(clientId);
    }

    // Tokens

    async storeToken(
        token: Omit<TokenRecord, "createdAt">
    ): Promise<TokenRecord> {
        const fullToken: TokenRecord = {
            ...token,
            createdAt: new Date(),
        };
        this.tokens.set(token.token, fullToken);
        return fullToken;
    }

    async getToken(token: string): Promise<TokenRecord | null> {
        const record = this.tokens.get(token);
        if (!record) return null;

        // Check if expired
        if (record.expiresAt < new Date()) {
            this.tokens.delete(token);
            return null;
        }

        // Check if revoked
        if (record.isRevoked) {
            return null;
        }

        return record;
    }

    async revokeToken(token: string): Promise<boolean> {
        const record = this.tokens.get(token);
        if (!record) return false;

        record.isRevoked = true;
        this.tokens.set(token, record);
        return true;
    }

    async revokeAllClientTokens(clientId: string): Promise<number> {
        let count = 0;
        for (const [key, token] of this.tokens) {
            if (token.clientId === clientId && !token.isRevoked) {
                token.isRevoked = true;
                this.tokens.set(key, token);
                count++;
            }
        }
        return count;
    }

    async revokeAllUserTokens(userId: string): Promise<number> {
        let count = 0;
        for (const [key, token] of this.tokens) {
            if (token.userId === userId && !token.isRevoked) {
                token.isRevoked = true;
                this.tokens.set(key, token);
                count++;
            }
        }
        return count;
    }

    async cleanExpiredTokens(): Promise<number> {
        const now = new Date();
        let count = 0;
        for (const [key, token] of this.tokens) {
            if (token.expiresAt < now) {
                this.tokens.delete(key);
                count++;
            }
        }
        return count;
    }

    // Authorization Codes

    async storeAuthCode(
        code: Omit<AuthCodeRecord, "createdAt">
    ): Promise<AuthCodeRecord> {
        const fullCode: AuthCodeRecord = {
            ...code,
            createdAt: new Date(),
        };
        this.authCodes.set(code.code, fullCode);
        return fullCode;
    }

    async consumeAuthCode(code: string): Promise<AuthCodeRecord | null> {
        const record = this.authCodes.get(code);
        if (!record) return null;

        // Check if expired
        if (record.expiresAt < new Date()) {
            this.authCodes.delete(code);
            return null;
        }

        // Consume (delete) the code
        this.authCodes.delete(code);
        return record;
    }

    async cleanExpiredAuthCodes(): Promise<number> {
        const now = new Date();
        let count = 0;
        for (const [key, code] of this.authCodes) {
            if (code.expiresAt < now) {
                this.authCodes.delete(key);
                count++;
            }
        }
        return count;
    }

    // Rate Limiting

    async incrementRateLimit(key: string, windowMs: number): Promise<number> {
        const now = Date.now();
        const existing = this.rateLimits.get(key);

        if (!existing || existing.resetAt < now) {
            // Start new window
            this.rateLimits.set(key, { count: 1, resetAt: now + windowMs });
            return 1;
        }

        // Increment existing
        existing.count++;
        this.rateLimits.set(key, existing);
        return existing.count;
    }

    async getRateLimitCount(key: string): Promise<number> {
        const now = Date.now();
        const existing = this.rateLimits.get(key);

        if (!existing || existing.resetAt < now) {
            return 0;
        }

        return existing.count;
    }

    async resetRateLimit(key: string): Promise<boolean> {
        return this.rateLimits.delete(key);
    }

    // Consent Records

    async storeConsent(
        userId: string,
        clientId: string,
        scopes: string[]
    ): Promise<void> {
        const key = `${userId}:${clientId}`;
        this.consents.set(key, scopes);
    }

    async getConsent(
        userId: string,
        clientId: string
    ): Promise<string[] | null> {
        const key = `${userId}:${clientId}`;
        return this.consents.get(key) ?? null;
    }

    async revokeConsent(userId: string, clientId: string): Promise<boolean> {
        const key = `${userId}:${clientId}`;
        return this.consents.delete(key);
    }

    // Lifecycle

    async initialize(): Promise<void> {
        // Nothing to initialize for memory storage
    }

    async close(): Promise<void> {
        // Clear all data
        this.clients.clear();
        this.tokens.clear();
        this.authCodes.clear();
        this.rateLimits.clear();
        this.consents.clear();
    }
}
