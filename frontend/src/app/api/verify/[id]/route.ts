import { NextResponse } from "next/server";
import { getVerificationView } from "@/lib/verification";
import { checkRateLimit } from "@/lib/auth/rateLimit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(`verify:${ip}`, 60 * 1000, 20);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const view = await getVerificationView(params.id);
  return NextResponse.json({ view });
}
