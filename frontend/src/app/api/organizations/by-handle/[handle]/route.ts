import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeHandle } from "@/lib/utils";

export async function GET(_request: Request, { params }: { params: { handle: string } }) {
  const handle = await db.handle.findUnique({
    where: { value: normalizeHandle(params.handle) },
    include: { organization: true },
  });

  if (!handle || handle.ownerType !== "ORGANIZATION" || !handle.organization) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ id: handle.organization.id, name: handle.organization.name });
}
