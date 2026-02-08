/**
 * SQLite-compatible Prisma Storage Adapter
 * 
 * SQLite doesn't support native arrays, so we store JSON strings
 * This adapter handles the JSON serialization/deserialization
 */
import type {
    StorageAdapter,
    OAuthClient,
    TokenRecord,
    AuthCodeRecord,
} from "@api-forge/core";
import { PrismaClient } from "@prisma/client";

export class SQLitePrismaAdapter implements StorageAdapter {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    // Helper: Parse JSON array from SQLite string
    private parseArray(value: string): string[] {
        try {
            return JSON.parse(value);
        } catch {
            return [];
        }
    }

    // Helper: Stringify array for SQLite storage
    private stringifyArray(arr: string[]): string {
        return JSON.stringify(arr);
    }

    // =================
    // OAuth Clients
    // =================

    async createClient(
        client: Omit<OAuthClient, "createdAt" | "updatedAt">
    ): Promise<OAuthClient> {
        const created = await this.prisma.oAuthClient.create({
            data: {
                clientId: client.clientId,
                clientSecretHash: client.clientSecretHash,
                name: client.name,
                description: client.description,
                redirectUris: this.stringifyArray(client.redirectUris),
                grantTypes: this.stringifyArray(client.grantTypes),
                scopes: this.stringifyArray(client.scopes),
                isConfidential: client.isConfidential,
                ownerId: client.ownerId,
                logoUrl: client.logoUrl,
                websiteUrl: client.websiteUrl,
                isActive: client.isActive,
            },
        });

        return this.mapClient(created);
    }

    async getClient(clientId: string): Promise<OAuthClient | null> {
        const client = await this.prisma.oAuthClient.findUnique({
            where: { clientId },
        });
        if (!client) return null;
        return this.mapClient(client);
    }

    async getClientByOwnerId(ownerId: string): Promise<OAuthClient[]> {
        const clients = await this.prisma.oAuthClient.findMany({
            where: { ownerId },
        });
        return clients.map((c) => this.mapClient(c));
    }

    async updateClient(
        clientId: string,
        data: Partial<OAuthClient>
    ): Promise<OAuthClient | null> {
        try {
            const updated = await this.prisma.oAuthClient.update({
                where: { clientId },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.redirectUris && { redirectUris: this.stringifyArray(data.redirectUris) }),
                    ...(data.grantTypes && { grantTypes: this.stringifyArray(data.grantTypes) }),
                    ...(data.scopes && { scopes: this.stringifyArray(data.scopes) }),
                    ...(data.isConfidential !== undefined && { isConfidential: data.isConfidential }),
                    ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
                    ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl }),
                    ...(data.isActive !== undefined && { isActive: data.isActive }),
                },
            });
            return this.mapClient(updated);
        } catch {
            return null;
        }
    }

    async deleteClient(clientId: string): Promise<boolean> {
        try {
            await this.prisma.oAuthClient.delete({ where: { clientId } });
            return true;
        } catch {
            return false;
        }
    }

    private mapClient(data: any): OAuthClient {
        return {
            clientId: data.clientId,
            clientSecretHash: data.clientSecretHash,
            name: data.name,
            description: data.description,
            redirectUris: this.parseArray(data.redirectUris),
            grantTypes: this.parseArray(data.grantTypes),
            scopes: this.parseArray(data.scopes),
            isConfidential: data.isConfidential,
            ownerId: data.ownerId,
            logoUrl: data.logoUrl,
            websiteUrl: data.websiteUrl,
            isActive: data.isActive,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
        };
    }

    // =================
    // Tokens
    // =================

    async storeToken(token: Omit<TokenRecord, "createdAt">): Promise<TokenRecord> {
        const created = await this.prisma.oAuthToken.create({
            data: {
                token: token.token,
                type: token.type,
                clientId: token.clientId,
                userId: token.userId,
                scopes: this.stringifyArray(token.scopes),
                expiresAt: token.expiresAt,
                isRevoked: token.isRevoked,
                accessToken: token.accessToken,
            },
        });

        return this.mapToken(created);
    }

    async getToken(token: string): Promise<TokenRecord | null> {
        const record = await this.prisma.oAuthToken.findUnique({
            where: { token },
        });
        if (!record) return null;
        if (new Date(record.expiresAt) < new Date()) return null;
        if (record.isRevoked) return null;
        return this.mapToken(record);
    }

    async revokeToken(token: string): Promise<boolean> {
        try {
            await this.prisma.oAuthToken.update({
                where: { token },
                data: { isRevoked: true },
            });
            return true;
        } catch {
            return false;
        }
    }

    async revokeAllClientTokens(clientId: string): Promise<number> {
        const result = await this.prisma.oAuthToken.updateMany({
            where: { clientId, isRevoked: false },
            data: { isRevoked: true },
        });
        return result.count;
    }

    async revokeAllUserTokens(userId: string): Promise<number> {
        const result = await this.prisma.oAuthToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true },
        });
        return result.count;
    }

    async cleanExpiredTokens(): Promise<number> {
        const result = await this.prisma.oAuthToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
        return result.count;
    }

    private mapToken(data: any): TokenRecord {
        return {
            token: data.token,
            type: data.type,
            clientId: data.clientId,
            userId: data.userId,
            scopes: this.parseArray(data.scopes),
            expiresAt: new Date(data.expiresAt),
            createdAt: new Date(data.createdAt),
            isRevoked: data.isRevoked,
            accessToken: data.accessToken,
        };
    }

    // =================
    // Authorization Codes
    // =================

    async storeAuthCode(code: Omit<AuthCodeRecord, "createdAt">): Promise<AuthCodeRecord> {
        const created = await this.prisma.oAuthAuthCode.create({
            data: {
                code: code.code,
                clientId: code.clientId,
                userId: code.userId,
                redirectUri: code.redirectUri,
                scopes: this.stringifyArray(code.scopes),
                codeChallenge: code.codeChallenge,
                codeChallengeMethod: code.codeChallengeMethod,
                expiresAt: code.expiresAt,
            },
        });

        return this.mapAuthCode(created);
    }

    async consumeAuthCode(code: string): Promise<AuthCodeRecord | null> {
        const record = await this.prisma.oAuthAuthCode.findUnique({
            where: { code },
        });
        if (!record) return null;
        if (new Date(record.expiresAt) < new Date()) {
            await this.prisma.oAuthAuthCode.delete({ where: { code } });
            return null;
        }
        if (record.consumed) return null;

        await this.prisma.oAuthAuthCode.delete({ where: { code } });
        return this.mapAuthCode(record);
    }

    async cleanExpiredAuthCodes(): Promise<number> {
        const result = await this.prisma.oAuthAuthCode.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
        return result.count;
    }

    private mapAuthCode(data: any): AuthCodeRecord {
        return {
            code: data.code,
            clientId: data.clientId,
            userId: data.userId,
            redirectUri: data.redirectUri,
            scopes: this.parseArray(data.scopes),
            codeChallenge: data.codeChallenge,
            codeChallengeMethod: data.codeChallengeMethod,
            expiresAt: new Date(data.expiresAt),
            createdAt: new Date(data.createdAt),
        };
    }

    // =================
    // Rate Limiting
    // =================

    async incrementRateLimit(key: string, windowMs: number): Promise<number> {
        const now = Date.now();
        const resetAt = new Date(now + windowMs);

        const existing = await this.prisma.oAuthRateLimit.findUnique({ where: { key } });

        if (!existing || new Date(existing.resetAt).getTime() < now) {
            await this.prisma.oAuthRateLimit.upsert({
                where: { key },
                create: { key, count: 1, resetAt },
                update: { count: 1, resetAt },
            });
            return 1;
        }

        const updated = await this.prisma.oAuthRateLimit.update({
            where: { key },
            data: { count: { increment: 1 } },
        });

        return updated.count;
    }

    async getRateLimitCount(key: string): Promise<number> {
        const existing = await this.prisma.oAuthRateLimit.findUnique({ where: { key } });
        if (!existing || new Date(existing.resetAt).getTime() < Date.now()) return 0;
        return existing.count;
    }

    async resetRateLimit(key: string): Promise<boolean> {
        try {
            await this.prisma.oAuthRateLimit.delete({ where: { key } });
            return true;
        } catch {
            return false;
        }
    }

    // =================
    // Consent Records
    // =================

    async storeConsent(userId: string, clientId: string, scopes: string[]): Promise<void> {
        await this.prisma.oAuthConsent.upsert({
            where: { userId_clientId: { userId, clientId } },
            create: { userId, clientId, scopes: this.stringifyArray(scopes) },
            update: { scopes: this.stringifyArray(scopes) },
        });
    }

    async getConsent(userId: string, clientId: string): Promise<string[] | null> {
        const consent = await this.prisma.oAuthConsent.findUnique({
            where: { userId_clientId: { userId, clientId } },
        });
        return consent ? this.parseArray(consent.scopes) : null;
    }

    async revokeConsent(userId: string, clientId: string): Promise<boolean> {
        try {
            await this.prisma.oAuthConsent.delete({
                where: { userId_clientId: { userId, clientId } },
            });
            return true;
        } catch {
            return false;
        }
    }

    // =================
    // Lifecycle
    // =================

    async initialize(): Promise<void> { }

    async close(): Promise<void> {
        await this.prisma.$disconnect();
    }
}
