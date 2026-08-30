import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

// The live-audience demo model: instead of a handful of shared named accounts
// (which many attendees would clobber at once), every attendee mints their own
// throwaway identity. Participants log shifts against ONE shared organization;
// authorizers join that same organization as verifiers and confirm the queue.
// See DemoLoginButtons + /api/auth/demo-join.

export const DEMO_ORG_HANDLE = "live-demo";
export const DEMO_ORG_NAME = "Live Demo Organization";

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

/** Short, handle-safe id for an ephemeral guest, e.g. "g3f9k2a1b7". */
export function guestId() {
  return "g" + randomBytes(5).toString("hex");
}

/**
 * The single organization every "authorizer" guest joins and every
 * "participant" guest logs their shift against. Created lazily on first use and
 * reused thereafter. Race-safe: a concurrent create loses the Handle's unique
 * constraint and we re-read the winner.
 */
export async function getOrCreateDemoOrg() {
  const existing = await db.handle.findUnique({
    where: { value: DEMO_ORG_HANDLE },
    include: { organization: true },
  });
  if (existing?.organization) return existing.organization;

  try {
    const org = await db.organization.create({
      data: {
        name: DEMO_ORG_NAME,
        type: "NONPROFIT",
        primaryEmail: "hello@live-demo.local",
        city: "Harrisburg",
        state: "PA",
        zip: "17101",
      },
    });
    await db.handle.create({
      data: {
        value: DEMO_ORG_HANDLE,
        displayValue: DEMO_ORG_HANDLE,
        ownerType: "ORGANIZATION",
        organizationId: org.id,
      },
    });
    await db.qRIdentifier.create({ data: { ownerType: "ORGANIZATION", organizationId: org.id } });
    return org;
  } catch {
    const again = await db.handle.findUnique({
      where: { value: DEMO_ORG_HANDLE },
      include: { organization: true },
    });
    if (again?.organization) return again.organization;
    throw new Error("could_not_provision_demo_org");
  }
}

/** Mint a throwaway user with no usable credentials (login is by session cookie only). */
async function createGuestUser(label: string, id: string) {
  return db.user.create({
    data: { email: `${label}-${id}@demo.local` },
  });
}

/** A fresh, isolated participant. Returns the user + the handle to advertise. */
export async function createGuestParticipant() {
  const id = guestId();
  const user = await createGuestUser("guest-participant", id);
  const handleValue = `guest-${id}`;
  const profile = await db.participantProfile.create({
    data: {
      userId: user.id,
      displayName: `Demo Participant ${id.slice(1, 5)}`,
      searchable: true,
      handle: { create: { value: handleValue, displayValue: handleValue, ownerType: "PARTICIPANT" } },
      qrIdentifier: { create: { ownerType: "PARTICIPANT" } },
    },
  });
  return { user, profile, handleValue };
}

/** A fresh verifier in the shared demo org (ACTIVE MEMBER — verifier-eligible, not an admin). */
export async function createGuestAuthorizer() {
  const id = guestId();
  const org = await getOrCreateDemoOrg();
  const user = await createGuestUser("guest-authorizer", id);
  const membership = await db.organizationMembership.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      displayName: `Demo Verifier ${id.slice(1, 5)}`,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });
  return { user, org, membership };
}
