import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/apiError";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const category = url.searchParams.get("category")?.trim();
    const remoteOrInPerson = url.searchParams.get("remoteOrInPerson")?.trim();

    const opportunities = await db.volunteerOpportunity.findMany({
      where: {
        date: { gte: new Date(new Date().toDateString()) },
        ...(category ? { taskCategory: category } : {}),
        ...(remoteOrInPerson ? { remoteOrInPerson } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { organization: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { organization: { include: { handle: true } }, location: true, signups: true },
      orderBy: { date: "asc" },
      take: 100,
    });

    return NextResponse.json({
      opportunities: opportunities.map((o) => ({
        id: o.id,
        title: o.title,
        date: o.date,
        startTime: o.startTime,
        endTime: o.endTime,
        taskCategory: o.taskCategory,
        remoteOrInPerson: o.remoteOrInPerson,
        openings: o.openings,
        signedUpCount: o.signups.filter((s) => s.status !== "CANCELLED").length,
        organizationName: o.organization.name,
        organizationHandle: o.organization.handle?.displayValue ?? null,
        locationName: o.location?.name ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
