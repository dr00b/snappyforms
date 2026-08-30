import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getAgencyAdminMembership } from "@/lib/agency";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const admin = await getAgencyAdminMembership(params.id, session.userId);
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }

    const [clients, recentRequests] = await Promise.all([
      db.aPIClient.findMany({ where: { agencyId: params.id }, orderBy: { createdAt: "asc" } }),
      db.aPIRequest.findMany({
        where: { apiClient: { agencyId: params.id } },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);

    return NextResponse.json({
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        clientId: c.clientId,
        scopes: JSON.parse(c.scopes) as string[],
        status: c.status,
        createdAt: c.createdAt,
      })),
      recentRequests: recentRequests.map((r) => ({
        id: r.id,
        endpoint: r.endpoint,
        method: r.method,
        outcome: r.outcome,
        statusCode: r.statusCode,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
