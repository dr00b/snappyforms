import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const link = await db.shareLink.findUnique({ where: { id: params.token } });
  if (!link || link.resourceType !== "GENERATED_FORM") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (link.revokedAt || link.expiresAt < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const form = await db.generatedForm.findUnique({ where: { id: link.resourceId } });
  if (!form) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(form.pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="snappyforms-${form.templateKey.toLowerCase()}-${form.id}.pdf"`,
    },
  });
}
