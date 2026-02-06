import { Response } from "../../../abstractions/response";
import { OAuthErrors } from "../../../utils/errors";
import { verifySecret } from "../../../utils/crypto";
/**
 * Refresh token grant handler
 * RFC 6749 Section 6 - Refreshing an Access Token
 */
export async function handleRefreshTokenGrant(params) {
    const { ctx, storage, tokenService, rotateRefreshTokens, reuseDetection } = params;
    const body = ctx.request.body;
    // Validate required parameters
    const refreshToken = body.refresh_token;
    if (!refreshToken) {
        const error = OAuthErrors.invalidRequest("Missing refresh_token parameter");
        return Response.json(400, error.toJSON());
    }
    // Look up the refresh token
    const tokenRecord = await storage.getToken(refreshToken);
    if (!tokenRecord || tokenRecord.type !== "refresh") {
        const error = OAuthErrors.invalidGrant("Invalid refresh token");
        return Response.json(400, error.toJSON());
    }
    // Check if token is revoked (possible reuse detection)
    if (tokenRecord.isRevoked) {
        if (reuseDetection) {
            // Token reuse detected - revoke all tokens for this client
            await storage.revokeAllClientTokens(tokenRecord.clientId);
            const error = OAuthErrors.invalidGrant("Refresh token reuse detected. All tokens have been revoked.");
            return Response.json(400, error.toJSON());
        }
        const error = OAuthErrors.invalidGrant("Refresh token has been revoked");
        return Response.json(400, error.toJSON());
    }
    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
        const error = OAuthErrors.invalidGrant("Refresh token has expired");
        return Response.json(400, error.toJSON());
    }
    // Get the client
    const client = await storage.getClient(tokenRecord.clientId);
    if (!client) {
        const error = OAuthErrors.invalidClient("Unknown client");
        return Response.json(400, error.toJSON());
    }
    // For confidential clients, verify client credentials
    if (client.isConfidential) {
        const authHeader = ctx.request.headers["authorization"];
        let clientId;
        let clientSecret;
        if (authHeader?.startsWith("Basic ")) {
            try {
                const base64 = authHeader.slice(6);
                const decoded = Buffer.from(base64, "base64").toString("utf-8");
                [clientId, clientSecret] = decoded.split(":");
            }
            catch {
                // Invalid base64
            }
        }
        else {
            clientId = body.client_id;
            clientSecret = body.client_secret;
        }
        if (!clientSecret) {
            const error = OAuthErrors.invalidClient("Client authentication required");
            return Response.json(401, error.toJSON(), {
                "WWW-Authenticate": 'Basic realm="OAuth"',
            });
        }
        if (clientId && clientId !== tokenRecord.clientId) {
            const error = OAuthErrors.invalidGrant("Client ID mismatch");
            return Response.json(400, error.toJSON());
        }
        if (!client.clientSecretHash || !verifySecret(clientSecret, client.clientSecretHash)) {
            const error = OAuthErrors.invalidClient("Invalid client secret");
            return Response.json(401, error.toJSON());
        }
    }
    // Handle scope downgrading (optional in RFC 6749)
    const requestedScope = body.scope;
    let scopes = tokenRecord.scopes;
    if (requestedScope) {
        const requestedScopes = requestedScope.split(" ");
        // Can only request a subset of originally granted scopes
        const invalidScopes = requestedScopes.filter(s => !tokenRecord.scopes.includes(s));
        if (invalidScopes.length > 0) {
            const error = OAuthErrors.invalidScope(`Cannot expand scope on refresh. Invalid scopes: ${invalidScopes.join(", ")}`);
            return Response.json(400, error.toJSON());
        }
        scopes = requestedScopes;
    }
    // Generate new tokens
    const tokenPair = await tokenService.generateTokenPair({
        clientId: tokenRecord.clientId,
        scopes,
        ...(tokenRecord.userId !== undefined && { userId: tokenRecord.userId }),
    });
    // Revoke old refresh token if rotating
    if (rotateRefreshTokens) {
        await storage.revokeToken(refreshToken);
    }
    // Revoke old access token if it was stored
    if (tokenRecord.accessToken) {
        await storage.revokeToken(tokenRecord.accessToken);
    }
    // Store new tokens
    await storage.storeToken(tokenPair.accessTokenRecord);
    await storage.storeToken(tokenPair.refreshTokenRecord);
    // Return token response
    const response = {
        access_token: tokenPair.accessToken,
        token_type: tokenPair.tokenType,
        expires_in: tokenPair.expiresIn,
        scope: scopes.join(" "),
    };
    // Include new refresh token if rotating
    if (rotateRefreshTokens) {
        response.refresh_token = tokenPair.refreshToken;
    }
    return Response.json(200, response);
}
//# sourceMappingURL=refresh-token.js.map