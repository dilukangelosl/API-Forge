import { describe, test, expect, beforeEach } from "bun:test";
import { TokenService } from "../src/plugins/oauth/tokens";

describe("TokenService", () => {
    let tokenService: TokenService;

    beforeEach(() => {
        tokenService = new TokenService({
            issuer: "https://api.example.com",
            audience: "https://api.example.com",
            accessTokenTTL: "1h",
            refreshTokenTTL: "24h",
            algorithm: "RS256",
            tokenFormat: "jwt",
        });
    });

    describe("Token Generation", () => {
        test("generateTokenPair should create access and refresh tokens", async () => {
            const result = await tokenService.generateTokenPair({
                clientId: "test_client",
                scopes: ["read:users", "write:users"],
            });

            expect(result.accessToken).toBeTruthy();
            expect(result.refreshToken).toBeTruthy();
            expect(result.tokenType).toBe("Bearer");
            expect(result.expiresIn).toBe(3600);
        });

        test("generateTokenPair should include userId when provided", async () => {
            const result = await tokenService.generateTokenPair({
                clientId: "test_client",
                scopes: ["read:users"],
                userId: "user_123",
            });

            expect(result.accessTokenRecord.userId).toBe("user_123");
            expect(result.refreshTokenRecord.userId).toBe("user_123");
        });

        test("access token should be JWT format", async () => {
            const result = await tokenService.generateTokenPair({
                clientId: "test_client",
                scopes: ["read:users"],
            });

            // JWT has 3 parts separated by dots
            const parts = result.accessToken.split(".");
            expect(parts).toHaveLength(3);
        });

        test("token records should have correct metadata", async () => {
            const result = await tokenService.generateTokenPair({
                clientId: "test_client",
                scopes: ["read:users", "write:users"],
            });

            expect(result.accessTokenRecord.clientId).toBe("test_client");
            expect(result.accessTokenRecord.type).toBe("access");
            expect(result.accessTokenRecord.scopes).toEqual(["read:users", "write:users"]);
            expect(result.accessTokenRecord.expiresAt).toBeInstanceOf(Date);
            expect(result.accessTokenRecord.isRevoked).toBe(false);

            expect(result.refreshTokenRecord.type).toBe("refresh");
        });
    });

    describe("Token Verification", () => {
        test("verifyAccessToken should validate and decode token", async () => {
            const result = await tokenService.generateTokenPair({
                clientId: "test_client",
                scopes: ["read:users"],
            });

            const claims = await tokenService.verifyAccessToken(result.accessToken);

            expect(claims).not.toBeNull();
            expect(claims?.client_id).toBe("test_client");
            expect(claims?.scope).toBe("read:users");
        });

        test("verifyAccessToken should reject invalid token", async () => {
            const claims = await tokenService.verifyAccessToken("invalid.token.here");
            expect(claims).toBeNull();
        });

        test("verifyAccessToken should reject token from other issuer", async () => {
            const otherService = new TokenService({
                issuer: "https://other.example.com",
                audience: "https://api.example.com",
                accessTokenTTL: "1h",
                refreshTokenTTL: "24h",
                algorithm: "RS256",
                tokenFormat: "jwt",
            });

            const result = await otherService.generateTokenPair({
                clientId: "test_client",
                scopes: ["read:users"],
            });

            // Token from other issuer should not be valid
            const claims = await tokenService.verifyAccessToken(result.accessToken);
            expect(claims).toBeNull();
        });
    });

    describe("JWKS", () => {
        test("getJWKS should return public key set", async () => {
            // Initialize first
            await tokenService.generateTokenPair({
                clientId: "test",
                scopes: [],
            });

            const jwks = await tokenService.getJWKS();

            expect(jwks.keys).toBeInstanceOf(Array);
            expect(jwks.keys.length).toBeGreaterThan(0);

            const key = jwks.keys[0];
            expect(key.kty).toBe("RSA");
            expect(key.use).toBe("sig");
            expect(key.alg).toBe("RS256");
            expect(key.n).toBeTruthy(); // Public modulus
            expect(key.e).toBeTruthy(); // Public exponent
            expect(key.d).toBeUndefined(); // Private key should not be exposed
        });
    });
});
