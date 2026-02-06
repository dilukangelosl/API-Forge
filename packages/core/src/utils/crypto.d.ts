/**
 * Generate a cryptographically secure random string
 */
export declare function generateRandomString(length?: number): string;
/**
 * Generate a client ID
 */
export declare function generateClientId(): string;
/**
 * Generate a client secret
 */
export declare function generateClientSecret(): string;
/**
 * Generate an access token
 */
export declare function generateAccessToken(): string;
/**
 * Generate a refresh token
 */
export declare function generateRefreshToken(): string;
/**
 * Generate an authorization code
 */
export declare function generateAuthCode(): string;
/**
 * Hash a client secret using bcrypt-like hashing
 * Using SHA-256 with salt for simplicity (can upgrade to argon2/bcrypt)
 */
export declare function hashSecret(secret: string): string;
/**
 * Verify a secret against its hash
 */
export declare function verifySecret(secret: string, hash: string): boolean;
/**
 * Compute SHA-256 hash for PKCE code verifier
 */
export declare function sha256(input: string): string;
/**
 * Verify PKCE code challenge
 */
export declare function verifyCodeChallenge(codeVerifier: string, codeChallenge: string, method?: "S256" | "plain"): boolean;
//# sourceMappingURL=crypto.d.ts.map