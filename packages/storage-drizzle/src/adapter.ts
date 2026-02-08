import type {
    StorageAdapter,
    OAuthClient,
    TokenRecord,
    AuthCodeRecord,
} from "@api-forge/core";
import { eq, and, lt } from "drizzle-orm";
import { oauthClients, oauthTokens, oauthAuthCodes, oauthRateLimits, oauthConsents } from "./schema";

/**
 * Configuration for Drizzle storage adapter
 */
export interface DrizzleStorageConfig {
    /** Drizzle database instance */
    db: DrizzleDB;
}

/**
 * Type definition for Drizzle database (supports pg, mysql, sqlite)
 */
type DrizzleDB = {
    select: (fields?: any) => any;
    insert: (table: any) => any;
    update: (table: any) => any;
    delete: (table: any) => any;
};

/**
 * Generate a unique ID (cuid-like)
 */
function generateId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Drizzle ORM storage adapter for API Forge
 */
export class DrizzleStorageAdapter implements StorageAdapter {
    private db: DrizzleDB;

    constructor(config: DrizzleStorageConfig) {
        this.db = config.db;
    }

    // =================
    // OAuth Clients
    // =================

    async createClient(
        client: Omit<OAuthClient, "createdAt" | "updatedAt">
    ): Promise<OAuthClient> {
        const now = new Date();
        const id = generateId();

        const values = {
            id,
            clientId: client.clientId,
            clientSecretHash: client.clientSecretHash,
            name: client.name,
            description: client.description,
            redirectUris: client.redirectUris,
            grantTypes: client.grantTypes,
            scopes: client.scopes,
            isConfidential: client.isConfidential,
            ownerId: client.ownerId,
            logoUrl: client.logoUrl,
            websiteUrl: client.websiteUrl,
            isActive: client.isActive,
            createdAt: now,
            updatedAt: now,
        };

        await this.db.insert(oauthClients).values(values);

        return {
            ...client,
            createdAt: now,
            updatedAt: now,
        };
    }

    async getClient(clientId: string): Promise<OAuthClient | null> {
        const results = await this.db
            .select()
            .from(oauthClients)
            .where(eq(oauthClients.clientId, clientId))
            .limit(1);

        const row = results[0];
        if (!row) return null;

        return this.mapToOAuthClient(row);
    }

    async getClientByOwnerId(ownerId: string): Promise<OAuthClient[]> {
        const results = await this.db
            .select()
            .from(oauthClients)
            .where(eq(oauthClients.ownerId, ownerId));

        return results.map((row: any) => this.mapToOAuthClient(row));
    }

    async updateClient(
        clientId: string,
        data: Partial<OAuthClient>
    ): Promise<OAuthClient | null> {
        const updateData: any = { updatedAt: new Date() };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.redirectUris !== undefined) updateData.redirectUris = data.redirectUris;
        if (data.grantTypes !== undefined) updateData.grantTypes = data.grantTypes;
        if (data.scopes !== undefined) updateData.scopes = data.scopes;
        if (data.isConfidential !== undefined) updateData.isConfidential = data.isConfidential;
        if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
        if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.clientSecretHash !== undefined) updateData.clientSecretHash = data.clientSecretHash;

        await this.db
            .update(oauthClients)
            .set(updateData)
            .where(eq(oauthClients.clientId, clientId));

        return this.getClient(clientId);
    }

    async deleteClient(clientId: string): Promise<boolean> {
        await this.db
            .delete(oauthClients)
            .where(eq(oauthClients.clientId, clientId));

        return true;
    }

    // =================
    // Tokens
    // =================

    async storeToken(
        token: Omit<TokenRecord, "createdAt">
    ): Promise<TokenRecord> {
        const now = new Date();
        const id = generateId();

        const values = {
            id,
            token: token.token,
            type: token.type,
            clientId: token.clientId,
            userId: token.userId,
            scopes: token.scopes,
            expiresAt: token.expiresAt,
            createdAt: now,
            isRevoked: token.isRevoked,
            accessToken: token.accessToken,
        };

        await this.db.insert(oauthTokens).values(values);

        return {
            ...token,
            createdAt: now,
        };
    }

    async getToken(token: string): Promise<TokenRecord | null> {
        const results = await this.db
            .select()
            .from(oauthTokens)
            .where(eq(oauthTokens.token, token))
            .limit(1);

        const row = results[0];
        if (!row) return null;

        // Check if expired
        if (new Date(row.expiresAt) < new Date()) {
            return null;
        }

        // Check if revoked
        if (row.isRevoked) {
            return null;
        }

        return this.mapToTokenRecord(row);
    }

    async revokeToken(token: string): Promise<boolean> {
        await this.db
            .update(oauthTokens)
            .set({ isRevoked: true })
            .where(eq(oauthTokens.token, token));

        return true;
    }

    async revokeAllClientTokens(clientId: string): Promise<number> {
        await this.db
            .update(oauthTokens)
            .set({ isRevoked: true })
            .where(and(
                eq(oauthTokens.clientId, clientId),
                eq(oauthTokens.isRevoked, false)
            ));

        // Drizzle doesn't return count from update, return estimate
        return 0;
    }

    async revokeAllUserTokens(userId: string): Promise<number> {
        await this.db
            .update(oauthTokens)
            .set({ isRevoked: true })
            .where(and(
                eq(oauthTokens.userId, userId),
                eq(oauthTokens.isRevoked, false)
            ));

        return 0;
    }

    async cleanExpiredTokens(): Promise<number> {
        await this.db
            .delete(oauthTokens)
            .where(lt(oauthTokens.expiresAt, new Date()));

        return 0;
    }

    // =================
    // Authorization Codes
    // =================

    async storeAuthCode(
        code: Omit<AuthCodeRecord, "createdAt">
    ): Promise<AuthCodeRecord> {
        const now = new Date();
        const id = generateId();

        const values = {
            id,
            code: code.code,
            clientId: code.clientId,
            userId: code.userId,
            redirectUri: code.redirectUri,
            scopes: code.scopes,
            codeChallenge: code.codeChallenge,
            codeChallengeMethod: code.codeChallengeMethod,
            expiresAt: code.expiresAt,
            createdAt: now,
            consumed: false,
        };

        await this.db.insert(oauthAuthCodes).values(values);

        return {
            ...code,
            createdAt: now,
        };
    }

    async consumeAuthCode(code: string): Promise<AuthCodeRecord | null> {
        const results = await this.db
            .select()
            .from(oauthAuthCodes)
            .where(eq(oauthAuthCodes.code, code))
            .limit(1);

        const row = results[0];
        if (!row) return null;

        // Check if expired
        if (new Date(row.expiresAt) < new Date()) {
            await this.db.delete(oauthAuthCodes).where(eq(oauthAuthCodes.code, code));
            return null;
        }

        // Check if already consumed
        if (row.consumed) {
            return null;
        }

        // Delete the code (consume it)
        await this.db.delete(oauthAuthCodes).where(eq(oauthAuthCodes.code, code));

        return this.mapToAuthCodeRecord(row);
    }

    async cleanExpiredAuthCodes(): Promise<number> {
        await this.db
            .delete(oauthAuthCodes)
            .where(lt(oauthAuthCodes.expiresAt, new Date()));

        return 0;
    }

    // =================
    // Rate Limiting
    // =================

    async incrementRateLimit(key: string, windowMs: number): Promise<number> {
        const now = Date.now();
        const resetAt = new Date(now + windowMs);

        const results = await this.db
            .select()
            .from(oauthRateLimits)
            .where(eq(oauthRateLimits.key, key))
            .limit(1);

        const existing = results[0];

        if (!existing || new Date(existing.resetAt).getTime() < now) {
            // Start new window - upsert
            const id = generateId();
            try {
                await this.db.insert(oauthRateLimits).values({
                    id,
                    key,
                    count: 1,
                    resetAt,
                });
            } catch (e) {
                // If insert fails (key exists), update instead
                await this.db
                    .update(oauthRateLimits)
                    .set({ count: 1, resetAt })
                    .where(eq(oauthRateLimits.key, key));
            }
            return 1;
        }

        // Increment existing
        const newCount = existing.count + 1;
        await this.db
            .update(oauthRateLimits)
            .set({ count: newCount })
            .where(eq(oauthRateLimits.key, key));

        return newCount;
    }

    async getRateLimitCount(key: string): Promise<number> {
        const now = Date.now();

        const results = await this.db
            .select()
            .from(oauthRateLimits)
            .where(eq(oauthRateLimits.key, key))
            .limit(1);

        const existing = results[0];

        if (!existing || new Date(existing.resetAt).getTime() < now) {
            return 0;
        }

        return existing.count;
    }

    async resetRateLimit(key: string): Promise<boolean> {
        await this.db
            .delete(oauthRateLimits)
            .where(eq(oauthRateLimits.key, key));

        return true;
    }

    // =================
    // Consent Records
    // =================

    async storeConsent(
        userId: string,
        clientId: string,
        scopes: string[]
    ): Promise<void> {
        const results = await this.db
            .select()
            .from(oauthConsents)
            .where(and(
                eq(oauthConsents.userId, userId),
                eq(oauthConsents.clientId, clientId)
            ))
            .limit(1);

        if (results[0]) {
            // Update existing
            await this.db
                .update(oauthConsents)
                .set({ scopes })
                .where(and(
                    eq(oauthConsents.userId, userId),
                    eq(oauthConsents.clientId, clientId)
                ));
        } else {
            // Insert new
            await this.db.insert(oauthConsents).values({
                id: generateId(),
                userId,
                clientId,
                scopes,
                createdAt: new Date(),
            });
        }
    }

    async getConsent(
        userId: string,
        clientId: string
    ): Promise<string[] | null> {
        const results = await this.db
            .select()
            .from(oauthConsents)
            .where(and(
                eq(oauthConsents.userId, userId),
                eq(oauthConsents.clientId, clientId)
            ))
            .limit(1);

        return results[0]?.scopes ?? null;
    }

    async revokeConsent(userId: string, clientId: string): Promise<boolean> {
        await this.db
            .delete(oauthConsents)
            .where(and(
                eq(oauthConsents.userId, userId),
                eq(oauthConsents.clientId, clientId)
            ));

        return true;
    }

    // =================
    // Lifecycle
    // =================

    async initialize(): Promise<void> {
        // Database connection is already established when passed in
    }

    async close(): Promise<void> {
        // User manages their own connection lifecycle
    }

    // =================
    // Helpers
    // =================

    private mapToOAuthClient(row: any): OAuthClient {
        return {
            clientId: row.clientId,
            clientSecretHash: row.clientSecretHash,
            name: row.name,
            description: row.description,
            redirectUris: row.redirectUris || [],
            grantTypes: row.grantTypes || [],
            scopes: row.scopes || [],
            isConfidential: row.isConfidential,
            ownerId: row.ownerId,
            logoUrl: row.logoUrl,
            websiteUrl: row.websiteUrl,
            isActive: row.isActive,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
        };
    }

    private mapToTokenRecord(row: any): TokenRecord {
        return {
            token: row.token,
            type: row.type as "access" | "refresh",
            clientId: row.clientId,
            userId: row.userId,
            scopes: row.scopes || [],
            expiresAt: new Date(row.expiresAt),
            createdAt: new Date(row.createdAt),
            isRevoked: row.isRevoked,
            accessToken: row.accessToken,
        };
    }

    private mapToAuthCodeRecord(row: any): AuthCodeRecord {
        return {
            code: row.code,
            clientId: row.clientId,
            userId: row.userId,
            redirectUri: row.redirectUri,
            scopes: row.scopes || [],
            codeChallenge: row.codeChallenge,
            codeChallengeMethod: row.codeChallengeMethod ?? undefined,
            expiresAt: new Date(row.expiresAt),
            createdAt: new Date(row.createdAt),
        };
    }
}
