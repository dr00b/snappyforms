import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_SALT = "snappyforms-case-data-v1";

// Dev-only fallback so a fresh clone can still run `npm run db:seed` without
// extra setup. Never rely on this outside a local sandbox — set
// CASE_DATA_ENCRYPTION_KEY in any real environment.
const DEV_FALLBACK_SECRET = "snappyforms-dev-only-case-data-key-do-not-use-in-prod";

function getKey(): Buffer {
  const secret = process.env.CASE_DATA_ENCRYPTION_KEY;
  if (!secret) {
    console.warn(
      "[encryption] CASE_DATA_ENCRYPTION_KEY not set — using an insecure dev-only fallback key."
    );
  }
  return scryptSync(secret ?? DEV_FALLBACK_SECRET, KEY_SALT, 32);
}

/** Encrypts a raw case number for storage in ParticipantCase.caseNumberEncrypted. */
export function encryptCaseNumber(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/** Decrypts ParticipantCase.caseNumberEncrypted. Call only from the audit-logged reveal action. */
export function decryptCaseNumber(packed: string): string {
  const [ivHex, authTagHex, ciphertextHex] = packed.split(":");
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/** Last 4 characters, stored in plaintext alongside the ciphertext for masked display. */
export function caseNumberLast4(plaintext: string): string {
  return plaintext.slice(-4);
}

/** Renders a stored last-4 fragment as a masked display string, e.g. "•••• 4821". */
export function formatMaskedCaseNumber(last4: string): string {
  return `•••• ${last4}`;
}
