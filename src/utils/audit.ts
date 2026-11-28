import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface LogAuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadataJson: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit logging must not crash the primary request flow
    console.warn('Gagal mencatat audit log:', err);
  }
}

export function runInBackground(label: string, task: () => Promise<unknown>): void {
  setImmediate(() => {
    void task().catch((err) => {
      console.warn(`[BG:${label}]`, err);
    });
  });
}

export function logAuditBackground(input: LogAuditInput): void {
  runInBackground(`audit:${input.action}`, () => logAudit(input));
}
