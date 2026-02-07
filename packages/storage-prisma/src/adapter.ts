import type {
    StorageAdapter,
    OAuthClient,
    TokenRecord,
    AuthCodeRecord,
} from "@api-forge/core";

/**
 * Configuration for Prisma storage adapter
 */
export interface PrismaStorageConfig {
    /** Prisma client instance */
    prisma: PrismaClient;
}

/**
 * Type definition for Prisma client (user provides their own generated client)
 */
type PrismaClient = {
    oAuthClient: any;
    oAuthToken: any;
    oAuthAuthCode: any;
    oAuthRateLimit: any;
    oAuthConsent: any;
    $disconnect: () => Promise<void>;
};

/**
 * Prisma storage adapter for API Forge
 * Uses Prisma ORM for database operations
 */
export class PrismaStorageAdapter implements StorageAdapter {
    private prisma: PrismaClient;

    constructor(config: PrismaStorageConfig) {
        this.prisma = config.prisma;
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
                redirectUris: client.redirectUris,
                grantTypes: client.grantTypes,
                scopes: client.scopes,
                isConfidential: client.isConfidential,
                ownerId: client.ownerId,
                logoUrl: client.logoUrl,
                websiteUrl: client.websiteUrl,
                isActive: client.isActive,
            },
        });

        return this.mapToOAuthClient(created);
    }

    async getClient(clientId: string): Promise<OAuthClient | null> {
        const client = await this.prisma.oAuthClient.findUnique({
            where: { clientId },
        });

        if (!client) return null;
        return this.mapToOAuthClient(client);
    }

    async getClientByOwnerId(ownerId: string): Promise<OAuthClient[]> {
        const clients = await this.prisma.oAuthClient.findMany({
            where: { ownerId },
        });

        return clients.map((c: any) => this.mapToOAuthClient(c));
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
                    ...(data.redirectUris && { redirectUris: data.redirectUris }),
                    ...(data.grantTypes && { grantTypes: data.grantTypes }),
                    ...(data.scopes && { scopes: data.scopes }),
                    ...(data.isConfidential !== undefined && { isConfidential: data.isConfidential }),
                    ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
                    ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl }),
                    ...(data.isActive !== undefined && { isActive: data.isActive }),
                    ...(data.clientSecretHash !== undefined && { clientSecretHash: data.clientSecretHash }),
                },
            });

            return this.mapToOAuthClient(updated);
        } catch (e) {
            return null;
        }
    }

    async deleteClient(clientId: string): Promise<boolean> {
        try {
            await this.prisma.oAuthClient.delete({
                where: { clientId },
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    // =================
    // Tokens
    // =================

    async storeToken(
        token: Omit<TokenRecord, "createdAt">
    ): Promise<TokenRecord> {
        const created = await this.prisma.oAuthToken.create({
            data: {
                token: token.token,
                type: token.type,
                clientId: token.clientId,
                userId: token.userId,
                scopes: token.scopes,
                expiresAt: token.expiresAt,
                isRevoked: token.isRevoked,
                accessToken: token.accessToken,
            },
        });

        return this.mapToTokenRecord(created);
    }

    async getToken(token: string): Promise<TokenRecord | null> {
        const record = await this.prisma.oAuthToken.findUnique({
            where: { token },
        });

        if (!record) return null;

        // Check if expired
        if (new Date(record.expiresAt) < new Date()) {
            return null;
        }

        // Check if revoked
        if (record.isRevoked) {
            return null;
        }

        return this.mapToTokenRecord(record);
    }

    async revokeToken(token: string): Promise<boolean> {
        try {
            await this.prisma.oAuthToken.update({
                where: { token },
                data: { isRevoked: true },
            });
            return true;
        } catch (e) {
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
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        return result.count;
    }

    // =================
    // Authorization Codes
    // =================

    async storeAuthCode(
        code: Omit<AuthCodeRecord, "createdAt">
    ): Promise<AuthCodeRecord> {
        const created = await this.prisma.oAuthAuthCode.create({
            data: {
                code: code.code,
                clientId: code.clientId,
                userId: code.userId,
                redirectUri: code.redirectUri,
                scopes: code.scopes,
                codeChallenge: code.codeChallenge,
                codeChallengeMethod: code.codeChallengeMethod,
                expiresAt: code.expiresAt,
            },
        });

        return this.mapToAuthCodeRecord(created);
    }

    async consumeAuthCode(code: string): Promise<AuthCodeRecord | null> {
        const record = await this.prisma.oAuthAuthCode.findUnique({
            where: { code },
        });

        if (!record) return null;

        // Check if expired
        if (new Date(record.expiresAt) < new Date()) {
            await this.prisma.oAuthAuthCode.delete({ where: { code } });
            return null;
        }

        // Check if already consumed
        if (record.consumed) {
            return null;
        }

        // Mark as consumed (or delete)
        await this.prisma.oAuthAuthCode.delete({ where: { code } });

        return this.mapToAuthCodeRecord(record);
    }

    async cleanExpiredAuthCodes(): Promise<number> {
        const result = await this.prisma.oAuthAuthCode.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        return result.count;
    }

    // =================
    // Rate Limiting
    // =================

    async incrementRateLimit(key: string, windowMs: number): Promise<number> {
        const now = Date.now();
        const resetAt = new Date(now + windowMs);

        const existing = await this.prisma.oAuthRateLimit.findUnique({
            where: { key },
        });

        if (!existing || new Date(existing.resetAt).getTime() < now) {
            // Start new window
            await this.prisma.oAuthRateLimit.upsert({
                where: { key },
                create: { key, count: 1, resetAt },
                update: { count: 1, resetAt },
            });
            return 1;
        }

        // Increment existing
        const updated = await this.prisma.oAuthRateLimit.update({
            where: { key },
            data: { count: { increment: 1 } },
        });

        return updated.count;
    }

    async getRateLimitCount(key: string): Promise<number> {
        const now = Date.now();
        const existing = await this.prisma.oAuthRateLimit.findUnique({
            where: { key },
        });

        if (!existing || new Date(existing.resetAt).getTime() < now) {
            return 0;
        }

        return existing.count;
    }

    async resetRateLimit(key: string): Promise<boolean> {
        try {
            await this.prisma.oAuthRateLimit.delete({ where: { key } });
            return true;
        } catch (e) {
            return false;
        }
    }

    // =================
    // Consent Records
    // =================

    async storeConsent(
        userId: string,
        clientId: string,
        scopes: string[]
    ): Promise<void> {
        await this.prisma.oAuthConsent.upsert({
            where: { userId_clientId: { userId, clientId } },
            create: { userId, clientId, scopes },
            update: { scopes },
        });
    }

    async getConsent(
        userId: string,
        clientId: string
    ): Promise<string[] | null> {
        const consent = await this.prisma.oAuthConsent.findUnique({
            where: { userId_clientId: { userId, clientId } },
        });

        return consent?.scopes ?? null;
    }

    async revokeConsent(userId: string, clientId: string): Promise<boolean> {
        try {
            await this.prisma.oAuthConsent.delete({
                where: { userId_clientId: { userId, clientId } },
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    // =================
    // Lifecycle
    // =================

    async initialize(): Promise<void> {
        // Prisma client is already initialized when passed in
    }

    async close(): Promise<void> {
        await this.prisma.$disconnect();
    }

    // =================
    // Helpers
    // =================

    private mapToOAuthClient(data: any): OAuthClient {
        return {
            clientId: data.clientId,
            clientSecretHash: data.clientSecretHash,
            name: data.name,
            description: data.description,
            redirectUris: data.redirectUris,
            grantTypes: data.grantTypes,
            scopes: data.scopes,
            isConfidential: data.isConfidential,
            ownerId: data.ownerId,
            logoUrl: data.logoUrl,
            websiteUrl: data.websiteUrl,
            isActive: data.isActive,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
        };
    }

    private mapToTokenRecord(data: any): TokenRecord {
        return {
            token: data.token,
            type: data.type,
            clientId: data.clientId,
            userId: data.userId,
            scopes: data.scopes,
            expiresAt: new Date(data.expiresAt),
            createdAt: new Date(data.createdAt),
            isRevoked: data.isRevoked,
            accessToken: data.accessToken,
        };
    }

    private mapToAuthCodeRecord(data: any): AuthCodeRecord {
        return {
            code: data.code,
            clientId: data.clientId,
            userId: data.userId,
            redirectUri: data.redirectUri,
            scopes: data.scopes,
            codeChallenge: data.codeChallenge,
            codeChallengeMethod: data.codeChallengeMethod as "S256" | "plain" | undefined,
            expiresAt: new Date(data.expiresAt),
            createdAt: new Date(data.createdAt),
        };
    }
}
