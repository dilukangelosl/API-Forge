import { Response } from "../../../abstractions/response";
import { OAuthErrors } from "../../../utils/errors";
/**
 * Build authorization request error redirect
 */
function errorRedirect(redirectUri, error, description, state) {
    const url = new URL(redirectUri);
    url.searchParams.set("error", error);
    url.searchParams.set("error_description", description);
    if (state)
        url.searchParams.set("state", state);
    return Response.redirect(url.toString());
}
/**
 * Authorization endpoint handler
 * RFC 6749 Section 4.1.1 - Authorization Request
 * RFC 7636 - PKCE Support
 */
export async function handleAuthorizationRequest(params) {
    const { ctx, storage, config, consentPageUrl } = params;
    const query = ctx.request.query;
    // Extract parameters
    const clientId = query.client_id;
    const redirectUri = query.redirect_uri;
    const responseType = query.response_type;
    const scope = query.scope;
    const state = query.state;
    const codeChallenge = query.code_challenge;
    const codeChallengeMethod = query.code_challenge_method;
    // Validate required parameters (before we have a valid redirect_uri)
    if (!clientId) {
        const error = OAuthErrors.invalidRequest("Missing client_id parameter");
        return Response.json(400, error.toJSON());
    }
    if (!redirectUri) {
        const error = OAuthErrors.invalidRequest("Missing redirect_uri parameter");
        return Response.json(400, error.toJSON());
    }
    // Get the client
    const client = await storage.getClient(clientId);
    if (!client) {
        const error = OAuthErrors.invalidClient("Unknown client");
        return Response.json(400, error.toJSON());
    }
    // Validate redirect_uri is registered
    if (!client.redirectUris.includes(redirectUri)) {
        const error = OAuthErrors.invalidRequest("redirect_uri is not registered for this client");
        return Response.json(400, error.toJSON());
    }
    // From here, we can redirect errors to the redirect_uri
    // Validate response_type
    if (!responseType) {
        return errorRedirect(redirectUri, "invalid_request", "Missing response_type parameter", state);
    }
    if (responseType !== "code") {
        return errorRedirect(redirectUri, "unsupported_response_type", "Only 'code' response type is supported", state);
    }
    // Validate scope
    const requestedScopes = scope ? scope.split(" ").filter(Boolean) : [];
    const allowedScopes = Object.keys(config.auth.scopes);
    const invalidScopes = requestedScopes.filter((s) => !allowedScopes.includes(s));
    if (invalidScopes.length > 0) {
        return errorRedirect(redirectUri, "invalid_scope", `Invalid scopes: ${invalidScopes.join(", ")}`, state);
    }
    // Check if scopes are within client's allowed scopes
    const clientInvalidScopes = requestedScopes.filter((s) => !client.scopes.includes(s));
    if (clientInvalidScopes.length > 0) {
        return errorRedirect(redirectUri, "invalid_scope", `Client is not authorized for scopes: ${clientInvalidScopes.join(", ")}`, state);
    }
    // PKCE validation
    const pkceRequired = config.auth.pkce.required;
    if (pkceRequired === "always" || (pkceRequired === "public_clients" && !client.isConfidential)) {
        if (!codeChallenge) {
            return errorRedirect(redirectUri, "invalid_request", "PKCE code_challenge is required", state);
        }
    }
    if (codeChallenge && codeChallengeMethod && !["S256", "plain"].includes(codeChallengeMethod)) {
        return errorRedirect(redirectUri, "invalid_request", "Invalid code_challenge_method. Supported: S256, plain", state);
    }
    // Build consent page URL with all necessary parameters
    const consentUrl = new URL(consentPageUrl);
    consentUrl.searchParams.set("client_id", clientId);
    consentUrl.searchParams.set("redirect_uri", redirectUri);
    consentUrl.searchParams.set("scope", requestedScopes.join(" "));
    if (state)
        consentUrl.searchParams.set("state", state);
    if (codeChallenge) {
        consentUrl.searchParams.set("code_challenge", codeChallenge);
        consentUrl.searchParams.set("code_challenge_method", codeChallengeMethod ?? "S256");
    }
    return Response.redirect(consentUrl.toString());
}
/**
 * Handle consent approval - issue authorization code and redirect
 */
export async function handleConsentApproval(params) {
    const { storage, clientId, userId, redirectUri, scopes, state, codeChallenge, codeChallengeMethod, } = params;
    // Generate authorization code
    const code = generateAuthCode();
    // Build auth code record
    const authCodeRecord = {
        code,
        clientId,
        userId,
        redirectUri,
        scopes,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
    // Only add PKCE fields if provided
    if (codeChallenge) {
        authCodeRecord.codeChallenge = codeChallenge;
        if (codeChallengeMethod) {
            authCodeRecord.codeChallengeMethod = codeChallengeMethod;
        }
    }
    // Store the authorization code (expires in 10 minutes per RFC 6749)
    await storage.storeAuthCode(authCodeRecord);
    // Store consent for future requests
    await storage.storeConsent(userId, clientId, scopes);
    // Redirect back to the client with the code
    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state)
        url.searchParams.set("state", state);
    return Response.redirect(url.toString());
}
/**
 * Handle consent denial - redirect with error
 */
export function handleConsentDenial(params) {
    return errorRedirect(params.redirectUri, "access_denied", "The user denied the authorization request", params.state);
}
/**
 * Generate a secure random authorization code
 */
function generateAuthCode() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
//# sourceMappingURL=authorize.js.map