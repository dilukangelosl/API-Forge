import * as crypto from "crypto";
import * as argon2 from "argon2";

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

/**
 * Generate a client ID
 */
export function generateClientId(): string {
    return `cli_${generateRandomString(24)}`;
}

/**
 * Generate a client secret
 */
export function generateClientSecret(): string {
    return `sec_${generateRandomString(48)}`;
}

/**
 * Generate an access token
 */
export function generateAccessToken(): string {
    return generateRandomString(64);
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(): string {
    return generateRandomString(64);
}

/**
 * Generate an authorization code
 */
export function generateAuthCode(): string {
    return generateRandomString(32);
}

/**
 * Hash a client secret using Argon2id (memory-hard, secure against brute-force)
 * 
 * @param secret - The plaintext secret to hash
 * @returns Promise resolving to the hashed secret
 */
export async function hashSecret(secret: string): Promise<string> {
    return argon2.hash(secret, {
        type: argon2.argon2id,
        memoryCost: 65536,  // 64 MB
        timeCost: 3,        // 3 iterations
        parallelism: 4,     // 4 parallel threads
    });
}

/**
 * Verify a secret against its Argon2 hash
 * 
 * @param secret - The plaintext secret to verify
 * @param hash - The stored hash to verify against
 * @returns Promise resolving to true if valid, false otherwise
 */
export async function verifySecret(secret: string, hash: string): Promise<boolean> {
    try {
        return await argon2.verify(hash, secret);
    } catch {
        return false;
    }
}

/**
 * Legacy SHA-256 based hash verification (for backwards compatibility)
 * @deprecated Use verifySecret which now uses Argon2
 */
export function verifySecretLegacy(secret: string, hash: string): boolean {
    // Check if it's a legacy hash format (salt$hash)
    if (!hash.includes("$argon2")) {
        const [salt, expectedHash] = hash.split("$");
        if (!salt || !expectedHash) return false;

        const actualHash = crypto
            .createHash("sha256")
            .update(salt + secret)
            .digest("base64url");

        // Constant-time comparison
        try {
            return crypto.timingSafeEqual(
                Buffer.from(actualHash),
                Buffer.from(expectedHash)
            );
        } catch {
            return false;
        }
    }
    return false;
}

/**
 * Smart secret verification that handles both legacy and new formats
 */
export async function verifySecretAuto(secret: string, hash: string): Promise<boolean> {
    // Argon2 hashes start with $argon2
    if (hash.startsWith("$argon2")) {
        return verifySecret(secret, hash);
    }
    // Legacy SHA-256 format
    return verifySecretLegacy(secret, hash);
}

/**
 * Compute SHA-256 hash for PKCE code verifier
 */
export function sha256(input: string): string {
    return crypto.createHash("sha256").update(input).digest("base64url");
}

/**
 * Verify PKCE code challenge (S256 only - plain is deprecated for security)
 * 
 * @param codeVerifier - The code verifier from the token request
 * @param codeChallenge - The code challenge from the authorization request
 * @param method - Challenge method (S256 recommended, plain deprecated)
 */
export function verifyCodeChallenge(
    codeVerifier: string,
    codeChallenge: string,
    method: "S256" | "plain" = "S256"
): boolean {
    if (method === "plain") {
        // Deprecated: plain method provides no security benefit
        // Kept for backwards compatibility but should be avoided
        console.warn("[SECURITY] PKCE plain method is deprecated. Use S256 instead.");
        return codeVerifier === codeChallenge;
    }

    // S256: SHA-256 hash then base64url encode
    const computed = sha256(codeVerifier);
    return computed === codeChallenge;
}
