import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizationOnboardingSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body = organizationOnboardingSchema.parse(await request.json());

    const handleTaken = await db.handle.findUnique({ where: { value: body.handle } });
    if (handleTaken) {
      return NextResponse.json({ error: "handle_taken" }, { status: 409 });
    }

    const domain = body.primaryEmail.split("@")[1];
    const creatorDisplayName =
      session.user.participantProfile?.displayName ?? session.user.email?.split("@")[0] ?? "Admin";

    const organization = await db.organization.create({
      data: {
        name: body.name,
        type: body.type,
        primaryEmail: body.primaryEmail,
        website: body.website || undefined,
        phone: body.phone,
        addressLine1: body.addressLine1,
        city: body.city,
        state: body.state,
        zip: body.zip,
        taxStatus: body.taxStatus,
        einDemo: body.einDemo,
        domain,
        handle: {
          create: { value: body.handle, displayValue: body.handle, ownerType: "ORGANIZATION" },
        },
        qrIdentifier: { create: { ownerType: "ORGANIZATION" } },
        memberships: {
          create: {
            userId: session.userId,
            role: "ADMIN",
            status: "ACTIVE",
            displayName: creatorDisplayName,
          },
        },
      },
      include: { handle: true },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: organization.id,
      action: "organization_creation",
      targetType: "Organization",
      targetId: organization.id,
    });

    return NextResponse.json({ ok: true, organization });
  } catch (error) {
    return handleApiError(error);
  }
}
