import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session?.user.participantProfile) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const form = await db.generatedForm.findUnique({ where: { id: params.id } });
  if (!form || form.participantProfileId !== session.user.participantProfile.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(form.pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="verwovo-${form.templateKey.toLowerCase()}-${form.id}.pdf"`,
    },
  });
}
