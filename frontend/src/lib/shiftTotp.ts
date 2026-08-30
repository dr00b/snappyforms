import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Rotating shift codes, in the style of RFC 6238 (the TOTP scheme behind
// authenticator apps). The host's phone displays a code derived from the
// shift's secret and the current 30-second step; a volunteer's scan is only
// accepted if it carries a code from the same window. That is the whole
// proximity argument: the code cannot be forwarded ahead of time and is stale
// within seconds, so presenting one means the two people were together.
//
// RFC 6238 defaults to HMAC-SHA1; we use SHA-256 since we control both ends
// and nothing here has to interoperate with an authenticator app.

export const TOTP_STEP_SECONDS = 30;
/** 8 rather than the usual 6: the verify endpoint is online and unthrottled. */
export const TOTP_DIGITS = 8;
/** Accept the previous and next step too, covering clock skew and walk-up lag. */
export const TOTP_SKEW_STEPS = 1;

/** A per-shift secret. Stored on VolunteerOpportunity.totpSecret, never sent to a client. */
export function generateShiftSecret(): string {
  return randomBytes(32).toString("hex");
}

export function stepForTime(timeMs: number): number {
  return Math.floor(timeMs / 1000 / TOTP_STEP_SECONDS);
}

export function codeForStep(secretHex: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha256", Buffer.from(secretHex, "hex")).update(counter).digest();

  // RFC 4226 dynamic truncation: the low nibble of the last byte picks the
  // 4-byte window to read, so every digest bit can influence the output.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function currentCode(
  secretHex: string,
  timeMs: number = Date.now()
): { code: string; step: number; expiresAtMs: number } {
  const step = stepForTime(timeMs);
  return {
    code: codeForStep(secretHex, step),
    step,
    expiresAtMs: (step + 1) * TOTP_STEP_SECONDS * 1000,
  };
}

export type VerifyResult = { ok: true; matchedStep: number } | { ok: false };

export function verifyCode(
  secretHex: string,
  code: string,
  timeMs: number = Date.now()
): VerifyResult {
  if (!/^\d+$/.test(code) || code.length !== TOTP_DIGITS) return { ok: false };

  const current = stepForTime(timeMs);
  const candidate = Buffer.from(code, "utf8");

  for (let offset = -TOTP_SKEW_STEPS; offset <= TOTP_SKEW_STEPS; offset++) {
    const step = current + offset;
    const expected = Buffer.from(codeForStep(secretHex, step), "utf8");
    if (expected.length === candidate.length && timingSafeEqual(expected, candidate)) {
      return { ok: true, matchedStep: step };
    }
  }
  return { ok: false };
}

/**
 * The value stored on OpportunitySignup.codeHash: proof of which code was
 * accepted, without keeping the code itself (it would still be live for a few
 * seconds after the write).
 */
export function checkinCodeHash(opportunityId: string, matchedStep: number, code: string): string {
  return createHash("sha256").update(`${opportunityId}:${matchedStep}:${code}`).digest("hex");
}
