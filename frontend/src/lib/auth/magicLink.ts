import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { checkCooldown } from "@/lib/auth/rateLimit";
import { OtpRateLimitError, CODE_TTL_MS } from "@/lib/auth/otp";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createMagicLinkToken(identifier: string) {
  const cooldown = checkCooldown(`magic-link-cooldown:${identifier}`, 45 * 1000);
  if (!cooldown.allowed) {
    throw new OtpRateLimitError(cooldown.retryAfterMs);
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await db.verificationCode.create({
    data: {
      identifier,
      purpose: "MAGIC_LINK",
      channel: "EMAIL",
      codeHash: hashToken(token),
      expiresAt,
      maxAttempts: 5,
    },
  });

  return { token, expiresAt };
}

export async function consumeMagicLinkToken(token: string) {
  const record = await db.verificationCode.findFirst({
    where: {
      purpose: "MAGIC_LINK",
      codeHash: hashToken(token),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return null;

  await db.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return record;
}
