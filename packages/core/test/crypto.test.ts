import { describe, test, expect } from "bun:test";
import {
    generateClientId,
    generateClientSecret,
    hashSecret,
    verifySecret,
    generateAuthCode,
    sha256,
    verifyCodeChallenge,
    generateRandomString,
} from "../src/utils/crypto";

describe("Crypto Utils", () => {
    describe("Client ID Generation", () => {
        test("generateClientId should create prefixed ID", () => {
            const clientId = generateClientId();

            expect(clientId).toMatch(/^cli_[a-zA-Z0-9_-]+$/);
            expect(clientId.length).toBeGreaterThan(10);
        });

        test("generateClientId should create unique IDs", () => {
            const id1 = generateClientId();
            const id2 = generateClientId();

            expect(id1).not.toBe(id2);
        });
    });

    describe("Client Secret Generation", () => {
        test("generateClientSecret should create prefixed secret", () => {
            const secret = generateClientSecret();

            expect(secret).toMatch(/^sec_[a-zA-Z0-9_-]+$/);
            expect(secret.length).toBeGreaterThan(20);
        });

        test("generateClientSecret should create unique secrets", () => {
            const s1 = generateClientSecret();
            const s2 = generateClientSecret();

            expect(s1).not.toBe(s2);
        });
    });

    describe("Secret Hashing and Verification", () => {
        test("verifySecret should return true for correct secret", () => {
            const secret = "correct_secret";
            const hash = hashSecret(secret);

            expect(verifySecret(secret, hash)).toBe(true);
        });

        test("verifySecret should return false for incorrect secret", () => {
            const secret = "correct_secret";
            const hash = hashSecret(secret);

            expect(verifySecret("wrong_secret", hash)).toBe(false);
        });

        test("different secrets should produce different hashes", () => {
            const hash1 = hashSecret("secret1");
            const hash2 = hashSecret("secret2");

            expect(hash1).not.toBe(hash2);
        });
    });

    describe("Authorization Code Generation", () => {
        test("generateAuthCode should create unique codes", () => {
            const code1 = generateAuthCode();
            const code2 = generateAuthCode();

            expect(code1).not.toBe(code2);
            expect(code1.length).toBeGreaterThanOrEqual(30);
        });
    });

    describe("SHA-256 and PKCE", () => {
        test("sha256 should produce base64url encoded hash", () => {
            const input = "test_input_string";
            const hash = sha256(input);

            // Base64url encoded SHA-256 is 43 characters
            expect(hash.length).toBe(43);
            expect(hash).toMatch(/^[A-Za-z0-9\-_]+$/);
        });

        test("verifyCodeChallenge should validate S256 correctly", () => {
            // Create a verifier and compute challenge manually
            const verifier = generateRandomString(64);
            const challenge = sha256(verifier);

            const isValid = verifyCodeChallenge(verifier, challenge, "S256");
            expect(isValid).toBe(true);
        });

        test("verifyCodeChallenge should reject wrong verifier", () => {
            const verifier = generateRandomString(64);
            const challenge = sha256(verifier);

            const isValid = verifyCodeChallenge("wrong_verifier", challenge, "S256");
            expect(isValid).toBe(false);
        });

        test("verifyCodeChallenge should work with plain method", () => {
            const verifier = generateRandomString(64);
            // Plain challenge is just the verifier itself
            const challenge = verifier;

            const isValid = verifyCodeChallenge(verifier, challenge, "plain");
            expect(isValid).toBe(true);
        });
    });

    describe("Random String Generation", () => {
        test("generateRandomString should create string of specified length", () => {
            const str16 = generateRandomString(16);
            const str32 = generateRandomString(32);

            expect(str16.length).toBe(16);
            expect(str32.length).toBe(32);
        });

        test("generateRandomString should be unique", () => {
            const s1 = generateRandomString(32);
            const s2 = generateRandomString(32);

            expect(s1).not.toBe(s2);
        });
    });
});
