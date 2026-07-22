import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { getOrgAdminMembership } from "@/lib/activity";

export async function POST(_request: Request, { params }: { params: { id: string; domainId: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const admin = await getOrgAdminMembership(params.id, session.userId);
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }

    const domain = await db.organizationDomain.findFirst({
      where: { id: params.domainId, organizationId: params.id },
    });
    if (!domain) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (domain.status === "VERIFIED") {
      return NextResponse.json({ ok: true, domain });
    }

    const updated = await db.organizationDomain.update({
      where: { id: domain.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: params.id,
      action: "domain_verified",
      targetType: "OrganizationDomain",
      targetId: domain.id,
      priorStatus: "PENDING",
      newStatus: "VERIFIED",
    });

    return NextResponse.json({ ok: true, domain: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
