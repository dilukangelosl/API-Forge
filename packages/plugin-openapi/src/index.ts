import type { APIForgePlugin, PluginPlatformAPI, RouteDefinition, APIForgeResponse } from "@api-forge/core";
import { Response } from "@api-forge/core";
import { generateOpenAPISpec } from "./generator";
import { getScalarUI } from "./viewer";

export interface OpenAPIPluginOptions {
    title?: string;
    version?: string;
    description?: string;
    servers?: Array<{ url: string; description?: string }>;
    contact?: { name?: string; email?: string; url?: string };
    license?: { name: string; url?: string };
    specPath?: string;
    docsPath?: string;
    includeOAuthEndpoints?: boolean;
}

/**
 * OpenAPI documentation plugin for API Forge
 */
export function openapiPlugin(options: OpenAPIPluginOptions = {}): APIForgePlugin {
    const specPath = options.specPath ?? "/.well-known/openapi.json";
    const docsPath = options.docsPath ?? "/docs";
    let platform: PluginPlatformAPI;
    let cachedSpec: object | null = null;

    return {
        name: "openapi",
        version: "1.0.0",

        onInit(p: PluginPlatformAPI): void {
            platform = p;

            // Register OpenAPI spec endpoint
            p.registerRoute({
                method: "GET",
                path: specPath,
                handler: async (): Promise<APIForgeResponse> => {
                    if (!cachedSpec) {
                        const allRoutes = platform.getRoutes();
                        const config = platform.getConfig() as { auth?: { issuer?: string; grants?: string[]; scopes?: Record<string, string> } };

                        cachedSpec = generateOpenAPISpec(allRoutes, {
                            title: options.title ?? "API Forge API",
                            version: options.version ?? "1.0.0",
                            description: options.description,
                            servers: options.servers ?? [
                                { url: config?.auth?.issuer ?? "http://localhost:3000", description: "API Server" }
                            ],
                            contact: options.contact,
                            license: options.license,
                            oauthFlows: config?.auth?.grants,
                            scopes: config?.auth?.scopes,
                            includeOAuthEndpoints: options.includeOAuthEndpoints ?? true,
                        });
                    }

                    return Response.json(200, cachedSpec, {
                        "Content-Type": "application/json",
                        "Cache-Control": "public, max-age=3600",
                    });
                },
                metadata: {
                    description: "OpenAPI 3.1 specification",
                    tags: ["Documentation"],
                },
            });

            // Register Docs UI endpoint
            p.registerRoute({
                method: "GET",
                path: docsPath,
                handler: async (): Promise<APIForgeResponse> => {
                    const html = getScalarUI({
                        specUrl: specPath,
                        title: options.title ?? "API Forge Documentation",
                    });

                    return {
                        status: 200,
                        headers: { "Content-Type": "text/html" },
                        body: html,
                    };
                },
                metadata: {
                    description: "Interactive API documentation",
                    tags: ["Documentation"],
                },
            });
        },
    };
}

export { generateOpenAPISpec } from "./generator";
export type { OpenAPIOptions } from "./generator";
