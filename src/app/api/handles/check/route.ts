import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/apiError";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get("value") ?? "";
    const value = handleSchema.parse(raw);

    const existing = await db.handle.findUnique({ where: { value } });
    return NextResponse.json({ value, available: !existing });
  } catch (error) {
    return handleApiError(error);
  }
}
