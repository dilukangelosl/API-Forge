import type { APIForgePlugin, PluginPlatformAPI } from "../../abstractions/plugin";
import type { APIForgeContext } from "../../abstractions/context";
import type { APIForgeResponse } from "../../abstractions/response";
import type { StorageAdapter } from "../../abstractions/storage";
import type { ResolvedConfig, PKCERequirement } from "../../core/config";
import { Response } from "../../abstractions/response";
import { TokenService } from "./tokens";
import { handleClientCredentialsGrant } from "./grants/client-credentials";
import { handleAuthorizationCodeGrant } from "./grants/authorization-code";
import { handleRefreshTokenGrant } from "./grants/refresh-token";
import { OAuthErrors } from "../../utils/errors";

/**
 * OAuth 2.0 server plugin configuration
 */
export interface OAuthPluginConfig {
    /** Base path for OAuth endpoints (default: /oauth) */
    basePath?: string;

    /** Issuer identifier for tokens */
    issuer: string;

    /** Audience for tokens */
    audience: string;
}

/**
 * Create the OAuth 2.0 server plugin
 */
export function oauthPlugin(pluginConfig: OAuthPluginConfig): APIForgePlugin {
    const basePath = pluginConfig.basePath ?? "/oauth";
    let tokenService: TokenService;
    let storage: StorageAdapter;
    let config: ResolvedConfig;

    return {
        name: "oauth",
        version: "0.1.0",

        async onInit(platform: PluginPlatformAPI) {
            config = platform.getConfig() as ResolvedConfig;
            storage = platform.getStorage() as StorageAdapter;

            // Initialize token service
            tokenService = new TokenService({
                issuer: pluginConfig.issuer,
                audience: pluginConfig.audience,
                accessTokenTTL: config.auth.tokens.accessToken.ttl ?? "15m",
                refreshTokenTTL: config.auth.tokens.refreshToken.ttl ?? "30d",
                algorithm: config.auth.tokens.accessToken.signing ?? "RS256",
                tokenFormat: config.auth.tokens.accessToken.format ?? "jwt",
            });

            await tokenService.initialize();
        },

        routes: [
            // Token endpoint
            {
                method: "POST",
                path: `${basePath}/token`,
                handler: async (ctx: APIForgeContext): Promise<APIForgeResponse> => {
                    const body = ctx.request.body as Record<string, unknown>;
                    const grantType = body.grant_type as string | undefined;

                    if (!grantType) {
                        const error = OAuthErrors.invalidRequest("Missing grant_type parameter");
                        return Response.json(400, error.toJSON());
                    }

                    const allowedScopes = Object.keys(config.auth.scopes);
                    const pkceRequired = config.auth.pkce.required as PKCERequirement;

                    switch (grantType) {
                        case "client_credentials":
                            return handleClientCredentialsGrant({
                                ctx,
                                storage,
                                tokenService,
                                allowedScopes,
                            });

                        case "authorization_code":
                            return handleAuthorizationCodeGrant({
                                ctx,
                                storage,
                                tokenService,
                                pkceRequired,
                            });

                        case "refresh_token":
                            return handleRefreshTokenGrant({
                                ctx,
                                storage,
                                tokenService,
                                rotateRefreshTokens: config.auth.tokens.refreshToken.rotation ?? true,
                                reuseDetection: config.auth.tokens.refreshToken.reuseDetection ?? true,
                            });

                        default:
                            const error = OAuthErrors.unsupportedGrantType(
                                `Grant type '${grantType}' is not supported`
                            );
                            return Response.json(400, error.toJSON());
                    }
                },
                metadata: {
                    description: "OAuth 2.0 token endpoint",
                    tags: ["oauth"],
                },
            },

            // Token revocation endpoint (RFC 7009)
            {
                method: "POST",
                path: `${basePath}/revoke`,
                handler: async (ctx: APIForgeContext): Promise<APIForgeResponse> => {
                    const body = ctx.request.body as Record<string, unknown>;
                    const token = body.token as string | undefined;

                    if (!token) {
                        const error = OAuthErrors.invalidRequest("Missing token parameter");
                        return Response.json(400, error.toJSON());
                    }

                    // Revoke the token (always returns success per RFC 7009)
                    await storage.revokeToken(token);

                    return Response.noContent();
                },
                metadata: {
                    description: "OAuth 2.0 token revocation endpoint",
                    tags: ["oauth"],
                },
            },

            // Token introspection endpoint (RFC 7662)
            {
                method: "POST",
                path: `${basePath}/introspect`,
                handler: async (ctx: APIForgeContext): Promise<APIForgeResponse> => {
                    const body = ctx.request.body as Record<string, unknown>;
                    const token = body.token as string | undefined;

                    if (!token) {
                        const error = OAuthErrors.invalidRequest("Missing token parameter");
                        return Response.json(400, error.toJSON());
                    }

                    // Look up the token
                    const tokenRecord = await storage.getToken(token);

                    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
                        return Response.json(200, { active: false });
                    }

                    return Response.json(200, {
                        active: true,
                        scope: tokenRecord.scopes.join(" "),
                        client_id: tokenRecord.clientId,
                        username: tokenRecord.userId,
                        token_type: "Bearer",
                        exp: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
                        iat: Math.floor(tokenRecord.createdAt.getTime() / 1000),
                    });
                },
                metadata: {
                    description: "OAuth 2.0 token introspection endpoint",
                    tags: ["oauth"],
                },
            },

            // JWKS endpoint
            {
                method: "GET",
                path: "/.well-known/jwks.json",
                handler: async (): Promise<APIForgeResponse> => {
                    const jwks = await tokenService.getJWKS();
                    return Response.json(200, jwks, {
                        "Cache-Control": "public, max-age=3600",
                    });
                },
                metadata: {
                    description: "JSON Web Key Set for token verification",
                    tags: ["oauth", "public"],
                },
            },

            // OAuth Server Metadata (RFC 8414)
            {
                method: "GET",
                path: "/.well-known/oauth-authorization-server",
                handler: async (): Promise<APIForgeResponse> => {
                    const metadata = {
                        issuer: pluginConfig.issuer,
                        authorization_endpoint: `${pluginConfig.issuer}${basePath}/authorize`,
                        token_endpoint: `${pluginConfig.issuer}${basePath}/token`,
                        revocation_endpoint: `${pluginConfig.issuer}${basePath}/revoke`,
                        introspection_endpoint: `${pluginConfig.issuer}${basePath}/introspect`,
                        jwks_uri: `${pluginConfig.issuer}/.well-known/jwks.json`,
                        response_types_supported: ["code"],
                        grant_types_supported: config.auth.grants,
                        token_endpoint_auth_methods_supported: [
                            "client_secret_basic",
                            "client_secret_post",
                        ],
                        scopes_supported: Object.keys(config.auth.scopes),
                        code_challenge_methods_supported: ["S256", "plain"],
                    };

                    return Response.json(200, metadata, {
                        "Cache-Control": "public, max-age=3600",
                    });
                },
                metadata: {
                    description: "OAuth 2.0 Authorization Server Metadata",
                    tags: ["oauth", "public"],
                },
            },
        ],

        async onRequest(ctx: APIForgeContext): Promise<APIForgeResponse | void> {
            // Skip OAuth endpoints
            if (ctx.request.path.startsWith(basePath) ||
                ctx.request.path.startsWith("/.well-known/")) {
                return;
            }

            // Check for Bearer token
            const authHeader = ctx.request.headers["authorization"];
            if (!authHeader?.startsWith("Bearer ")) {
                return; // Let the route handler decide if auth is required
            }

            const token = authHeader.slice(7);

            // Try JWT verification first
            const claims = await tokenService.verifyAccessToken(token);
            if (claims) {
                ctx.request.oauth = {
                    clientId: claims.client_id,
                    scopes: claims.scope.split(" "),
                    expiresAt: claims.exp * 1000,
                    ...(claims.user_id && { userId: claims.user_id }),
                };
                return;
            }

            // Fall back to database lookup (for opaque tokens)
            const tokenRecord = await storage.getToken(token);
            if (tokenRecord && !tokenRecord.isRevoked && tokenRecord.expiresAt > new Date()) {
                ctx.request.oauth = {
                    clientId: tokenRecord.clientId,
                    scopes: tokenRecord.scopes,
                    expiresAt: tokenRecord.expiresAt.getTime(),
                    ...(tokenRecord.userId && { userId: tokenRecord.userId }),
                };
                return;
            }

            // Token is invalid but don't fail here - let route handlers decide
            // if authentication is required
        },
    };
}

export { TokenService } from "./tokens";
export * from "./scopes";
export * from "./grants";
