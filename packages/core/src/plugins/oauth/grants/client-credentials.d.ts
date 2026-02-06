import type { APIForgeContext } from "../../../abstractions/context";
import type { APIForgeResponse } from "../../../abstractions/response";
import type { StorageAdapter } from "../../../abstractions/storage";
import type { TokenService } from "../tokens";
/**
 * Client credentials grant handler
 * RFC 6749 Section 4.4 - Client Credentials Grant
 * Used for machine-to-machine authentication
 */
export declare function handleClientCredentialsGrant(params: {
    ctx: APIForgeContext;
    storage: StorageAdapter;
    tokenService: TokenService;
    allowedScopes: string[];
}): Promise<APIForgeResponse>;
//# sourceMappingURL=client-credentials.d.ts.map