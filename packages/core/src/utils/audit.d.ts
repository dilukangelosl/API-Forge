/**
 * Security audit logging for OAuth and API events
 * Provides structured logging for security-relevant actions
 */
/**
 * Security event types for audit logging
 */
export type SecurityEventType = "token_issued" | "token_revoked" | "token_refresh" | "auth_failed" | "auth_success" | "client_created" | "client_updated" | "client_deleted" | "brute_force_detected" | "rate_limit_exceeded" | "consent_granted" | "consent_revoked";
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
export declare class AuditLogger {
    private config;
    private logs;
    private maxInMemoryLogs;
    constructor(config?: AuditLoggerConfig);
    /**
     * Log a security event
     */
    log(log: Omit<SecurityAuditLog, "timestamp">): Promise<void>;
    /**
     * Log a token issuance event
     */
    tokenIssued(params: {
        clientId: string;
        userId?: string;
        ip: string;
        userAgent?: string;
        scopes: string[];
        grantType: string;
    }): Promise<void>;
    /**
     * Log a failed authentication attempt
     */
    authFailed(params: {
        clientId?: string;
        ip: string;
        userAgent?: string;
        reason: string;
        path?: string;
    }): Promise<void>;
    /**
     * Log brute force detection
     */
    bruteForceDetected(params: {
        clientId?: string;
        ip: string;
        attempts: number;
    }): Promise<void>;
    /**
     * Get recent logs (for debugging/admin)
     */
    getRecentLogs(limit?: number): SecurityAuditLog[];
    /**
     * Get failed auth attempts for an identifier
     */
    getFailedAttempts(identifier: string, windowMs?: number): number;
}
/**
 * Get or create the global audit logger
 */
export declare function getAuditLogger(config?: AuditLoggerConfig): AuditLogger;
/**
 * Configure the global audit logger
 */
export declare function configureAuditLogger(config: AuditLoggerConfig): AuditLogger;
//# sourceMappingURL=audit.d.ts.map