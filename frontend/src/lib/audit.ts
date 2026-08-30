import { db } from "@/lib/db";

export async function logAudit(entry: {
  actorUserId?: string | null;
  organizationId?: string | null;
  agencyId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  priorStatus?: string;
  newStatus?: string;
  correlationId?: string;
}) {
  await db.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? undefined,
      organizationId: entry.organizationId ?? undefined,
      agencyId: entry.agencyId ?? undefined,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      priorStatus: entry.priorStatus,
      newStatus: entry.newStatus,
      correlationId: entry.correlationId,
    },
  });
}
