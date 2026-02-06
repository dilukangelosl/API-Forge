import type { RouteDefinition } from "@api-forge/core";

export interface OpenAPIOptions {
    title: string;
    version: string;
    description?: string;
    servers?: Array<{ url: string; description?: string }>;
    contact?: { name?: string; email?: string; url?: string };
    license?: { name: string; url?: string };
    oauthFlows?: string[];
    scopes?: Record<string, string>;
    includeOAuthEndpoints?: boolean;
}

interface OpenAPISpec {
    openapi: string;
    info: {
        title: string;
        version: string;
        description?: string;
        contact?: { name?: string; email?: string; url?: string };
        license?: { name: string; url?: string };
    };
    servers: Array<{ url: string; description?: string }>;
    paths: Record<string, Record<string, PathItem>>;
    components: {
        securitySchemes?: Record<string, SecurityScheme>;
        schemas?: Record<string, object>;
    };
    security?: Array<Record<string, string[]>>;
    tags?: Array<{ name: string; description?: string }>;
}

interface PathItem {
    summary?: string;
    description?: string;
    operationId?: string;
    tags?: string[];
    parameters?: Parameter[];
    requestBody?: RequestBody;
    responses: Record<string, ResponseObject>;
    security?: Array<Record<string, string[]>>;
}

interface Parameter {
    name: string;
    in: "path" | "query" | "header" | "cookie";
    required?: boolean;
    description?: string;
    schema: { type: string };
}

interface RequestBody {
    required?: boolean;
    content: Record<string, { schema: object }>;
}

interface ResponseObject {
    description: string;
    content?: Record<string, { schema: object }>;
}

interface SecurityScheme {
    type: string;
    scheme?: string;
    bearerFormat?: string;
    flows?: Record<string, OAuthFlow>;
}

interface OAuthFlow {
    authorizationUrl?: string;
    tokenUrl?: string;
    scopes: Record<string, string>;
}

/**
 * Generate OpenAPI 3.1 specification from route definitions
 */
export function generateOpenAPISpec(routes: RouteDefinition[], options: OpenAPIOptions): OpenAPISpec {
    const spec: OpenAPISpec = {
        openapi: "3.1.0",
        info: {
            title: options.title,
            version: options.version,
            ...(options.description && { description: options.description }),
            ...(options.contact && { contact: options.contact }),
            ...(options.license && { license: options.license }),
        },
        servers: options.servers ?? [{ url: "http://localhost:3000" }],
        paths: {},
        components: {
            securitySchemes: {},
            schemas: {},
        },
        tags: [],
    };

    // Add OAuth security schemes
    if (options.oauthFlows?.length) {
        const flows: Record<string, OAuthFlow> = {};

        if (options.oauthFlows.includes("authorization_code")) {
            flows.authorizationCode = {
                authorizationUrl: "/oauth/authorize",
                tokenUrl: "/oauth/token",
                scopes: options.scopes ?? {},
            };
        }

        if (options.oauthFlows.includes("client_credentials")) {
            flows.clientCredentials = {
                tokenUrl: "/oauth/token",
                scopes: options.scopes ?? {},
            };
        }

        spec.components.securitySchemes!["oauth2"] = {
            type: "oauth2",
            flows,
        };

        spec.components.securitySchemes!["bearerAuth"] = {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
        };
    }

    // Collect unique tags
    const tagSet = new Set<string>();

    // Process routes
    for (const route of routes) {
        // Skip /oauth endpoints if not including them
        if (!options.includeOAuthEndpoints && route.path.startsWith("/oauth")) {
            continue;
        }

        // Convert :param to {param} for OpenAPI
        const openApiPath = route.path.replace(/:(\w+)/g, "{$1}");
        const method = route.method.toLowerCase();

        if (!spec.paths[openApiPath]) {
            spec.paths[openApiPath] = {};
        }

        // Extract path parameters
        const pathParams: Parameter[] = [];
        const paramMatches = route.path.matchAll(/:(\w+)/g);
        for (const match of paramMatches) {
            if (match[1]) {
                pathParams.push({
                    name: match[1],
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                });
            }
        }

        // Get tags from metadata
        const tags = (route.metadata?.tags as string[] | undefined) ?? ["default"];
        for (const tag of tags) {
            tagSet.add(tag);
        }

        // Check if endpoint requires auth
        const scopes = (route.metadata?.scopes as string[] | undefined) ?? [];
        const requiresAuth = scopes.length > 0;

        const pathItem: PathItem = {
            operationId: generateOperationId(method, route.path),
            tags,
            ...(route.metadata?.description && { summary: route.metadata.description as string }),
            ...(pathParams.length > 0 && { parameters: pathParams }),
            responses: {
                "200": {
                    description: "Successful response",
                },
                ...(requiresAuth && {
                    "401": { description: "Unauthorized - Missing or invalid token" },
                    "403": { description: "Forbidden - Insufficient scopes" },
                }),
            },
        };

        // Add security requirement if scopes defined
        if (requiresAuth) {
            pathItem.security = [
                { oauth2: scopes },
                { bearerAuth: [] },
            ];
        }

        spec.paths[openApiPath][method] = pathItem;
    }

    // Add collected tags
    spec.tags = Array.from(tagSet).map(name => ({ name }));

    return spec;
}

/**
 * Generate operation ID from method and path
 */
function generateOperationId(method: string, path: string): string {
    const normalized = path
        .replace(/^\/+/, "")
        .replace(/:(\w+)/g, "By$1")
        .split("/")
        .map((part, i) => i === 0 ? part : capitalize(part))
        .join("");

    return method.toLowerCase() + capitalize(normalized || "root");
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
