import { Response } from "../../abstractions/response";
import { parseRateLimit } from "../../core/config";
/**
 * Create the rate limiting plugin
 */
export function rateLimitPlugin(config = {}) {
    const globalLimit = config.globalLimit ?? "1000/hour";
    const includeHeaders = config.includeHeaders ?? true;
    const keyPrefix = config.keyPrefix ?? "ratelimit";
    let storage;
    // Parse global limit at runtime per-request
    return {
        name: "rate-limit",
        version: "0.1.0",
        async onInit(platform) {
            storage = platform.getStorage();
        },
        async onRequest(ctx) {
            // Get identifier (client ID or IP)
            const identifier = ctx.request.oauth?.clientId ?? ctx.request.ip;
            // Get route-specific rate limit or use global
            const routeLimit = globalLimit; // TODO: get from route metadata
            const { requests: limit, windowMs } = parseRateLimit(routeLimit);
            // Build rate limit key
            const key = `${keyPrefix}:${identifier}:${ctx.request.path}`;
            // Increment counter
            const count = await storage.incrementRateLimit(key, windowMs);
            // Calculate reset time
            const resetTime = Math.ceil((Date.now() + windowMs) / 1000);
            const remaining = Math.max(0, limit - count);
            // Store rate limit info for response headers
            ctx.state.set("rateLimit", {
                limit,
                remaining,
                reset: resetTime,
            });
            // Check if rate limited
            if (count > limit) {
                const retryAfter = Math.ceil(windowMs / 1000);
                const response = Response.tooManyRequests(retryAfter);
                if (includeHeaders) {
                    response.headers["X-RateLimit-Limit"] = String(limit);
                    response.headers["X-RateLimit-Remaining"] = "0";
                    response.headers["X-RateLimit-Reset"] = String(resetTime);
                }
                return response;
            }
            // Continue to handler
            return;
        },
        async onResponse(ctx, response) {
            if (!includeHeaders)
                return;
            const info = ctx.state.get("rateLimit");
            if (!info)
                return;
            // Add rate limit headers to response
            response.headers["X-RateLimit-Limit"] = String(info.limit);
            response.headers["X-RateLimit-Remaining"] = String(info.remaining);
            response.headers["X-RateLimit-Reset"] = String(info.reset);
        },
    };
}
//# sourceMappingURL=index.js.map