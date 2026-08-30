import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!session.user.email) {
      return NextResponse.json({ error: "verified_email_required" }, { status: 400 });
    }

    const existing = await db.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: params.id, userId: session.userId } },
    });
    if (existing) {
      return NextResponse.json({ error: "already_a_member" }, { status: 409 });
    }

    const emailDomain = session.user.email.split("@")[1]?.toLowerCase();
    const matchedDomain = await db.organizationDomain.findFirst({
      where: { organizationId: params.id, domain: emailDomain, status: "VERIFIED" },
    });
    if (!matchedDomain) {
      return NextResponse.json({ error: "no_matching_domain" }, { status: 400 });
    }

    const status = matchedDomain.allowAutoJoin ? "PENDING" : "REQUESTED";
    const displayName = session.user.participantProfile?.displayName ?? session.user.email.split("@")[0];

    const membership = await db.organizationMembership.create({
      data: { organizationId: params.id, userId: session.userId, role: "MEMBER", status, displayName },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: params.id,
      action: status === "PENDING" ? "member_auto_joined" : "member_join_requested",
      targetType: "OrganizationMembership",
      targetId: membership.id,
      newStatus: status,
    });

    const admins = await db.organizationMembership.findMany({
      where: { organizationId: params.id, role: "ADMIN", status: "ACTIVE" },
    });
    for (const admin of admins) {
      await notifyUser(admin.userId, {
        type: "VERIFICATION_REQUESTED",
        title: status === "PENDING" ? "New member auto-joined" : "New membership request",
        body:
          status === "PENDING"
            ? `${displayName} auto-joined via verified domain ${matchedDomain.domain} and can begin verifying activity.`
            : `${displayName} requested to join using ${matchedDomain.domain}. Review and approve from the Members tab.`,
      });
    }

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return handleApiError(error);
  }
}
