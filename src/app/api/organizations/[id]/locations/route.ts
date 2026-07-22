import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createLocationSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { getOrgAdminMembership } from "@/lib/activity";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const locations = await db.organizationLocation.findMany({
      where: { organizationId: params.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ locations });
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

    const body = createLocationSchema.parse(await request.json());

    const location = await db.organizationLocation.create({
      data: {
        organizationId: params.id,
        name: body.name,
        addressLine1: body.addressLine1,
        city: body.city,
        state: body.state,
        zip: body.zip,
        phone: body.phone,
        qrIdentifier: { create: { ownerType: "LOCATION" } },
      },
      include: { qrIdentifier: true },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: params.id,
      action: "location_created",
      targetType: "OrganizationLocation",
      targetId: location.id,
    });

    return NextResponse.json({ ok: true, location });
  } catch (error) {
    return handleApiError(error);
  }
}
