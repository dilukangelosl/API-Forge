/**
 * Create a context for testing
 */
export function createContext(request, storage, config, input) {
    return {
        request,
        input: input,
        state: new Map(),
        storage,
        config,
    };
}
/**
 * Type-safe state helpers
 */
export const ContextState = {
    set(ctx, key, value) {
        ctx.state.set(key, value);
    },
    get(ctx, key) {
        return ctx.state.get(key);
    },
    has(ctx, key) {
        return ctx.state.has(key);
    },
};
//# sourceMappingURL=context.js.map