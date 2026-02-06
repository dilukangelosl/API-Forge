import { SignJWT, jwtVerify, generateKeyPair, exportJWK } from "jose";
import { generateAccessToken, generateRefreshToken } from "../../utils/crypto";
import { parseDuration } from "../../core/config";
/**
 * Token service for generating and validating OAuth tokens
 */
export class TokenService {
    config;
    privateKey = null;
    publicKey = null;
    publicJWK = null;
    keyId;
    initialized = false;
    constructor(config) {
        this.config = config;
        this.keyId = `key-${Date.now()}`;
    }
    /**
     * Initialize the token service (generates or loads key pairs)
     */
    async initialize() {
        if (this.initialized)
            return;
        // Generate key pair based on algorithm
        const algorithmFamily = this.config.algorithm.startsWith("RS") ? "RSA" : "EC";
        if (algorithmFamily === "RSA") {
            const { publicKey, privateKey } = await generateKeyPair("RS256", {
                modulusLength: 2048,
            });
            this.publicKey = publicKey;
            this.privateKey = privateKey;
        }
        else {
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
    async generateTokenPair(params) {
        if (!this.initialized) {
            await this.initialize();
        }
        const now = Math.floor(Date.now() / 1000);
        const accessTokenTTLMs = parseDuration(this.config.accessTokenTTL);
        const refreshTokenTTLMs = parseDuration(this.config.refreshTokenTTL);
        const expiresIn = Math.floor(accessTokenTTLMs / 1000);
        let accessToken;
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
                .sign(this.privateKey);
        }
        else {
            // Opaque token (just a random string)
            accessToken = tokenId;
        }
        // Refresh tokens are always opaque
        const refreshToken = generateRefreshToken();
        const accessTokenRecord = {
            token: accessToken,
            type: "access",
            clientId: params.clientId,
            ...(params.userId !== undefined && { userId: params.userId }),
            scopes: params.scopes,
            expiresAt: new Date(Date.now() + accessTokenTTLMs),
            createdAt: new Date(),
            isRevoked: false,
        };
        const refreshTokenRecord = {
            token: refreshToken,
            type: "refresh",
            clientId: params.clientId,
            ...(params.userId !== undefined && { userId: params.userId }),
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
    async verifyAccessToken(token) {
        if (!this.initialized) {
            await this.initialize();
        }
        if (this.config.tokenFormat === "opaque") {
            // Opaque tokens must be looked up in storage
            return null;
        }
        try {
            const { payload } = await jwtVerify(token, this.publicKey, {
                issuer: this.config.issuer,
                audience: this.config.audience,
            });
            return {
                sub: payload.sub,
                iss: payload.iss,
                aud: payload.aud,
                exp: payload.exp,
                iat: payload.iat,
                jti: payload.jti,
                scope: payload.scope,
                client_id: payload.client_id,
                ...(payload.user_id !== undefined && { user_id: payload.user_id }),
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Get JWKS (JSON Web Key Set) for the public key
     */
    async getJWKS() {
        if (!this.initialized) {
            await this.initialize();
        }
        return {
            keys: [this.publicJWK],
        };
    }
    /**
     * Get the key ID
     */
    getKeyId() {
        return this.keyId;
    }
}
//# sourceMappingURL=tokens.js.map