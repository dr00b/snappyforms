import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { advocacyMessageSchema } from "@/lib/validation";
import { placeholderRecipient } from "@/lib/advocacy";

// Records the draft locally so the demo can show it back. Nothing is sent —
// see src/lib/advocacy.ts for why the recipient is an unnamed sample office.
export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { zip, body, faxTransmissionId } = advocacyMessageSchema.parse(await request.json());
    const recipient = placeholderRecipient(zip);

    const message = await db.advocacyMessage.create({
      data: {
        userId: session.userId,
        faxTransmissionId,
        zip,
        recipientName: recipient.name,
        recipientOffice: recipient.office,
        body,
      },
    });

    return NextResponse.json({
      ok: true,
      id: message.id,
      recipientName: message.recipientName,
      recipientOffice: message.recipientOffice,
      createdAt: message.createdAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
