import type { APIForgeContext } from "../../../abstractions/context";
import type { APIForgeResponse } from "../../../abstractions/response";
import type { StorageAdapter } from "../../../abstractions/storage";
import type { ResolvedConfig } from "../../../core/config";
/**
 * Authorization endpoint handler
 * RFC 6749 Section 4.1.1 - Authorization Request
 * RFC 7636 - PKCE Support
 */
export declare function handleAuthorizationRequest(params: {
    ctx: APIForgeContext;
    storage: StorageAdapter;
    config: ResolvedConfig;
    consentPageUrl: string;
}): Promise<APIForgeResponse>;
/**
 * Handle consent approval - issue authorization code and redirect
 */
export declare function handleConsentApproval(params: {
    storage: StorageAdapter;
    clientId: string;
    userId: string;
    redirectUri: string;
    scopes: string[];
    state?: string;
    codeChallenge?: string;
    codeChallengeMethod?: "S256" | "plain";
}): Promise<APIForgeResponse>;
/**
 * Handle consent denial - redirect with error
 */
export declare function handleConsentDenial(params: {
    redirectUri: string;
    state?: string;
}): APIForgeResponse;
//# sourceMappingURL=authorize.d.ts.map