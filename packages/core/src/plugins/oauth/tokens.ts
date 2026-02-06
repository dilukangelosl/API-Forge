import { SignJWT, jwtVerify, generateKeyPair, exportJWK, importJWK } from "jose";
import type { JWK, KeyLike } from "jose";
import type { TokenRecord } from "../../abstractions/storage";
import { generateAccessToken, generateRefreshToken } from "../../utils/crypto";
import type { TokenConfig, Duration } from "../../core/config";
import { parseDuration } from "../../core/config";

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
export class TokenService {
    private privateKey: KeyLike | null = null;
    private publicKey: KeyLike | null = null;
    private publicJWK: JWK | null = null;
    private keyId: string;
    private initialized = false;

    constructor(private config: TokenServiceConfig) {
        this.keyId = `key-${Date.now()}`;
    }

    /**
     * Initialize the token service (generates or loads key pairs)
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Generate key pair based on algorithm
        const algorithmFamily = this.config.algorithm.startsWith("RS") ? "RSA" : "EC";

        if (algorithmFamily === "RSA") {
            const { publicKey, privateKey } = await generateKeyPair("RS256", {
                modulusLength: 2048,
            });
            this.publicKey = publicKey;
            this.privateKey = privateKey;
        } else {
            const curve = this.config.algorithm === "ES256" ? "P-256" :
                this.config.algorithm === "ES384" ? "P-384" : "P-521";
            const { publicKey, privateKey } = await generateKeyPair(this.config.algorithm, {
                crv: curve,
            });
            this.publicKey = publicKey;
            this.privateKey = privateKey;
        }

        // Export public key as JWK for JWKS endpoint
        this.publicJWK = await exportJWK(this.publicKey);
        this.publicJWK.kid = this.keyId;
        this.publicJWK.alg = this.config.algorithm;
        this.publicJWK.use = "sig";

        this.initialized = true;
    }

    /**
     * Generate a token pair (access + refresh tokens)
     */
    async generateTokenPair(params: {
        clientId: string;
        userId?: string;
        scopes: string[];
    }): Promise<TokenPair> {
        if (!this.initialized) {
            await this.initialize();
        }

        const now = Math.floor(Date.now() / 1000);
        const accessTokenTTLMs = parseDuration(this.config.accessTokenTTL);
        const refreshTokenTTLMs = parseDuration(this.config.refreshTokenTTL);
        const expiresIn = Math.floor(accessTokenTTLMs / 1000);

        let accessToken: string;
        const tokenId = generateAccessToken();

        if (this.config.tokenFormat === "jwt") {
            // Generate JWT access token
            accessToken = await new SignJWT({
                scope: params.scopes.join(" "),
                client_id: params.clientId,
                ...(params.userId && { user_id: params.userId }),
            })
                .setProtectedHeader({ alg: this.config.algorithm, kid: this.keyId })
                .setSubject(params.userId ?? params.clientId)
                .setIssuer(this.config.issuer)
                .setAudience(this.config.audience)
                .setExpirationTime(now + expiresIn)
                .setIssuedAt(now)
                .setJti(tokenId)
                .sign(this.privateKey!);
        } else {
            // Opaque token (just a random string)
            accessToken = tokenId;
        }

        // Refresh tokens are always opaque
        const refreshToken = generateRefreshToken();

        const accessTokenRecord: TokenRecord = {
            token: accessToken,
            type: "access",
            clientId: params.clientId,
            userId: params.userId,
            scopes: params.scopes,
            expiresAt: new Date(Date.now() + accessTokenTTLMs),
            createdAt: new Date(),
            isRevoked: false,
        };

        const refreshTokenRecord: TokenRecord = {
            token: refreshToken,
            type: "refresh",
            clientId: params.clientId,
            userId: params.userId,
            scopes: params.scopes,
            expiresAt: new Date(Date.now() + refreshTokenTTLMs),
            createdAt: new Date(),
            isRevoked: false,
            accessToken: accessToken,
        };

        return {
            accessToken,
            refreshToken,
            accessTokenRecord,
            refreshTokenRecord,
            expiresIn,
            tokenType: "Bearer",
        };
    }

    /**
     * Verify a JWT access token
     */
    async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
        if (!this.initialized) {
            await this.initialize();
        }

        if (this.config.tokenFormat === "opaque") {
            // Opaque tokens must be looked up in storage
            return null;
        }

        try {
            const { payload } = await jwtVerify(token, this.publicKey!, {
                issuer: this.config.issuer,
                audience: this.config.audience,
            });

            return {
                sub: payload.sub!,
                iss: payload.iss!,
                aud: payload.aud as string,
                exp: payload.exp!,
                iat: payload.iat!,
                jti: payload.jti!,
                scope: payload.scope as string,
                client_id: payload.client_id as string,
                user_id: payload.user_id as string | undefined,
            };
        } catch {
            return null;
        }
    }

    /**
     * Get JWKS (JSON Web Key Set) for the public key
     */
    async getJWKS(): Promise<{ keys: JWK[] }> {
        if (!this.initialized) {
            await this.initialize();
        }

        return {
            keys: [this.publicJWK!],
        };
    }

    /**
     * Get the key ID
     */
    getKeyId(): string {
        return this.keyId;
    }
}
