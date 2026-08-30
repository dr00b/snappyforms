import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({ handle: handleSchema });

const CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile?.handle) {
      return NextResponse.json({ error: "no_profile" }, { status: 400 });
    }

    const { handle } = schema.parse(await request.json());
    const current = session.user.participantProfile.handle;

    if (Date.now() - current.updatedAt.getTime() < CHANGE_COOLDOWN_MS) {
      return NextResponse.json({ error: "cooldown_active" }, { status: 429 });
    }

    if (handle === current.value) {
      return NextResponse.json({ error: "same_handle" }, { status: 400 });
    }

    const taken = await db.handle.findUnique({ where: { value: handle } });
    if (taken) {
      return NextResponse.json({ error: "handle_taken" }, { status: 409 });
    }

    await db.handle.update({
      where: { id: current.id },
      data: { value: handle, displayValue: handle },
    });

    return NextResponse.json({ ok: true, handle });
  } catch (error) {
    return handleApiError(error);
  }
}
