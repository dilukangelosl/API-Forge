import type { JWK } from "jose";
import type { TokenRecord } from "../../abstractions/storage";
import type { Duration } from "../../core/config";
/**
 * JWT claims for access tokens
 */
export interface AccessTokenClaims {
    /** Subject - client ID or user ID */
    sub: string;
    /** Issuer */
    iss: string;
    /** Audience */
    aud: string;
    /** Expiration time */
    exp: number;
    /** Issued at */
    iat: number;
    /** JWT ID */
    jti: string;
    /** Scopes */
    scope: string;
    /** Client ID */
    client_id: string;
    /** User ID (if user-authorized token) */
    user_id?: string;
}
/**
 * Token service configuration
 */
export interface TokenServiceConfig {
    issuer: string;
    audience: string;
    accessTokenTTL: Duration;
    refreshTokenTTL: Duration;
    algorithm: "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512";
    tokenFormat: "jwt" | "opaque";
}
/**
 * Generated token pair
 */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    accessTokenRecord: TokenRecord;
    refreshTokenRecord: TokenRecord;
    expiresIn: number;
    tokenType: "Bearer";
}
/**
 * Token service for generating and validating OAuth tokens
 */
export declare class TokenService {
    private config;
    private privateKey;
    private publicKey;
    private publicJWK;
    private keyId;
    private initialized;
    constructor(config: TokenServiceConfig);
    /**
     * Initialize the token service (generates or loads key pairs)
     */
    initialize(): Promise<void>;
    /**
     * Generate a token pair (access + refresh tokens)
     */
    generateTokenPair(params: {
        clientId: string;
        userId?: string;
        scopes: string[];
    }): Promise<TokenPair>;
    /**
     * Verify a JWT access token
     */
    verifyAccessToken(token: string): Promise<AccessTokenClaims | null>;
    /**
     * Get JWKS (JSON Web Key Set) for the public key
     */
    getJWKS(): Promise<{
        keys: JWK[];
    }>;
    /**
     * Get the key ID
     */
    getKeyId(): string;
}
//# sourceMappingURL=tokens.d.ts.map