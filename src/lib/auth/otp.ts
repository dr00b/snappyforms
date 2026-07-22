import { randomInt, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { checkCooldown, checkRateLimit } from "@/lib/auth/rateLimit";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 45 * 1000;
export const HOURLY_REQUEST_LIMIT = 5;

export class OtpRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("Please wait before requesting another code.");
  }
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export type OtpPurpose = "LOGIN" | "MAGIC_LINK";
export type OtpChannel = "EMAIL" | "SMS";

export async function createVerificationCode(
  identifier: string,
  purpose: OtpPurpose,
  channel: OtpChannel
) {
  const cooldownKey = `otp-cooldown:${purpose}:${identifier}`;
  const cooldown = checkCooldown(cooldownKey, RESEND_COOLDOWN_MS);
  if (!cooldown.allowed) {
    throw new OtpRateLimitError(cooldown.retryAfterMs);
  }

  const rateLimitKey = `otp-hourly:${purpose}:${identifier}`;
  const rateLimit = checkRateLimit(rateLimitKey, 60 * 60 * 1000, HOURLY_REQUEST_LIMIT);
  if (!rateLimit.allowed) {
    throw new OtpRateLimitError(rateLimit.retryAfterMs ?? 60 * 60 * 1000);
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await db.verificationCode.create({
    data: {
      identifier,
      purpose,
      channel,
      codeHash: hashCode(code),
      expiresAt,
      maxAttempts: MAX_ATTEMPTS,
    },
  });

  return { code, expiresAt };
}

export type VerifyResult =
  | { success: true }
  | { success: false; reason: "not_found_or_expired" | "too_many_attempts" | "invalid_code" };

export async function verifyCode(
  identifier: string,
  purpose: OtpPurpose,
  code: string
): Promise<VerifyResult> {
  const record = await db.verificationCode.findFirst({
    where: { identifier, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { success: false, reason: "not_found_or_expired" };
  }

  if (record.attempts >= record.maxAttempts) {
    return { success: false, reason: "too_many_attempts" };
  }

  if (record.codeHash !== hashCode(code)) {
    await db.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { success: false, reason: "invalid_code" };
  }

  await db.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return { success: true };
}
