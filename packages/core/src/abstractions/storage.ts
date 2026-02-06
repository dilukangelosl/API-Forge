/**
 * OAuth Client stored in the database
 */
export interface OAuthClient {
    /** Unique client identifier */
    clientId: string;

    /** Hashed client secret (null for public clients) */
    clientSecretHash: string | null;

    /** Client display name */
    name: string;

    /** Client description */
    description?: string;

    /** Authorized redirect URIs */
    redirectUris: string[];

    /** Allowed grant types */
    grantTypes: string[];

    /** Available scopes for this client */
    scopes: string[];

    /** Whether this is a confidential client */
    isConfidential: boolean;

    /** User ID who owns this client */
    ownerId: string;

    /** Client logo URL */
    logoUrl?: string;

    /** Client website URL */
    websiteUrl?: string;

    /** Whether client is active */
    isActive: boolean;

    /** Creation timestamp */
    createdAt: Date;

    /** Last update timestamp */
    updatedAt: Date;
}

/**
 * Token record stored in the database
 */
export interface TokenRecord {
    /** The token value (access token or refresh token) */
    token: string;

    /** Token type: "access" or "refresh" */
    type: "access" | "refresh";

    /** Client ID this token was issued to */
    clientId: string;

    /** User ID if this is a user-authorized token */
    userId?: string;

    /** Scopes granted to this token */
    scopes: string[];

    /** Token expiration timestamp */
    expiresAt: Date;

    /** Creation timestamp */
    createdAt: Date;

    /** Whether token has been revoked */
    isRevoked: boolean;

    /** For refresh tokens: the associated access token */
    accessToken?: string;
}

/**
 * Authorization code record (temporary, consumed during token exchange)
 */
export interface AuthCodeRecord {
    /** The authorization code */
    code: string;

    /** Client ID this code was issued to */
    clientId: string;

    /** User ID who authorized */
    userId: string;

    /** Redirect URI used in the authorization request */
    redirectUri: string;

    /** Scopes authorized */
    scopes: string[];

    /** PKCE code challenge */
    codeChallenge?: string;

    /** PKCE code challenge method */
    codeChallengeMethod?: "S256" | "plain";

    /** Expiration timestamp (codes are short-lived) */
    expiresAt: Date;

    /** Creation timestamp */
    createdAt: Date;
}

/**
 * Scope definition for documentation and portal
 */
export interface ScopeDefinition {
    /** Scope identifier (e.g., "users:read") */
    name: string;

    /** Human-readable description */
    description: string;

    /** Whether this scope is sensitive/admin-only */
    sensitive?: boolean;
}

/**
 * Storage adapter interface
 * Implement this to use any database or key-value store
 */
export interface StorageAdapter {
    // OAuth Clients
    createClient(client: Omit<OAuthClient, "createdAt" | "updatedAt">): Promise<OAuthClient>;
    getClient(clientId: string): Promise<OAuthClient | null>;
    getClientByOwnerId(ownerId: string): Promise<OAuthClient[]>;
    updateClient(clientId: string, data: Partial<OAuthClient>): Promise<OAuthClient | null>;
    deleteClient(clientId: string): Promise<boolean>;

    // Tokens
    storeToken(token: Omit<TokenRecord, "createdAt">): Promise<TokenRecord>;
    getToken(token: string): Promise<TokenRecord | null>;
    revokeToken(token: string): Promise<boolean>;
    revokeAllClientTokens(clientId: string): Promise<number>;
    revokeAllUserTokens(userId: string): Promise<number>;
    cleanExpiredTokens(): Promise<number>;

    // Authorization Codes
    storeAuthCode(code: Omit<AuthCodeRecord, "createdAt">): Promise<AuthCodeRecord>;
    consumeAuthCode(code: string): Promise<AuthCodeRecord | null>;
    cleanExpiredAuthCodes(): Promise<number>;

    // Rate Limiting
    incrementRateLimit(key: string, windowMs: number): Promise<number>;
    getRateLimitCount(key: string): Promise<number>;
    resetRateLimit(key: string): Promise<boolean>;

    // Consent Records (for remembering user consent)
    storeConsent(userId: string, clientId: string, scopes: string[]): Promise<void>;
    getConsent(userId: string, clientId: string): Promise<string[] | null>;
    revokeConsent(userId: string, clientId: string): Promise<boolean>;

    // Lifecycle
    initialize?(): Promise<void>;
    close?(): Promise<void>;
}
