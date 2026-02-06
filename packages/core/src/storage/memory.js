/**
 * In-memory storage adapter for development and testing
 * Data is lost when the process exits
 */
export class MemoryStorageAdapter {
    clients = new Map();
    tokens = new Map();
    authCodes = new Map();
    rateLimits = new Map();
    consents = new Map();
    // OAuth Clients
    async createClient(client) {
        const now = new Date();
        const fullClient = {
            ...client,
            createdAt: now,
            updatedAt: now,
        };
        this.clients.set(client.clientId, fullClient);
        return fullClient;
    }
    async getClient(clientId) {
        return this.clients.get(clientId) ?? null;
    }
    async getClientByOwnerId(ownerId) {
        return Array.from(this.clients.values()).filter((c) => c.ownerId === ownerId);
    }
    async updateClient(clientId, data) {
        const existing = this.clients.get(clientId);
        if (!existing)
            return null;
        const updated = {
            ...existing,
            ...data,
            clientId: existing.clientId, // Cannot change ID
            updatedAt: new Date(),
        };
        this.clients.set(clientId, updated);
        return updated;
    }
    async deleteClient(clientId) {
        return this.clients.delete(clientId);
    }
    // Tokens
    async storeToken(token) {
        const fullToken = {
            ...token,
            createdAt: new Date(),
        };
        this.tokens.set(token.token, fullToken);
        return fullToken;
    }
    async getToken(token) {
        const record = this.tokens.get(token);
        if (!record)
            return null;
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
    async revokeToken(token) {
        const record = this.tokens.get(token);
        if (!record)
            return false;
        record.isRevoked = true;
        this.tokens.set(token, record);
        return true;
    }
    async revokeAllClientTokens(clientId) {
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
    async revokeAllUserTokens(userId) {
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
    async cleanExpiredTokens() {
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
    async storeAuthCode(code) {
        const fullCode = {
            ...code,
            createdAt: new Date(),
        };
        this.authCodes.set(code.code, fullCode);
        return fullCode;
    }
    async consumeAuthCode(code) {
        const record = this.authCodes.get(code);
        if (!record)
            return null;
        // Check if expired
        if (record.expiresAt < new Date()) {
            this.authCodes.delete(code);
            return null;
        }
        // Consume (delete) the code
        this.authCodes.delete(code);
        return record;
    }
    async cleanExpiredAuthCodes() {
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
    async incrementRateLimit(key, windowMs) {
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
    async getRateLimitCount(key) {
        const now = Date.now();
        const existing = this.rateLimits.get(key);
        if (!existing || existing.resetAt < now) {
            return 0;
        }
        return existing.count;
    }
    async resetRateLimit(key) {
        return this.rateLimits.delete(key);
    }
    // Consent Records
    async storeConsent(userId, clientId, scopes) {
        const key = `${userId}:${clientId}`;
        this.consents.set(key, scopes);
    }
    async getConsent(userId, clientId) {
        const key = `${userId}:${clientId}`;
        return this.consents.get(key) ?? null;
    }
    async revokeConsent(userId, clientId) {
        const key = `${userId}:${clientId}`;
        return this.consents.delete(key);
    }
    // Lifecycle
    async initialize() {
        // Nothing to initialize for memory storage
    }
    async close() {
        // Clear all data
        this.clients.clear();
        this.tokens.clear();
        this.authCodes.clear();
        this.rateLimits.clear();
        this.consents.clear();
    }
}
//# sourceMappingURL=memory.js.map