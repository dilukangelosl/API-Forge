/**
 * Seed script to create test OAuth clients
 */
import {
    generateClientId,
    generateClientSecret,
    hashSecret,
    MemoryStorageAdapter,
} from "@api-forge/core";

// Create storage and seed with test client
const storage = new MemoryStorageAdapter();

async function seed() {
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const secretHash = hashSecret(clientSecret);

    await storage.storeClient({
        clientId,
        clientSecretHash: secretHash,
        name: "Test Application",
        description: "A test OAuth client for development",
        redirectUris: ["http://localhost:3000/callback"],
        grantTypes: ["client_credentials", "authorization_code", "refresh_token"],
        scopes: ["read:users", "write:users", "read:products"],
        isConfidential: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    console.log("Test OAuth Client Created");
    console.log("=========================");
    console.log(`Client ID:     ${clientId}`);
    console.log(`Client Secret: ${clientSecret}`);
    console.log("");
    console.log("To get an access token, run:");
    console.log("");
    console.log(`curl -X POST http://localhost:3000/oauth/token \\`);
    console.log(`  -H "Content-Type: application/x-www-form-urlencoded" \\`);
    console.log(`  -d "grant_type=client_credentials" \\`);
    console.log(`  -d "client_id=${clientId}" \\`);
    console.log(`  -d "client_secret=${clientSecret}" \\`);
    console.log(`  -d "scope=read:users read:products"`);
    console.log("");
    console.log("Then use the token to call APIs:");
    console.log("");
    console.log(`curl http://localhost:3000/api/v1/users \\`);
    console.log(`  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`);
}

seed().catch(console.error);
