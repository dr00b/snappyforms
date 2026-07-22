import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { OtpRateLimitError } from "@/lib/auth/otp";

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "invalid_input", details: error.flatten() },
      { status: 400 }
    );
  }
  if (error instanceof OtpRateLimitError) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: error.retryAfterMs },
      { status: 429 }
    );
  }
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (error instanceof Error && error.message.startsWith("Identifier must be")) {
    return NextResponse.json({ error: "invalid_identifier", message: error.message }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
}
