import { describe, test, expect } from "bun:test";
import { Response } from "../src/abstractions/response";

describe("Response Helper", () => {
    describe("Success Responses", () => {
        test("ok should return 200 with data", () => {
            const res = Response.ok({ message: "success" });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: "success" });
        });

        test("created should return 201 with data", () => {
            const res = Response.created({ id: "123", name: "New Item" });

            expect(res.status).toBe(201);
            expect(res.body).toEqual({ id: "123", name: "New Item" });
        });

        test("noContent should return 204 with null body", () => {
            const res = Response.noContent();

            expect(res.status).toBe(204);
            expect(res.body).toBeNull();
        });

        test("json should return custom status with JSON body", () => {
            const res = Response.json(202, { status: "accepted" });

            expect(res.status).toBe(202);
            expect(res.body).toEqual({ status: "accepted" });
            expect(res.headers["Content-Type"]).toBe("application/json");
        });

        test("json should merge custom headers", () => {
            const res = Response.json(200, { data: "test" }, { "X-Custom": "header" });

            expect(res.headers["Content-Type"]).toBe("application/json");
            expect(res.headers["X-Custom"]).toBe("header");
        });
    });

    describe("Error Responses", () => {
        test("badRequest should return 400", () => {
            const res = Response.badRequest("Invalid input");

            expect(res.status).toBe(400);
            expect(res.body).toEqual({
                error: "bad_request",
                message: "Invalid input",
                details: undefined,
            });
        });

        test("unauthorized should return 401", () => {
            const res = Response.unauthorized("Token expired");

            expect(res.status).toBe(401);
            expect(res.body).toEqual({
                error: "unauthorized",
                message: "Token expired",
            });
        });

        test("forbidden should return 403", () => {
            const res = Response.forbidden("Access denied");

            expect(res.status).toBe(403);
            expect(res.body).toEqual({
                error: "forbidden",
                message: "Access denied",
            });
        });

        test("notFound should return 404", () => {
            const res = Response.notFound("User not found");

            expect(res.status).toBe(404);
            expect(res.body).toEqual({
                error: "not_found",
                message: "User not found",
            });
        });

        test("serverError should return 500", () => {
            const res = Response.serverError("Internal error");

            expect(res.status).toBe(500);
            expect(res.body).toEqual({
                error: "server_error",
                message: "Internal error",
            });
        });

        test("serverError should use default message", () => {
            const res = Response.serverError();

            expect(res.status).toBe(500);
            expect(res.body.message).toBe("Internal Server Error");
        });

        test("tooManyRequests should return 429 with Retry-After", () => {
            const res = Response.tooManyRequests(60);

            expect(res.status).toBe(429);
            expect(res.headers["Retry-After"]).toBe("60");
            expect(res.body.error).toBe("too_many_requests");
        });
    });

    describe("Redirect Responses", () => {
        test("redirect should return 302 with Location header", () => {
            const res = Response.redirect("https://example.com/callback");

            expect(res.status).toBe(302);
            expect(res.headers["Location"]).toBe("https://example.com/callback");
        });
    });
});
