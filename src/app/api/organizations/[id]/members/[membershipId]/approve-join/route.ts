import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getOrgAdminMembership } from "@/lib/activity";

export async function POST(_request: Request, { params }: { params: { id: string; membershipId: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const admin = await getOrgAdminMembership(params.id, session.userId);
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }

    const target = await db.organizationMembership.findFirst({
      where: { id: params.membershipId, organizationId: params.id },
    });
    if (!target || target.status !== "REQUESTED") {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    await db.organizationMembership.update({ where: { id: target.id }, data: { status: "PENDING" } });

    await logAudit({
      actorUserId: session.userId,
      organizationId: params.id,
      action: "member_join_approved",
      targetType: "OrganizationMembership",
      targetId: target.id,
      priorStatus: "REQUESTED",
      newStatus: "PENDING",
    });

    await notifyUser(target.userId, {
      type: "VERIFICATION_CONFIRMED",
      title: "Membership approved",
      body: "Your membership request was approved. You can now review and confirm activity records.",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
