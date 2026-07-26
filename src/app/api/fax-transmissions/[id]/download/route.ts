import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const transmission = await db.faxTransmission.findUnique({ where: { id: params.id } });
  if (!transmission || transmission.sentByUserId !== session.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(transmission.pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fax-${transmission.confirmationNumber}.pdf"`,
    },
  });
}
