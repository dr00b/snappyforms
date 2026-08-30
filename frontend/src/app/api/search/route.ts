import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchQuerySchema } from "@/lib/validation";
import { handleApiError } from "@/lib/apiError";
import { getCurrentSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { q } = searchQuerySchema.parse({ q: url.searchParams.get("q") ?? "" });
    const needle = q.replace(/^@/, "");

    const [participants, organizations] = await Promise.all([
      db.participantProfile.findMany({
        where: {
          searchable: true,
          OR: [
            { displayName: { contains: needle, mode: "insensitive" } },
            { handle: { value: { contains: needle.toLowerCase() } } },
          ],
        },
        include: { handle: true },
        take: 20,
      }),
      db.organization.findMany({
        where: {
          OR: [
            { name: { contains: needle, mode: "insensitive" } },
            { handle: { value: { contains: needle.toLowerCase() } } },
          ],
        },
        include: { handle: true },
        take: 20,
      }),
    ]);

    const results = [
      ...participants
        .filter((p) => p.handle)
        .map((p) => ({
          type: "participant" as const,
          handle: p.handle!.displayValue,
          displayName: p.displayName,
          avatarColor: p.avatarColor,
        })),
      ...organizations
        .filter((o) => o.handle)
        .map((o) => ({
          type: "organization" as const,
          handle: o.handle!.displayValue,
          displayName: o.name,
          orgType: o.type,
        })),
    ];

    const session = await getCurrentSession();
    await logAudit({ actorUserId: session?.userId, action: "search", targetType: "query", targetId: needle });

    return NextResponse.json({ results });
  } catch (error) {
    return handleApiError(error);
  }
}
