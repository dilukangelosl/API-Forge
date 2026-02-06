import type { APIForgeContext } from "../../../abstractions/context";
import type { APIForgeResponse } from "../../../abstractions/response";
import type { StorageAdapter } from "../../../abstractions/storage";
import type { TokenService } from "../tokens";
/**
 * Refresh token grant handler
 * RFC 6749 Section 6 - Refreshing an Access Token
 */
export declare function handleRefreshTokenGrant(params: {
    ctx: APIForgeContext;
    storage: StorageAdapter;
    tokenService: TokenService;
    rotateRefreshTokens: boolean;
    reuseDetection: boolean;
}): Promise<APIForgeResponse>;
//# sourceMappingURL=refresh-token.d.ts.map