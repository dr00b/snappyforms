import { db } from "@/lib/db";
import { isEmail, isPhone } from "@/lib/utils";

export function identifierChannel(identifier: string): "EMAIL" | "SMS" {
  if (isEmail(identifier)) return "EMAIL";
  if (isPhone(identifier)) return "SMS";
  throw new Error("Identifier must be a valid email address or phone number.");
}

export async function findOrCreateUserByIdentifier(identifier: string) {
  const channel = identifierChannel(identifier);
  const field = channel === "EMAIL" ? "email" : "phone";

  const existing = await db.user.findFirst({ where: { [field]: identifier } });
  if (existing) return existing;

  const authType = channel === "EMAIL" ? "EMAIL_OTP" : "SMS_OTP";

  return db.user.create({
    data: {
      [field]: identifier,
      authMethods: {
        create: [{ type: authType, identifier, verifiedAt: new Date() }],
      },
    },
  });
}

export async function loadIdentity(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      participantProfile: { include: { handle: true, qrIdentifier: true } },
      organizationMembers: {
        include: { organization: { include: { handle: true, qrIdentifier: true } } },
      },
      agencyMembers: { include: { agency: true } },
    },
  });
  return user;
}

export async function needsOnboarding(userId: string) {
  const identity = await loadIdentity(userId);
  if (!identity) return true;
  return (
    !identity.participantProfile &&
    identity.organizationMembers.length === 0 &&
    identity.agencyMembers.length === 0
  );
}
