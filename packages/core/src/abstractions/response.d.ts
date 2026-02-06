/**
 * Framework-agnostic response abstraction
 * Handlers return this interface, adapters translate to framework-specific responses
 */
export interface APIForgeResponse {
    /** HTTP status code */
    status: number;
    /** Response headers */
    headers: Record<string, string>;
    /** Response body (will be serialized based on content type) */
    body: unknown;
}
/**
 * Shorthand response creators
 */
export declare const Response: {
    ok<T>(body: T, headers?: Record<string, string>): APIForgeResponse;
    created<T>(body: T, headers?: Record<string, string>): APIForgeResponse;
    noContent(headers?: Record<string, string>): APIForgeResponse;
    badRequest(message: string, details?: unknown): APIForgeResponse;
    unauthorized(message?: string): APIForgeResponse;
    forbidden(message?: string): APIForgeResponse;
    notFound(message?: string): APIForgeResponse;
    tooManyRequests(retryAfter: number): APIForgeResponse;
    serverError(message?: string): APIForgeResponse;
    json<T>(status: number, body: T, headers?: Record<string, string>): APIForgeResponse;
    redirect(location: string, status?: 301 | 302 | 303 | 307 | 308): APIForgeResponse;
};
//# sourceMappingURL=response.d.ts.map