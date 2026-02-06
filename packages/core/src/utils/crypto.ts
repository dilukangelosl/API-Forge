import * as crypto from "crypto";

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
 * Hash a client secret using bcrypt-like hashing
 * Using SHA-256 with salt for simplicity (can upgrade to argon2/bcrypt)
 */
export function hashSecret(secret: string): string {
    const salt = generateRandomString(16);
    const hash = crypto
        .createHash("sha256")
        .update(salt + secret)
        .digest("base64url");
    return `${salt}$${hash}`;
}

/**
 * Verify a secret against its hash
 */
export function verifySecret(secret: string, hash: string): boolean {
    const [salt, expectedHash] = hash.split("$");
    if (!salt || !expectedHash) return false;

    const actualHash = crypto
        .createHash("sha256")
        .update(salt + secret)
        .digest("base64url");

    // Constant-time comparison
    return crypto.timingSafeEqual(
        Buffer.from(actualHash),
        Buffer.from(expectedHash)
    );
}

/**
 * Compute SHA-256 hash for PKCE code verifier
 */
export function sha256(input: string): string {
    return crypto.createHash("sha256").update(input).digest("base64url");
}

/**
 * Verify PKCE code challenge
 */
export function verifyCodeChallenge(
    codeVerifier: string,
    codeChallenge: string,
    method: "S256" | "plain" = "S256"
): boolean {
    if (method === "plain") {
        return codeVerifier === codeChallenge;
    }

    // S256: SHA-256 hash then base64url encode
    const computed = sha256(codeVerifier);
    return computed === codeChallenge;
}
