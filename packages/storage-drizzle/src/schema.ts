import { pgTable, varchar, text, boolean, timestamp, integer, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";

/**
 * OAuth Clients (Applications)
 */
export const oauthClients = pgTable("oauth_clients", {
    id: varchar("id", { length: 255 }).primaryKey(),
    clientId: varchar("client_id", { length: 255 }).notNull().unique(),
    clientSecretHash: text("client_secret_hash"),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    redirectUris: text("redirect_uris").array().notNull().default([]),
    grantTypes: text("grant_types").array().notNull().default([]),
    scopes: text("scopes").array().notNull().default([]),
    isConfidential: boolean("is_confidential").notNull().default(true),
    ownerId: varchar("owner_id", { length: 255 }).notNull(),
    logoUrl: text("logo_url"),
    websiteUrl: text("website_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    clientIdIdx: uniqueIndex("oauth_clients_client_id_idx").on(table.clientId),
    ownerIdIdx: index("oauth_clients_owner_id_idx").on(table.ownerId),
}));

/**
 * OAuth Tokens (Access and Refresh)
 */
export const oauthTokens = pgTable("oauth_tokens", {
    id: varchar("id", { length: 255 }).primaryKey(),
    token: text("token").notNull().unique(),
    type: varchar("type", { length: 20 }).notNull(), // "access" or "refresh"
    clientId: varchar("client_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }),
    scopes: text("scopes").array().notNull().default([]),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    isRevoked: boolean("is_revoked").notNull().default(false),
    accessToken: text("access_token"),
}, (table) => ({
    tokenIdx: uniqueIndex("oauth_tokens_token_idx").on(table.token),
    clientIdIdx: index("oauth_tokens_client_id_idx").on(table.clientId),
    userIdIdx: index("oauth_tokens_user_id_idx").on(table.userId),
    expiresAtIdx: index("oauth_tokens_expires_at_idx").on(table.expiresAt),
}));

/**
 * Authorization Codes (temporary, consumed during token exchange)
 */
export const oauthAuthCodes = pgTable("oauth_auth_codes", {
    id: varchar("id", { length: 255 }).primaryKey(),
    code: text("code").notNull().unique(),
    clientId: varchar("client_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scopes: text("scopes").array().notNull().default([]),
    codeChallenge: text("code_challenge"),
    codeChallengeMethod: varchar("code_challenge_method", { length: 10 }), // "S256" or "plain"
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    consumed: boolean("consumed").notNull().default(false),
}, (table) => ({
    codeIdx: uniqueIndex("oauth_auth_codes_code_idx").on(table.code),
    clientIdIdx: index("oauth_auth_codes_client_id_idx").on(table.clientId),
    expiresAtIdx: index("oauth_auth_codes_expires_at_idx").on(table.expiresAt),
}));

/**
 * Rate Limiting
 */
export const oauthRateLimits = pgTable("oauth_rate_limits", {
    id: varchar("id", { length: 255 }).primaryKey(),
    key: varchar("key", { length: 500 }).notNull().unique(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at").notNull(),
}, (table) => ({
    keyIdx: uniqueIndex("oauth_rate_limits_key_idx").on(table.key),
    resetAtIdx: index("oauth_rate_limits_reset_at_idx").on(table.resetAt),
}));

/**
 * User Consent Records
 */
export const oauthConsents = pgTable("oauth_consents", {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    clientId: varchar("client_id", { length: 255 }).notNull(),
    scopes: text("scopes").array().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    userClientIdx: uniqueIndex("oauth_consents_user_client_idx").on(table.userId, table.clientId),
}));

// Type exports for inference
export type OAuthClientRow = typeof oauthClients.$inferSelect;
export type OAuthTokenRow = typeof oauthTokens.$inferSelect;
export type OAuthAuthCodeRow = typeof oauthAuthCodes.$inferSelect;
export type OAuthRateLimitRow = typeof oauthRateLimits.$inferSelect;
export type OAuthConsentRow = typeof oauthConsents.$inferSelect;
