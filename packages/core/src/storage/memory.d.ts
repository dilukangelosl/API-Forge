import type { StorageAdapter, OAuthClient, TokenRecord, AuthCodeRecord } from "../abstractions/storage";
/**
 * In-memory storage adapter for development and testing
 * Data is lost when the process exits
 */
export declare class MemoryStorageAdapter implements StorageAdapter {
    private clients;
    private tokens;
    private authCodes;
    private rateLimits;
    private consents;
    createClient(client: Omit<OAuthClient, "createdAt" | "updatedAt">): Promise<OAuthClient>;
    getClient(clientId: string): Promise<OAuthClient | null>;
    getClientByOwnerId(ownerId: string): Promise<OAuthClient[]>;
    updateClient(clientId: string, data: Partial<OAuthClient>): Promise<OAuthClient | null>;
    deleteClient(clientId: string): Promise<boolean>;
    storeToken(token: Omit<TokenRecord, "createdAt">): Promise<TokenRecord>;
    getToken(token: string): Promise<TokenRecord | null>;
    revokeToken(token: string): Promise<boolean>;
    revokeAllClientTokens(clientId: string): Promise<number>;
    revokeAllUserTokens(userId: string): Promise<number>;
    cleanExpiredTokens(): Promise<number>;
    storeAuthCode(code: Omit<AuthCodeRecord, "createdAt">): Promise<AuthCodeRecord>;
    consumeAuthCode(code: string): Promise<AuthCodeRecord | null>;
    cleanExpiredAuthCodes(): Promise<number>;
    incrementRateLimit(key: string, windowMs: number): Promise<number>;
    getRateLimitCount(key: string): Promise<number>;
    resetRateLimit(key: string): Promise<boolean>;
    storeConsent(userId: string, clientId: string, scopes: string[]): Promise<void>;
    getConsent(userId: string, clientId: string): Promise<string[] | null>;
    revokeConsent(userId: string, clientId: string): Promise<boolean>;
    initialize(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=memory.d.ts.map