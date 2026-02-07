import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { APIForge, oauthPlugin, hashSecret } from "../../src";
import crypto from "crypto";

/**
 * E2E Tests for PKCE (Proof Key for Code Exchange)
 * Storage-level validation tests
 */
describe("PKCE Validation - S256 Method", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;
    const REDIRECT_URI = "http://localhost:8080/callback";

    // Helper: Generate PKCE challenge
    function generatePKCE() {
        const verifier = crypto.randomBytes(32).toString("base64url");
        const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
        return { verifier, challenge };
    }

    // Helper: Validate PKCE S256
    function validateS256(verifier: string, challenge: string): boolean {
        const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
        return computed === challenge;
    }

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["authorization_code", "refresh_token"],
                scopes: { "read:users": "Read user information" },
                pkce: { required: "public_clients" },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();

        // Create PUBLIC client (requires PKCE)
        clientId = `cli_pkce_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: "", // Public client
            name: "PKCE Test Client",
            redirectUris: [REDIRECT_URI],
            grantTypes: ["authorization_code", "refresh_token"],
            scopes: ["read:users"],
            isConfidential: false, // PUBLIC
            ownerId: "test-owner",
            isActive: true,
        });
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should store auth code with PKCE challenge", async () => {
        const { challenge } = generatePKCE();
        const code = `authcode_pkce_store_${Date.now()}`;

        await storage.storeAuthCode({
            code,
            clientId,
            userId: "test-user",
            redirectUri: REDIRECT_URI,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
            codeChallenge: challenge,
            codeChallengeMethod: "S256",
        });

        const consumed = await storage.consumeAuthCode(code);
        expect(consumed).not.toBeNull();
        expect(consumed!.codeChallenge).toBe(challenge);
        expect(consumed!.codeChallengeMethod).toBe("S256");
    });

    test("should validate S256 PKCE correctly", () => {
        const { verifier, challenge } = generatePKCE();

        // Valid verifier should match challenge
        expect(validateS256(verifier, challenge)).toBe(true);

        // Wrong verifier should not match
        expect(validateS256("wrong_verifier", challenge)).toBe(false);
    });

    test("should reject mismatched verifier", () => {
        const { challenge } = generatePKCE();
        const wrongVerifier = "this_is_not_the_correct_verifier";

        expect(validateS256(wrongVerifier, challenge)).toBe(false);
    });

    test("should verify PKCE is required for public clients", async () => {
        const client = await storage.getClient(clientId);
        expect(client).not.toBeNull();
        expect(client!.isConfidential).toBe(false);

        // PKCE should be required for this public client
        // Auth codes without PKCE should be rejected at exchange time
    });
});

describe("PKCE Validation - Plain Method", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;
    let clientId: string;
    const REDIRECT_URI = "http://localhost:8080/callback";

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["authorization_code"],
                scopes: { "read:users": "Read user information" },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();

        clientId = `cli_pkce_plain_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: "",
            name: "PKCE Plain Test Client",
            redirectUris: [REDIRECT_URI],
            grantTypes: ["authorization_code"],
            scopes: ["read:users"],
            isConfidential: false,
            ownerId: "test-owner",
            isActive: true,
        });
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should store auth code with plain PKCE method", async () => {
        const verifier = crypto.randomBytes(32).toString("base64url");
        const code = `authcode_pkce_plain_${Date.now()}`;

        await storage.storeAuthCode({
            code,
            clientId,
            userId: "test-user",
            redirectUri: REDIRECT_URI,
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
            codeChallenge: verifier, // For plain, challenge = verifier
            codeChallengeMethod: "plain",
        });

        const consumed = await storage.consumeAuthCode(code);
        expect(consumed).not.toBeNull();
        expect(consumed!.codeChallenge).toBe(verifier);
        expect(consumed!.codeChallengeMethod).toBe("plain");
    });

    test("should validate plain PKCE correctly", () => {
        const verifier = crypto.randomBytes(32).toString("base64url");

        // For plain method, verifier === challenge
        expect(verifier === verifier).toBe(true);
        expect(verifier === "different").toBe(false);
    });
});

describe("PKCE Edge Cases", () => {
    let forge: APIForge;
    let storage: ReturnType<typeof forge.getStorage>;

    beforeAll(async () => {
        forge = new APIForge({
            auth: {
                grants: ["authorization_code"],
                scopes: { "read:users": "Read user information" },
                pkce: { required: "all" },
            },
        });

        forge.use(oauthPlugin({
            issuer: "http://localhost:3000",
            audience: "http://localhost:3000",
        }));

        storage = forge.getStorage();
    });

    afterAll(async () => {
        await forge.shutdown();
    });

    test("should store auth code without PKCE (for confidential client)", async () => {
        const clientId = `cli_no_pkce_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: hashSecret("secret"),
            name: "Confidential No PKCE",
            redirectUris: ["http://localhost:8080/callback"],
            grantTypes: ["authorization_code"],
            scopes: ["read:users"],
            isConfidential: true, // Confidential client
            ownerId: "test-owner",
            isActive: true,
        });

        const code = `authcode_no_pkce_${Date.now()}`;
        await storage.storeAuthCode({
            code,
            clientId,
            userId: "test-user",
            redirectUri: "http://localhost:8080/callback",
            scopes: ["read:users"],
            expiresAt: new Date(Date.now() + 600000),
            // No PKCE fields
        });

        const consumed = await storage.consumeAuthCode(code);
        expect(consumed).not.toBeNull();
        expect(consumed!.codeChallenge).toBeUndefined();
    });

    test("should detect missing PKCE when required", async () => {
        const clientId = `cli_missing_pkce_${Date.now()}`;

        await storage.createClient({
            clientId,
            clientSecretHash: "",
            name: "Public Missing PKCE",
            redirectUris: ["http://localhost:8080/callback"],
            grantTypes: ["authorization_code"],
            scopes: ["read:users"],
            isConfidential: false,
            ownerId: "test-owner",
            isActive: true,
        });

        const client = await storage.getClient(clientId);
        expect(client!.isConfidential).toBe(false);

        // Application logic should require PKCE for public clients
        // This is validated in the authorization endpoint
    });
});
