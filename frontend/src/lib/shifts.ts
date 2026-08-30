import type { VolunteerOpportunity } from "@prisma/client";

// Shared helpers for the rotating-QR shift flow. A "shift" is a
// VolunteerOpportunity that carries a totpSecret; the rest of the opportunity
// board is untouched by this feature.

/** Categories a shift-derived record can carry — the ones PA 1895 recognises. */
export const SHIFT_CATEGORIES = ["VOLUNTEER", "COMMUNITY_SERVICE"];

/**
 * Hours between two "HH:MM" times, to two decimals. Returns null if either
 * time is unparseable or the shift does not move forward. Overnight shifts are
 * out of scope: PA 1895 records one begin/end pair per calendar date.
 */
export function shiftHours(startTime?: string | null, endTime?: string | null): number | null {
  const start = parseHhMm(startTime);
  const end = parseHhMm(endTime);
  if (start === null || end === null || end <= start) return null;
  return Math.round(((end - start) / 60) * 100) / 100;
}

function parseHhMm(value?: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The category to stamp on a record minted from this shift. */
export function shiftCategory(opportunity: Pick<VolunteerOpportunity, "taskCategory">): string {
  const category = opportunity.taskCategory ?? "";
  return SHIFT_CATEGORIES.includes(category) ? category : "VOLUNTEER";
}

/** The shift detail a volunteer sees before confirming — never includes the secret. */
export function serializeShiftForVolunteer(
  opportunity: VolunteerOpportunity & { organization: { name: string } }
) {
  return {
    id: opportunity.id,
    title: opportunity.title,
    description: opportunity.description,
    organizationName: opportunity.organization.name,
    date: opportunity.date,
    startTime: opportunity.startTime,
    endTime: opportunity.endTime,
    totalHours: shiftHours(opportunity.startTime, opportunity.endTime),
    category: shiftCategory(opportunity),
    contactPerson: opportunity.contactPerson,
    remoteOrInPerson: opportunity.remoteOrInPerson,
  };
}
