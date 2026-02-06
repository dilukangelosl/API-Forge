import type { APIForgeContext } from "../../../abstractions/context";
import type { APIForgeResponse } from "../../../abstractions/response";
import type { StorageAdapter } from "../../../abstractions/storage";
import type { TokenService } from "../tokens";
import { Response } from "../../../abstractions/response";
import { OAuthErrors } from "../../../utils/errors";
import { verifySecret, verifyCodeChallenge } from "../../../utils/crypto";

/**
 * Token endpoint handler for authorization_code grant
 * RFC 6749 Section 4.1.3 - Access Token Request
 * RFC 7636 - PKCE Support
 */
export async function handleAuthorizationCodeGrant(params: {
    ctx: APIForgeContext;
    storage: StorageAdapter;
    tokenService: TokenService;
    pkceRequired: "always" | "public_clients" | "never";
}): Promise<APIForgeResponse> {
    const { ctx, storage, tokenService, pkceRequired } = params;
    const body = ctx.request.body as Record<string, unknown>;

    // Validate required parameters
    const code = body.code as string | undefined;
    const redirectUri = body.redirect_uri as string | undefined;
    const clientId = body.client_id as string | undefined;
    const codeVerifier = body.code_verifier as string | undefined;

    if (!code) {
        const error = OAuthErrors.invalidRequest("Missing code parameter");
        return Response.json(400, error.toJSON());
    }

    if (!redirectUri) {
        const error = OAuthErrors.invalidRequest("Missing redirect_uri parameter");
        return Response.json(400, error.toJSON());
    }

    // Consume the authorization code (single use)
    const authCode = await storage.consumeAuthCode(code);
    if (!authCode) {
        const error = OAuthErrors.invalidGrant("Invalid or expired authorization code");
        return Response.json(400, error.toJSON());
    }

    // Get the client
    const client = await storage.getClient(authCode.clientId);
    if (!client) {
        const error = OAuthErrors.invalidClient("Unknown client");
        return Response.json(400, error.toJSON());
    }

    // Verify client ID matches if provided in body
    if (clientId && clientId !== authCode.clientId) {
        const error = OAuthErrors.invalidGrant("Client ID mismatch");
        return Response.json(400, error.toJSON());
    }

    // Verify redirect URI matches
    if (redirectUri !== authCode.redirectUri) {
        const error = OAuthErrors.invalidGrant("Redirect URI mismatch");
        return Response.json(400, error.toJSON());
    }

    // For confidential clients, verify client secret
    if (client.isConfidential) {
        const authHeader = ctx.request.headers["authorization"];
        let clientSecret: string | undefined;

        if (authHeader?.startsWith("Basic ")) {
            try {
                const base64 = authHeader.slice(6);
                const decoded = Buffer.from(base64, "base64").toString("utf-8");
                const [, secret] = decoded.split(":");
                clientSecret = secret;
            } catch {
                // Invalid base64
            }
        } else {
            clientSecret = body.client_secret as string | undefined;
        }

        if (!clientSecret) {
            const error = OAuthErrors.invalidClient("Client authentication required");
            return Response.json(401, error.toJSON(), {
                "WWW-Authenticate": 'Basic realm="OAuth"',
            });
        }

        if (!client.clientSecretHash || !verifySecret(clientSecret, client.clientSecretHash)) {
            const error = OAuthErrors.invalidClient("Invalid client secret");
            return Response.json(401, error.toJSON());
        }
    }

    // PKCE verification
    if (authCode.codeChallenge) {
        if (!codeVerifier) {
            const error = OAuthErrors.invalidGrant("Missing code_verifier");
            return Response.json(400, error.toJSON());
        }

        const method = authCode.codeChallengeMethod ?? "S256";
        if (!verifyCodeChallenge(codeVerifier, authCode.codeChallenge, method)) {
            const error = OAuthErrors.invalidGrant("Invalid code_verifier");
            return Response.json(400, error.toJSON());
        }
    } else if (pkceRequired === "always" ||
        (pkceRequired === "public_clients" && !client.isConfidential)) {
        const error = OAuthErrors.invalidGrant(
            "PKCE is required but code_challenge was not provided during authorization"
        );
        return Response.json(400, error.toJSON());
    }

    // Generate tokens
    const tokenPair = await tokenService.generateTokenPair({
        clientId: client.clientId,
        userId: authCode.userId,
        scopes: authCode.scopes,
    });

    // Store tokens
    await storage.storeToken(tokenPair.accessTokenRecord);
    await storage.storeToken(tokenPair.refreshTokenRecord);

    // Return token response
    return Response.json(200, {
        access_token: tokenPair.accessToken,
        token_type: tokenPair.tokenType,
        expires_in: tokenPair.expiresIn,
        refresh_token: tokenPair.refreshToken,
        scope: authCode.scopes.join(" "),
    });
}
