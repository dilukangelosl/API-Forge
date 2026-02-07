import type { Application, Request, Response, NextFunction } from "express";
import type {
    FrameworkAdapter,
    APIForgeRequest,
    APIForgeResponse,
    APIForgeHandler,
    APIForgeMiddleware,
    HttpMethod,
} from "@api-forge/core";

const ADAPTER_VERSION = "0.1.0";

/**
 * Create an Express adapter for API Forge
 */
export function expressAdapter(app: Application): FrameworkAdapter {
    return {
        name: "express",
        version: ADAPTER_VERSION,

        normalizeRequest(req: Request): APIForgeRequest {
            // Normalize headers to lowercase keys
            const headers: Record<string, string> = {};
            for (const [key, value] of Object.entries(req.headers)) {
                if (typeof value === "string") {
                    headers[key.toLowerCase()] = value;
                } else if (Array.isArray(value)) {
                    headers[key.toLowerCase()] = value.join(", ");
                }
            }

            // Get client IP
            const ip =
                (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
                req.socket.remoteAddress ||
                "127.0.0.1";

            return {
                method: req.method as HttpMethod,
                path: req.path,
                headers,
                query: normalizeQuery(req.query),
                params: req.params as Record<string, string>,
                body: req.body,
                ip,
                _originalRequest: req, // Include original Express request for session access
            };
        },

        sendResponse(res: Response, response: APIForgeResponse): void {
            // Set headers
            for (const [key, value] of Object.entries(response.headers)) {
                res.setHeader(key, value);
            }

            // Set status and send body
            res.status(response.status);

            if (response.body === null || response.body === undefined) {
                res.end();
            } else if (typeof response.body === "string") {
                res.send(response.body);
            } else {
                res.json(response.body);
            }
        },

        registerRoute(
            method: HttpMethod,
            path: string,
            handler: APIForgeHandler
        ): void {
            const expressMethod = method.toLowerCase() as keyof Application;
            const expressPath = convertPathToExpress(path);

            (app as any)[expressMethod](
                expressPath,
                async (req: Request, res: Response, next: NextFunction) => {
                    try {
                        const normalizedRequest = this.normalizeRequest(req);
                        // Copy path params from Express
                        normalizedRequest.params = req.params as Record<string, string>;

                        const response = await handler(normalizedRequest);
                        this.sendResponse(res, response);
                    } catch (error) {
                        next(error);
                    }
                }
            );
        },

        mountMiddleware(path: string, middleware: APIForgeMiddleware): void {
            const expressPath = convertPathToExpress(path);

            app.use(expressPath, async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const normalizedRequest = this.normalizeRequest(req);

                    const response = await middleware(normalizedRequest, async () => {
                        // If middleware calls next(), continue to actual route
                        return new Promise<APIForgeResponse>((resolve) => {
                            // This shouldn't be reached if middleware doesn't short-circuit
                            next();
                            resolve({
                                status: 200,
                                headers: {},
                                body: null,
                            });
                        });
                    });

                    // If middleware returns a response, send it
                    if (response.status !== 200 || response.body !== null) {
                        this.sendResponse(res, response);
                    }
                } catch (error) {
                    next(error);
                }
            });
        },

        serveStatic(path: string, directory: string): void {
            const express = require("express");
            app.use(path, express.static(directory));
        },

        getApp(): Application {
            return app;
        },
    };
}

/**
 * Convert API Forge path pattern to Express path pattern
 * API Forge uses :param syntax which is the same as Express
 */
function convertPathToExpress(path: string): string {
    // Express uses the same :param syntax, so minimal conversion needed
    // Just handle any edge cases
    return path;
}

/**
 * Normalize Express query object to flat string record
 */
function normalizeQuery(query: Request["query"]): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(query)) {
        if (typeof value === "string") {
            result[key] = value;
        } else if (Array.isArray(value)) {
            result[key] = value.filter((v): v is string => typeof v === "string");
        }
    }

    return result;
}

// Re-export for convenience
export type { Application as ExpressApp } from "express";
