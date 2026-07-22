import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ forms: [] });
    }

    const forms = await db.generatedForm.findMany({
      where: { participantProfileId: session.user.participantProfile.id },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      forms: forms.map((f) => ({
        id: f.id,
        templateKey: f.templateKey,
        organizationName: f.organization.name,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
