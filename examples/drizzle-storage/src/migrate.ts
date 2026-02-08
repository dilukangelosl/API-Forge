/**
 * Database migration/setup script using Bun's SQLite
 */
import { Database } from "bun:sqlite";

const sqlite = new Database("dev.db");

// Create tables using raw SQL
const createTables = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- OAuth Clients
CREATE TABLE IF NOT EXISTS oauth_clients (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL UNIQUE,
    client_secret_hash TEXT,
    name TEXT NOT NULL,
    description TEXT,
    redirect_uris TEXT NOT NULL DEFAULT '[]',
    grant_types TEXT NOT NULL DEFAULT '[]',
    scopes TEXT NOT NULL DEFAULT '[]',
    is_confidential INTEGER NOT NULL DEFAULT 1,
    owner_id TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- OAuth Tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    client_id TEXT NOT NULL,
    user_id TEXT,
    scopes TEXT NOT NULL DEFAULT '[]',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    access_token TEXT
);

-- OAuth Auth Codes
CREATE TABLE IF NOT EXISTS oauth_auth_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT '[]',
    code_challenge TEXT,
    code_challenge_method TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    consumed INTEGER NOT NULL DEFAULT 0
);

-- OAuth Rate Limits
CREATE TABLE IF NOT EXISTS oauth_rate_limits (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at INTEGER NOT NULL
);

-- OAuth Consents
CREATE TABLE IF NOT EXISTS oauth_consents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, client_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client_id ON oauth_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_expires_at ON oauth_auth_codes(expires_at);
`;

console.log("Creating database tables...");
sqlite.exec(createTables);
console.log("✅ Database migration complete!");

sqlite.close();
