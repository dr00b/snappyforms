import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(request.url);
    const wantAll = url.searchParams.get("all") === "true";

    const session = await getCurrentSession();
    const requesterMembership = session
      ? await db.organizationMembership.findUnique({
          where: { organizationId_userId: { organizationId: params.id, userId: session.userId } },
        })
      : null;
    const isAdmin = requesterMembership?.role === "ADMIN" && requesterMembership.status === "ACTIVE";

    const memberships = await db.organizationMembership.findMany({
      where: {
        organizationId: params.id,
        status: wantAll && isAdmin ? undefined : { in: ["ACTIVE", "PENDING"] },
      },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });

    if (!wantAll || !isAdmin) {
      return NextResponse.json({
        members: memberships.map((m) => ({
          membershipId: m.id,
          displayName: m.displayName ?? m.user.email ?? "Member",
          role: m.role,
          status: m.status,
        })),
      });
    }

    // Admin accountability view: enrich with the trust-ledger + verification history.
    const enriched = await Promise.all(
      memberships.map(async (m) => {
        const [recordsVerified, disputes, lastSession] = await Promise.all([
          db.recordConfirmation.count({
            where: { confirmedByUserId: m.userId, action: "CONFIRMED", activityRecord: { organizationId: params.id } },
          }),
          db.recordDispute.count({ where: { activityRecord: { verifierMembershipId: m.id } } }),
          db.session.findFirst({ where: { userId: m.userId }, orderBy: { lastSeenAt: "desc" } }),
        ]);

        return {
          membershipId: m.id,
          displayName: m.displayName ?? m.user.email ?? "Member",
          role: m.role,
          status: m.status,
          email: m.user.email,
          joinedAt: m.joinedAt,
          recordsVerified,
          disputes,
          lastActiveAt: lastSession?.lastSeenAt ?? null,
          firstApprovalAt: m.firstApprovalAt,
          ratifiedAt: m.ratifiedAt,
          needsRatification: m.status === "PENDING" && Boolean(m.firstApprovalAt) && !m.ratifiedAt,
        };
      })
    );

    return NextResponse.json({ members: enriched });
  } catch (error) {
    return handleApiError(error);
  }
}
