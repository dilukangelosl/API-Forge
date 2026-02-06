import type { APIForgeContext } from "../../../abstractions/context";
import type { APIForgeResponse } from "../../../abstractions/response";
import type { StorageAdapter } from "../../../abstractions/storage";
import type { TokenService } from "../tokens";
/**
 * Token endpoint handler for authorization_code grant
 * RFC 6749 Section 4.1.3 - Access Token Request
 * RFC 7636 - PKCE Support
 */
export declare function handleAuthorizationCodeGrant(params: {
    ctx: APIForgeContext;
    storage: StorageAdapter;
    tokenService: TokenService;
    pkceRequired: "always" | "public_clients" | "never";
}): Promise<APIForgeResponse>;
//# sourceMappingURL=authorization-code.d.ts.map