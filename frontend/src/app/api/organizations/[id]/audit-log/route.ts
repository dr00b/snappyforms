import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const membership = await db.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: params.id, userId: session.userId } },
    });
    if (membership?.role !== "ADMIN" || membership.status !== "ACTIVE") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const entries = await db.auditLog.findMany({
      where: { organizationId: params.id },
      include: { actorUser: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        action: e.action,
        actor: e.actorUser?.email ?? e.actorUser?.phone ?? "System",
        targetType: e.targetType,
        targetId: e.targetId,
        priorStatus: e.priorStatus,
        newStatus: e.newStatus,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
