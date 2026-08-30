import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participantOnboardingSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    if (session.user.participantProfile) {
      return NextResponse.json({ error: "profile_already_exists" }, { status: 409 });
    }

    const body = participantOnboardingSchema.parse(await request.json());

    const handleTaken = await db.handle.findUnique({ where: { value: body.handle } });
    if (handleTaken) {
      return NextResponse.json({ error: "handle_taken" }, { status: 409 });
    }

    const profile = await db.participantProfile.create({
      data: {
        userId: session.userId,
        displayName: body.displayName,
        bio: body.bio,
        searchable: true,
        handle: {
          create: { value: body.handle, displayValue: body.handle, ownerType: "PARTICIPANT" },
        },
        qrIdentifier: { create: { ownerType: "PARTICIPANT" } },
      },
      include: { handle: true },
    });

    await logAudit({
      actorUserId: session.userId,
      action: "account_creation",
      targetType: "ParticipantProfile",
      targetId: profile.id,
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return handleApiError(error);
  }
}
