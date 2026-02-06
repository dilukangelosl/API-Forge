import type { APIForgeRequest } from "./request";
import type { StorageAdapter } from "./storage";
import type { ResolvedConfig } from "../core/config";

/**
 * Request context passed to handlers and middleware
 * Contains all information needed to process a request
 */
export interface APIForgeContext<TInput = unknown> {
    /** The normalized request */
    request: APIForgeRequest;

    /** Validated and typed input (from body/query based on endpoint definition) */
    input: TInput;

    /** Shared state across middleware pipeline */
    state: Map<string, unknown>;

    /** Storage adapter for persistence operations */
    storage: StorageAdapter;

    /** Resolved platform configuration */
    config: ResolvedConfig;
}

/**
 * Create a context for testing
 */
export function createContext<T = unknown>(
    request: APIForgeRequest,
    storage: StorageAdapter,
    config: ResolvedConfig,
    input?: T
): APIForgeContext<T> {
    return {
        request,
        input: input as T,
        state: new Map(),
        storage,
        config,
    };
}

/**
 * Type-safe state helpers
 */
export const ContextState = {
    set<T>(ctx: APIForgeContext, key: string, value: T): void {
        ctx.state.set(key, value);
    },

    get<T>(ctx: APIForgeContext, key: string): T | undefined {
        return ctx.state.get(key) as T | undefined;
    },

    has(ctx: APIForgeContext, key: string): boolean {
        return ctx.state.has(key);
    },
};
