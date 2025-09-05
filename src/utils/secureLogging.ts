/**
 * Secure logging utilities that sanitize sensitive data
 */

import { sanitizeForLogging } from './security';

/**
 * Enhanced developer logging that automatically sanitizes sensitive data
 */
export function createSecureDeveloperLog(isDeveloperMode: boolean) {
  return (...args: any[]) => {
    if (!isDeveloperMode) return;
    
    // Sanitize all arguments before logging
    const sanitizedArgs = args.map(arg => sanitizeForLogging(arg));
    console.log(...sanitizedArgs);
  };
}

/**
 * Audit logging for security events
 */
export class AuditLogger {
  private static instance: AuditLogger;
  
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }
  
  logSecurityEvent(event: {
    type: 'login' | 'logout' | 'password_reset' | 'permission_denied' | 'suspicious_activity';
    userId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: event.type,
      userId: event.userId || 'anonymous',
      details: sanitizeForLogging(event.details),
      ipAddress: event.ipAddress || 'unknown',
      userAgent: event.userAgent || 'unknown',
    };
    
    // In production, this should be sent to a secure logging service
    console.log('[SECURITY_AUDIT]', logEntry);
    
    // TODO: Send to external logging service (e.g., Supabase Edge Function)
    // this.sendToAuditService(logEntry);
  }
  
  private async sendToAuditService(logEntry: any): Promise<void> {
    // Implementation for sending to external audit service
    // This could be a Supabase Edge Function or external service like LogRocket, Sentry, etc.
  }
}

/**
 * Performance logging that doesn't expose sensitive data
 */
export function logPerformance(operation: string, startTime: number, metadata?: any): void {
  const duration = Date.now() - startTime;
  const sanitizedMetadata = sanitizeForLogging(metadata);
  
  console.log(`[PERFORMANCE] ${operation}: ${duration}ms`, sanitizedMetadata);
}

/**
 * Error logging that sanitizes error details
 */
export function logError(error: Error, context?: any): void {
  const sanitizedContext = sanitizeForLogging(context);
  
  console.error('[ERROR]', {
    message: error.message,
    stack: error.stack,
    context: sanitizedContext,
    timestamp: new Date().toISOString(),
  });
}