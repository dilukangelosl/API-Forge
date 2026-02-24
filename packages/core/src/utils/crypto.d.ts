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
 * Hash a client secret using Argon2id (memory-hard, secure against brute-force)
 *
 * @param secret - The plaintext secret to hash
 * @returns Promise resolving to the hashed secret
 */
export declare function hashSecret(secret: string): Promise<string>;
/**
 * Verify a secret against its Argon2 hash
 *
 * @param secret - The plaintext secret to verify
 * @param hash - The stored hash to verify against
 * @returns Promise resolving to true if valid, false otherwise
 */
export declare function verifySecret(secret: string, hash: string): Promise<boolean>;
/**
 * Legacy SHA-256 based hash verification (for backwards compatibility)
 * @deprecated Use verifySecret which now uses Argon2
 */
export declare function verifySecretLegacy(secret: string, hash: string): boolean;
/**
 * Smart secret verification that handles both legacy and new formats
 */
export declare function verifySecretAuto(secret: string, hash: string): Promise<boolean>;
/**
 * Compute SHA-256 hash for PKCE code verifier
 */
export declare function sha256(input: string): string;
/**
 * Verify PKCE code challenge (S256 only - plain is deprecated for security)
 *
 * @param codeVerifier - The code verifier from the token request
 * @param codeChallenge - The code challenge from the authorization request
 * @param method - Challenge method (S256 recommended, plain deprecated)
 */
export declare function verifyCodeChallenge(codeVerifier: string, codeChallenge: string, method?: "S256" | "plain"): boolean;
//# sourceMappingURL=crypto.d.ts.map