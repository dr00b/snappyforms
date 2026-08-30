import { db } from "@/lib/db";

/** Active agency membership, or null. Agencies are seed-only (no self-service join), so
 * unlike organization membership there is no PENDING/REQUESTED trust model to account for. */
export async function getAgencyMembership(agencyId: string, userId: string) {
  return db.agencyMembership.findFirst({
    where: { agencyId, userId, status: "ACTIVE" },
  });
}

/** Active admin membership, or null — gates the API console and case-number reveal action. */
export async function getAgencyAdminMembership(agencyId: string, userId: string) {
  const membership = await getAgencyMembership(agencyId, userId);
  return membership?.role === "ADMIN" ? membership : null;
}
