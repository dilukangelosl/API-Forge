import type { APIForgeContext } from "../../../abstractions/context";
import type { APIForgeResponse } from "../../../abstractions/response";
import type { StorageAdapter } from "../../../abstractions/storage";
import type { TokenService } from "../tokens";
import { Response } from "../../../abstractions/response";
import { OAuthErrors } from "../../../utils/errors";
import { verifySecretAuto } from "../../../utils/crypto";
import { parseScopes, validateRequestedScopes } from "../scopes";

/**
 * Client credentials grant handler
 * RFC 6749 Section 4.4 - Client Credentials Grant
 * Used for machine-to-machine authentication
 */
export async function handleClientCredentialsGrant(params: {
    ctx: APIForgeContext;
    storage: StorageAdapter;
    tokenService: TokenService;
    allowedScopes: string[];
}): Promise<APIForgeResponse> {
    const { ctx, storage, tokenService, allowedScopes: _allowedScopes } = params;
    const body = ctx.request.body as Record<string, unknown>;

    // Validate grant type
    if (body.grant_type !== "client_credentials") {
        return Response.badRequest("Invalid grant_type");
    }

    // Extract client credentials from header or body
    const credentials = extractClientCredentials(ctx);
    if (!credentials) {
        const error = OAuthErrors.invalidClient("Client authentication required");
        return Response.json(401, error.toJSON(), {
            "WWW-Authenticate": 'Basic realm="OAuth"',
        });
    }

    const { clientId, clientSecret } = credentials;

    // Lookup client
    const client = await storage.getClient(clientId);
    if (!client) {
        const error = OAuthErrors.invalidClient("Unknown client");
        return Response.json(401, error.toJSON());
    }

    // Verify client is confidential
    if (!client.isConfidential || !client.clientSecretHash) {
        const error = OAuthErrors.unauthorizedClient(
            "Client credentials grant requires a confidential client"
        );
        return Response.json(400, error.toJSON());
    }

    // Verify client secret
    if (!await verifySecretAuto(clientSecret, client.clientSecretHash)) {
        const error = OAuthErrors.invalidClient("Invalid client secret");
        return Response.json(401, error.toJSON());
    }

    // Verify client is active
    if (!client.isActive) {
        const error = OAuthErrors.invalidClient("Client is disabled");
        return Response.json(401, error.toJSON());
    }

    // Verify grant type is allowed for this client
    if (!client.grantTypes.includes("client_credentials")) {
        const error = OAuthErrors.unauthorizedClient(
            "Client is not authorized for client_credentials grant"
        );
        return Response.json(400, error.toJSON());
    }

    // Parse and validate requested scopes
    const requestedScope = body.scope as string | undefined;
    const requestedScopes = parseScopes(requestedScope);

    // If no scopes requested, use client's default scopes
    const scopesToGrant = requestedScopes.length > 0
        ? requestedScopes
        : client.scopes;

    // Validate scopes against client's allowed scopes
    const { valid, filtered, invalid } = validateRequestedScopes(
        scopesToGrant,
        client.scopes
    );

    if (!valid) {
        const error = OAuthErrors.invalidScope(
            `Invalid scopes: ${invalid.join(", ")}`
        );
        return Response.json(400, error.toJSON());
    }

    // Generate tokens
    const tokenPair = await tokenService.generateTokenPair({
        clientId: client.clientId,
        scopes: filtered,
    });

    // Store tokens
    await storage.storeToken(tokenPair.accessTokenRecord);
    await storage.storeToken(tokenPair.refreshTokenRecord);

    // Return token response (RFC 6749 Section 5.1)
    return Response.json(200, {
        access_token: tokenPair.accessToken,
        token_type: tokenPair.tokenType,
        expires_in: tokenPair.expiresIn,
        scope: filtered.join(" "),
        // Note: refresh_token is typically not issued for client_credentials
        // but can be included if needed
    });
}

/**
 * Extract client credentials from Authorization header or request body
 */
function extractClientCredentials(
    ctx: APIForgeContext
): { clientId: string; clientSecret: string } | null {
    const authHeader = ctx.request.headers["authorization"];

    // Try Basic auth header first
    if (authHeader?.startsWith("Basic ")) {
        try {
            const base64 = authHeader.slice(6);
            const decoded = Buffer.from(base64, "base64").toString("utf-8");
            const [clientId, clientSecret] = decoded.split(":");

            if (clientId && clientSecret) {
                return { clientId, clientSecret };
            }
        } catch {
            // Invalid base64, fall through to body credentials
        }
    }

    // Try body credentials
    const body = ctx.request.body as Record<string, unknown>;
    const clientId = body.client_id as string | undefined;
    const clientSecret = body.client_secret as string | undefined;

    if (clientId && clientSecret) {
        return { clientId, clientSecret };
    }

    return null;
}
