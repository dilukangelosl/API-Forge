/**
 * Create a minimal request for testing
 */
export function createRequest(overrides = {}) {
    return {
        method: "GET",
        path: "/",
        headers: {},
        query: {},
        params: {},
        body: undefined,
        ip: "127.0.0.1",
        ...overrides,
    };
}
//# sourceMappingURL=request.js.map