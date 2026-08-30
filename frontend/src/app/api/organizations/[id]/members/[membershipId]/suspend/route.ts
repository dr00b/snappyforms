import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

export async function POST(
  _request: Request,
  { params }: { params: { id: string; membershipId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const adminMembership = await db.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: params.id, userId: session.userId } },
    });
    if (adminMembership?.role !== "ADMIN" || adminMembership.status !== "ACTIVE") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const target = await db.organizationMembership.update({
      where: { id: params.membershipId },
      data: { status: "SUSPENDED" },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: params.id,
      action: "member_suspended",
      targetType: "OrganizationMembership",
      targetId: target.id,
      priorStatus: "ACTIVE",
      newStatus: "SUSPENDED",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
