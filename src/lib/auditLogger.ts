/**
 * Audit Logger
 *
 * Helper functions for logging admin/system actions to AuditLog.
 */

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import AuditLog, { AuditAction, IAuditLog } from '@/models/AuditLog';

export interface LogActionParams {
  actor: string;
  actorType: 'admin' | 'client' | 'system';
  action: AuditAction;
  targetId?: string;
  details?: Record<string, unknown>;
  request?: NextRequest;
}

/**
 * Log an action to the audit log
 */
export async function logAction(params: LogActionParams): Promise<void> {
  const { actor, actorType, action, targetId, details = {}, request } = params;

  try {
    await connectDB();

    const logEntry: Partial<IAuditLog> = {
      actor,
      actorType,
      action,
      targetId,
      details,
    };

    // Extract IP and userAgent from request if provided
    if (request) {
      logEntry.ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      logEntry.userAgent = request.headers.get('user-agent') || 'unknown';
    }

    await AuditLog.create(logEntry);
  } catch (error) {
    // Don't throw — audit logging should never break the main flow
    console.error('Failed to log audit action:', error);
  }
}

/**
 * Log admin action (convenience wrapper)
 */
export async function logAdminAction(
  action: AuditAction,
  targetId?: string,
  details?: Record<string, unknown>,
  request?: NextRequest
): Promise<void> {
  return logAction({
    actor: 'admin',
    actorType: 'admin',
    action,
    targetId,
    details,
    request,
  });
}

/**
 * Log system action (convenience wrapper)
 */
export async function logSystemAction(
  action: AuditAction,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  return logAction({
    actor: 'system',
    actorType: 'system',
    action,
    targetId,
    details,
  });
}

/**
 * Log client action (convenience wrapper)
 */
export async function logClientAction(
  clientId: string,
  action: AuditAction,
  details?: Record<string, unknown>,
  request?: NextRequest
): Promise<void> {
  return logAction({
    actor: clientId,
    actorType: 'client',
    action,
    targetId: clientId,
    details,
    request,
  });
}
