import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const org = await db.organization.findUnique({ where: { id: params.id } });
  if (!org) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: org.id,
    name: org.name,
    phone: org.phone,
    addressLine1: org.addressLine1,
    city: org.city,
    state: org.state,
    zip: org.zip,
  });
}
