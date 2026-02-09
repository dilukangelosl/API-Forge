/**
 * Security audit logging for OAuth and API events
 * Provides structured logging for security-relevant actions
 */

/**
 * Security event types for audit logging
 */
export type SecurityEventType =
    | "token_issued"
    | "token_revoked"
    | "token_refresh"
    | "auth_failed"
    | "auth_success"
    | "client_created"
    | "client_updated"
    | "client_deleted"
    | "brute_force_detected"
    | "rate_limit_exceeded"
    | "consent_granted"
    | "consent_revoked";

/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
    /** Event type */
    event: SecurityEventType;
    /** Event timestamp */
    timestamp: Date;
    /** Client ID (if applicable) */
    clientId?: string;
    /** User ID (if applicable) */
    userId?: string;
    /** Client IP address */
    ip: string;
    /** User agent string */
    userAgent?: string;
    /** Request path */
    path?: string;
    /** Event outcome */
    outcome: "success" | "failure";
    /** Failure reason (if applicable) */
    reason?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
    /** Enable audit logging (default: true) */
    enabled?: boolean;
    /** Log to console (default: true in development) */
    console?: boolean;
    /** Custom log handler */
    handler?: (log: SecurityAuditLog) => void | Promise<void>;
    /** Events to log (default: all) */
    events?: SecurityEventType[];
}

/**
 * Security audit logger
 */
export class AuditLogger {
    private config: Required<Omit<AuditLoggerConfig, "handler">> & Pick<AuditLoggerConfig, "handler">;
    private logs: SecurityAuditLog[] = [];
    private maxInMemoryLogs = 1000;

    constructor(config: AuditLoggerConfig = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            console: config.console ?? process.env.NODE_ENV !== "production",
            handler: config.handler,
            events: config.events ?? [],
        };
    }

    /**
     * Log a security event
     */
    async log(log: Omit<SecurityAuditLog, "timestamp">): Promise<void> {
        if (!this.config.enabled) return;

        // Filter events if specific events are configured
        if (this.config.events.length > 0 && !this.config.events.includes(log.event)) {
            return;
        }

        const fullLog: SecurityAuditLog = {
            ...log,
            timestamp: new Date(),
        };

        // Console output
        if (this.config.console) {
            const icon = log.outcome === "success" ? "✓" : "✗";
            const level = log.outcome === "success" ? "info" : "warn";
            console[level](
                `[AUDIT] ${icon} ${log.event} | client=${log.clientId ?? "N/A"} ` +
                `user=${log.userId ?? "N/A"} ip=${log.ip} ${log.reason ? `reason="${log.reason}"` : ""}`
            );
        }

        // Custom handler
        if (this.config.handler) {
            await this.config.handler(fullLog);
        }

        // In-memory storage (circular buffer)
        this.logs.push(fullLog);
        if (this.logs.length > this.maxInMemoryLogs) {
            this.logs.shift();
        }
    }

    /**
     * Log a token issuance event
     */
    async tokenIssued(params: {
        clientId: string;
        userId?: string;
        ip: string;
        userAgent?: string;
        scopes: string[];
        grantType: string;
    }): Promise<void> {
        await this.log({
            event: "token_issued",
            clientId: params.clientId,
            userId: params.userId,
            ip: params.ip,
            userAgent: params.userAgent,
            outcome: "success",
            metadata: {
                scopes: params.scopes,
                grantType: params.grantType,
            },
        });
    }

    /**
     * Log a failed authentication attempt
     */
    async authFailed(params: {
        clientId?: string;
        ip: string;
        userAgent?: string;
        reason: string;
        path?: string;
    }): Promise<void> {
        await this.log({
            event: "auth_failed",
            clientId: params.clientId,
            ip: params.ip,
            userAgent: params.userAgent,
            path: params.path,
            outcome: "failure",
            reason: params.reason,
        });
    }

    /**
     * Log brute force detection
     */
    async bruteForceDetected(params: {
        clientId?: string;
        ip: string;
        attempts: number;
    }): Promise<void> {
        await this.log({
            event: "brute_force_detected",
            clientId: params.clientId,
            ip: params.ip,
            outcome: "failure",
            reason: `${params.attempts} failed attempts detected`,
        });
    }

    /**
     * Get recent logs (for debugging/admin)
     */
    getRecentLogs(limit: number = 100): SecurityAuditLog[] {
        return this.logs.slice(-limit);
    }

    /**
     * Get failed auth attempts for an identifier
     */
    getFailedAttempts(identifier: string, windowMs: number = 900000): number {
        const cutoff = new Date(Date.now() - windowMs);
        return this.logs.filter(
            (log) =>
                log.event === "auth_failed" &&
                (log.clientId === identifier || log.ip === identifier) &&
                log.timestamp > cutoff
        ).length;
    }
}

// Global audit logger instance
let globalAuditLogger: AuditLogger | null = null;

/**
 * Get or create the global audit logger
 */
export function getAuditLogger(config?: AuditLoggerConfig): AuditLogger {
    if (!globalAuditLogger) {
        globalAuditLogger = new AuditLogger(config);
    }
    return globalAuditLogger;
}

/**
 * Configure the global audit logger
 */
export function configureAuditLogger(config: AuditLoggerConfig): AuditLogger {
    globalAuditLogger = new AuditLogger(config);
    return globalAuditLogger;
}
