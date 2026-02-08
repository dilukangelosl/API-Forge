/**
 * SQLite-compatible Drizzle Storage Adapter
 * 
 * Handles JSON array serialization for SQLite
 */
import type {
    StorageAdapter,
    OAuthClient,
    TokenRecord,
    AuthCodeRecord,
} from "@api-forge/core";
import { eq, and, lt } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

function generateId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function parseArray(value: string): string[] {
    try { return JSON.parse(value); } catch { return []; }
}

function stringifyArray(arr: string[]): string {
    return JSON.stringify(arr);
}

export class SQLiteDrizzleAdapter implements StorageAdapter {
    private db: BetterSQLite3Database<typeof schema>;

    constructor(db: BetterSQLite3Database<typeof schema>) {
        this.db = db;
    }

    // =================
    // OAuth Clients
    // =================

    async createClient(client: Omit<OAuthClient, "createdAt" | "updatedAt">): Promise<OAuthClient> {
        const now = new Date();
        const id = generateId();

        await this.db.insert(schema.oauthClients).values({
            id,
            clientId: client.clientId,
            clientSecretHash: client.clientSecretHash,
            name: client.name,
            description: client.description,
            redirectUris: stringifyArray(client.redirectUris),
            grantTypes: stringifyArray(client.grantTypes),
            scopes: stringifyArray(client.scopes),
            isConfidential: client.isConfidential,
            ownerId: client.ownerId,
            logoUrl: client.logoUrl,
            websiteUrl: client.websiteUrl,
            isActive: client.isActive,
            createdAt: now,
            updatedAt: now,
        });

        return { ...client, createdAt: now, updatedAt: now };
    }

    async getClient(clientId: string): Promise<OAuthClient | null> {
        const rows = await this.db
            .select()
            .from(schema.oauthClients)
            .where(eq(schema.oauthClients.clientId, clientId))
            .limit(1);

        if (!rows[0]) return null;
        return this.mapClient(rows[0]);
    }

    async getClientByOwnerId(ownerId: string): Promise<OAuthClient[]> {
        const rows = await this.db
            .select()
            .from(schema.oauthClients)
            .where(eq(schema.oauthClients.ownerId, ownerId));
        return rows.map(r => this.mapClient(r));
    }

    async updateClient(clientId: string, data: Partial<OAuthClient>): Promise<OAuthClient | null> {
        const updateData: any = { updatedAt: new Date() };
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.redirectUris !== undefined) updateData.redirectUris = stringifyArray(data.redirectUris);
        if (data.grantTypes !== undefined) updateData.grantTypes = stringifyArray(data.grantTypes);
        if (data.scopes !== undefined) updateData.scopes = stringifyArray(data.scopes);
        if (data.isConfidential !== undefined) updateData.isConfidential = data.isConfidential;
        if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
        if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        await this.db.update(schema.oauthClients).set(updateData).where(eq(schema.oauthClients.clientId, clientId));
        return this.getClient(clientId);
    }

    async deleteClient(clientId: string): Promise<boolean> {
        await this.db.delete(schema.oauthClients).where(eq(schema.oauthClients.clientId, clientId));
        return true;
    }

    private mapClient(row: any): OAuthClient {
        return {
            clientId: row.clientId,
            clientSecretHash: row.clientSecretHash,
            name: row.name,
            description: row.description,
            redirectUris: parseArray(row.redirectUris),
            grantTypes: parseArray(row.grantTypes),
            scopes: parseArray(row.scopes),
            isConfidential: row.isConfidential,
            ownerId: row.ownerId,
            logoUrl: row.logoUrl,
            websiteUrl: row.websiteUrl,
            isActive: row.isActive,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
        };
    }

    // =================
    // Tokens
    // =================

    async storeToken(token: Omit<TokenRecord, "createdAt">): Promise<TokenRecord> {
        const now = new Date();
        await this.db.insert(schema.oauthTokens).values({
            id: generateId(),
            token: token.token,
            type: token.type,
            clientId: token.clientId,
            userId: token.userId,
            scopes: stringifyArray(token.scopes),
            expiresAt: token.expiresAt,
            createdAt: now,
            isRevoked: token.isRevoked,
            accessToken: token.accessToken,
        });
        return { ...token, createdAt: now };
    }

    async getToken(token: string): Promise<TokenRecord | null> {
        const rows = await this.db.select().from(schema.oauthTokens)
            .where(eq(schema.oauthTokens.token, token)).limit(1);
        if (!rows[0]) return null;
        if (new Date(rows[0].expiresAt) < new Date()) return null;
        if (rows[0].isRevoked) return null;
        return this.mapToken(rows[0]);
    }

    async revokeToken(token: string): Promise<boolean> {
        await this.db.update(schema.oauthTokens).set({ isRevoked: true })
            .where(eq(schema.oauthTokens.token, token));
        return true;
    }

    async revokeAllClientTokens(clientId: string): Promise<number> {
        await this.db.update(schema.oauthTokens).set({ isRevoked: true })
            .where(and(eq(schema.oauthTokens.clientId, clientId), eq(schema.oauthTokens.isRevoked, false)));
        return 0;
    }

    async revokeAllUserTokens(userId: string): Promise<number> {
        await this.db.update(schema.oauthTokens).set({ isRevoked: true })
            .where(and(eq(schema.oauthTokens.userId, userId), eq(schema.oauthTokens.isRevoked, false)));
        return 0;
    }

    async cleanExpiredTokens(): Promise<number> {
        await this.db.delete(schema.oauthTokens).where(lt(schema.oauthTokens.expiresAt, new Date()));
        return 0;
    }

    private mapToken(row: any): TokenRecord {
        return {
            token: row.token,
            type: row.type as "access" | "refresh",
            clientId: row.clientId,
            userId: row.userId,
            scopes: parseArray(row.scopes),
            expiresAt: new Date(row.expiresAt),
            createdAt: new Date(row.createdAt),
            isRevoked: row.isRevoked,
            accessToken: row.accessToken,
        };
    }

    // =================
    // Authorization Codes
    // =================

    async storeAuthCode(code: Omit<AuthCodeRecord, "createdAt">): Promise<AuthCodeRecord> {
        const now = new Date();
        await this.db.insert(schema.oauthAuthCodes).values({
            id: generateId(),
            code: code.code,
            clientId: code.clientId,
            userId: code.userId,
            redirectUri: code.redirectUri,
            scopes: stringifyArray(code.scopes),
            codeChallenge: code.codeChallenge,
            codeChallengeMethod: code.codeChallengeMethod,
            expiresAt: code.expiresAt,
            createdAt: now,
            consumed: false,
        });
        return { ...code, createdAt: now };
    }

    async consumeAuthCode(code: string): Promise<AuthCodeRecord | null> {
        const rows = await this.db.select().from(schema.oauthAuthCodes)
            .where(eq(schema.oauthAuthCodes.code, code)).limit(1);
        if (!rows[0]) return null;
        if (new Date(rows[0].expiresAt) < new Date()) {
            await this.db.delete(schema.oauthAuthCodes).where(eq(schema.oauthAuthCodes.code, code));
            return null;
        }
        if (rows[0].consumed) return null;
        await this.db.delete(schema.oauthAuthCodes).where(eq(schema.oauthAuthCodes.code, code));
        return this.mapAuthCode(rows[0]);
    }

    async cleanExpiredAuthCodes(): Promise<number> {
        await this.db.delete(schema.oauthAuthCodes).where(lt(schema.oauthAuthCodes.expiresAt, new Date()));
        return 0;
    }

    private mapAuthCode(row: any): AuthCodeRecord {
        return {
            code: row.code,
            clientId: row.clientId,
            userId: row.userId,
            redirectUri: row.redirectUri,
            scopes: parseArray(row.scopes),
            codeChallenge: row.codeChallenge,
            codeChallengeMethod: row.codeChallengeMethod as "S256" | "plain" | undefined,
            expiresAt: new Date(row.expiresAt),
            createdAt: new Date(row.createdAt),
        };
    }

    // =================
    // Rate Limiting
    // =================

    async incrementRateLimit(key: string, windowMs: number): Promise<number> {
        const now = Date.now();
        const resetAt = new Date(now + windowMs);
        const rows = await this.db.select().from(schema.oauthRateLimits)
            .where(eq(schema.oauthRateLimits.key, key)).limit(1);

        if (!rows[0] || new Date(rows[0].resetAt).getTime() < now) {
            try {
                await this.db.insert(schema.oauthRateLimits).values({ id: generateId(), key, count: 1, resetAt });
            } catch {
                await this.db.update(schema.oauthRateLimits).set({ count: 1, resetAt }).where(eq(schema.oauthRateLimits.key, key));
            }
            return 1;
        }

        const newCount = rows[0].count + 1;
        await this.db.update(schema.oauthRateLimits).set({ count: newCount }).where(eq(schema.oauthRateLimits.key, key));
        return newCount;
    }

    async getRateLimitCount(key: string): Promise<number> {
        const rows = await this.db.select().from(schema.oauthRateLimits)
            .where(eq(schema.oauthRateLimits.key, key)).limit(1);
        if (!rows[0] || new Date(rows[0].resetAt).getTime() < Date.now()) return 0;
        return rows[0].count;
    }

    async resetRateLimit(key: string): Promise<boolean> {
        await this.db.delete(schema.oauthRateLimits).where(eq(schema.oauthRateLimits.key, key));
        return true;
    }

    // =================
    // Consent Records
    // =================

    async storeConsent(userId: string, clientId: string, scopes: string[]): Promise<void> {
        const rows = await this.db.select().from(schema.oauthConsents)
            .where(and(eq(schema.oauthConsents.userId, userId), eq(schema.oauthConsents.clientId, clientId))).limit(1);

        if (rows[0]) {
            await this.db.update(schema.oauthConsents).set({ scopes: stringifyArray(scopes) })
                .where(and(eq(schema.oauthConsents.userId, userId), eq(schema.oauthConsents.clientId, clientId)));
        } else {
            await this.db.insert(schema.oauthConsents).values({
                id: generateId(), userId, clientId, scopes: stringifyArray(scopes), createdAt: new Date(),
            });
        }
    }

    async getConsent(userId: string, clientId: string): Promise<string[] | null> {
        const rows = await this.db.select().from(schema.oauthConsents)
            .where(and(eq(schema.oauthConsents.userId, userId), eq(schema.oauthConsents.clientId, clientId))).limit(1);
        return rows[0] ? parseArray(rows[0].scopes) : null;
    }

    async revokeConsent(userId: string, clientId: string): Promise<boolean> {
        await this.db.delete(schema.oauthConsents)
            .where(and(eq(schema.oauthConsents.userId, userId), eq(schema.oauthConsents.clientId, clientId)));
        return true;
    }

    // =================
    // Lifecycle
    // =================

    async initialize(): Promise<void> { }
    async close(): Promise<void> { }
}
