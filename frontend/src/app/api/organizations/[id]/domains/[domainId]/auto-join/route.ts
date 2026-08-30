import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { getOrgAdminMembership } from "@/lib/activity";

const schema = z.object({ allowAutoJoin: z.boolean() });

export async function POST(request: Request, { params }: { params: { id: string; domainId: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const admin = await getOrgAdminMembership(params.id, session.userId);
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }

    const { allowAutoJoin } = schema.parse(await request.json());

    const domain = await db.organizationDomain.findFirst({
      where: { id: params.domainId, organizationId: params.id },
    });
    if (!domain) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const updated = await db.organizationDomain.update({
      where: { id: domain.id },
      data: { allowAutoJoin },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: params.id,
      action: allowAutoJoin ? "domain_auto_join_enabled" : "domain_auto_join_disabled",
      targetType: "OrganizationDomain",
      targetId: domain.id,
    });

    return NextResponse.json({ ok: true, domain: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
