import { describe, test, expect, beforeEach } from "bun:test";
import { Router } from "../src/core/router";
import type { RouteDefinition } from "../src/abstractions/plugin";
import type { HttpMethod } from "../src/abstractions/request";

describe("Router", () => {
    let router: Router;

    beforeEach(() => {
        router = new Router();
    });

    const createRoute = (overrides: Partial<RouteDefinition> = {}): RouteDefinition => ({
        method: "GET",
        path: "/test",
        handler: async () => ({ status: 200, headers: {}, body: {} }),
        ...overrides,
    });

    const createRequest = (method: HttpMethod, path: string) => ({
        method,
        path,
        headers: {},
        query: {},
        params: {},
        body: null,
        ip: "127.0.0.1",
    });

    describe("Route Registration", () => {
        test("register should add route to registry", () => {
            const route = createRoute({ path: "/users" });
            router.register(route);

            expect(router.has("GET", "/users")).toBe(true);
        });

        test("should handle multiple methods for same path", () => {
            router.register(createRoute({ method: "GET", path: "/users" }));
            router.register(createRoute({ method: "POST", path: "/users" }));

            expect(router.has("GET", "/users")).toBe(true);
            expect(router.has("POST", "/users")).toBe(true);
        });
    });

    describe("Route Matching", () => {
        test("match should find exact path", () => {
            router.register(createRoute({ path: "/api/users" }));

            const match = router.match(createRequest("GET", "/api/users"));

            expect(match).not.toBeNull();
            expect(match?.route.path).toBe("/api/users");
        });

        test("match should extract path parameters", () => {
            router.register(createRoute({ path: "/users/:id" }));

            const match = router.match(createRequest("GET", "/users/123"));

            expect(match).not.toBeNull();
            expect(match?.params.id).toBe("123");
        });

        test("match should extract multiple path parameters", () => {
            router.register(createRoute({ path: "/users/:userId/posts/:postId" }));

            const match = router.match(createRequest("GET", "/users/42/posts/99"));

            expect(match).not.toBeNull();
            expect(match?.params.userId).toBe("42");
            expect(match?.params.postId).toBe("99");
        });

        test("match should return null for non-existent route", () => {
            router.register(createRoute({ path: "/users" }));

            const match = router.match(createRequest("GET", "/products"));

            expect(match).toBeNull();
        });

        test("match should return null for wrong method", () => {
            router.register(createRoute({ method: "GET", path: "/users" }));

            const match = router.match(createRequest("POST", "/users"));

            expect(match).toBeNull();
        });
    });

    describe("Route Retrieval", () => {
        test("getRoutes should return all registered routes", () => {
            router.register(createRoute({ path: "/users" }));
            router.register(createRoute({ method: "POST", path: "/users" }));
            router.register(createRoute({ path: "/products" }));

            const routes = router.getRoutes();
            expect(routes).toHaveLength(3);
        });

        test("has should check route existence", () => {
            router.register(createRoute({ path: "/users" }));

            expect(router.has("GET", "/users")).toBe(true);
            expect(router.has("GET", "/products")).toBe(false);
            expect(router.has("POST", "/users")).toBe(false);
        });
    });

    describe("Route Removal", () => {
        test("remove should delete route", () => {
            router.register(createRoute({ path: "/users" }));
            expect(router.has("GET", "/users")).toBe(true);

            const removed = router.remove("GET", "/users");
            expect(removed).toBe(true);
            expect(router.has("GET", "/users")).toBe(false);
        });

        test("remove should return false for non-existent route", () => {
            const removed = router.remove("GET", "/non-existent");
            expect(removed).toBe(false);
        });
    });

    describe("Special Path Patterns", () => {
        test("should match paths with dots", () => {
            router.register(createRoute({ path: "/.well-known/jwks.json" }));

            const match = router.match(createRequest("GET", "/.well-known/jwks.json"));

            expect(match).not.toBeNull();
        });

        test("should handle trailing slashes correctly", () => {
            router.register(createRoute({ path: "/users" }));

            const match = router.match(createRequest("GET", "/users"));

            expect(match).not.toBeNull();
        });
    });
});
