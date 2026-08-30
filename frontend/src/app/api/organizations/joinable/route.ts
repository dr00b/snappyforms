import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!session.user.email) {
      return NextResponse.json({ organizations: [] });
    }

    const emailDomain = session.user.email.split("@")[1]?.toLowerCase();
    if (!emailDomain) {
      return NextResponse.json({ organizations: [] });
    }

    const domains = await db.organizationDomain.findMany({
      where: { domain: emailDomain, status: "VERIFIED" },
      include: { organization: { include: { handle: true } } },
    });

    const existingMemberships = await db.organizationMembership.findMany({
      where: { userId: session.userId, organizationId: { in: domains.map((d) => d.organizationId) } },
    });
    const alreadyMemberOf = new Set(existingMemberships.map((m) => m.organizationId));

    const organizations = domains
      .filter((d) => !alreadyMemberOf.has(d.organizationId))
      .map((d) => ({
        organizationId: d.organizationId,
        organizationName: d.organization.name,
        organizationHandle: d.organization.handle?.displayValue ?? null,
        allowAutoJoin: d.allowAutoJoin,
      }));

    return NextResponse.json({ organizations });
  } catch (error) {
    return handleApiError(error);
  }
}
