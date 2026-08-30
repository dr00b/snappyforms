import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { claimDomainSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { getOrgAdminMembership } from "@/lib/activity";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const admin = await getOrgAdminMembership(params.id, session.userId);
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }

    const domains = await db.organizationDomain.findMany({
      where: { organizationId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ domains });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const admin = await getOrgAdminMembership(params.id, session.userId);
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }

    const body = claimDomainSchema.parse(await request.json());

    const existing = await db.organizationDomain.findUnique({
      where: { organizationId_domain: { organizationId: params.id, domain: body.domain } },
    });
    if (existing) {
      return NextResponse.json({ error: "domain_already_claimed" }, { status: 409 });
    }

    const verificationToken = `snappyforms-verify=${randomBytes(12).toString("hex")}`;

    const domain = await db.organizationDomain.create({
      data: {
        organizationId: params.id,
        domain: body.domain,
        status: "PENDING",
        verificationToken,
        allowAutoJoin: body.allowAutoJoin,
      },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: params.id,
      action: "domain_claimed",
      targetType: "OrganizationDomain",
      targetId: domain.id,
      newStatus: "PENDING",
    });

    return NextResponse.json({ ok: true, domain });
  } catch (error) {
    return handleApiError(error);
  }
}
