/**
 * Drizzle ORM Schema for SQLite
 * 
 * Defines OAuth tables + User table
 */
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// =====================================
// Your Application Tables
// =====================================

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    password: text("password").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// =====================================
// API Forge OAuth Tables
// =====================================

export const oauthClients = sqliteTable("oauth_clients", {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull().unique(),
    clientSecretHash: text("client_secret_hash"),
    name: text("name").notNull(),
    description: text("description"),
    redirectUris: text("redirect_uris").notNull().default("[]"), // JSON string
    grantTypes: text("grant_types").notNull().default("[]"),
    scopes: text("scopes").notNull().default("[]"),
    isConfidential: integer("is_confidential", { mode: "boolean" }).notNull().default(true),
    ownerId: text("owner_id").notNull(),
    logoUrl: text("logo_url"),
    websiteUrl: text("website_url"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const oauthTokens = sqliteTable("oauth_tokens", {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    type: text("type").notNull(), // "access" or "refresh"
    clientId: text("client_id").notNull(),
    userId: text("user_id"),
    scopes: text("scopes").notNull().default("[]"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    isRevoked: integer("is_revoked", { mode: "boolean" }).notNull().default(false),
    accessToken: text("access_token"),
});

export const oauthAuthCodes = sqliteTable("oauth_auth_codes", {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    clientId: text("client_id").notNull(),
    userId: text("user_id").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scopes: text("scopes").notNull().default("[]"),
    codeChallenge: text("code_challenge"),
    codeChallengeMethod: text("code_challenge_method"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    consumed: integer("consumed", { mode: "boolean" }).notNull().default(false),
});

export const oauthRateLimits = sqliteTable("oauth_rate_limits", {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    count: integer("count").notNull().default(0),
    resetAt: integer("reset_at", { mode: "timestamp" }).notNull(),
});

export const oauthConsents = sqliteTable("oauth_consents", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    clientId: text("client_id").notNull(),
    scopes: text("scopes").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
