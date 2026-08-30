// Client-safe labels (no server-only imports) shared between API routes and UI.

export const STATUS_LABELS: Record<string, string> = {
  AWAITING_ORGANIZATION: "Awaiting organization",
  AWAITING_PARTICIPANT: "Awaiting participant",
  CHANGES_REQUESTED: "Changes requested",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  DISPUTED: "Disputed",
  SUPERSEDED: "Superseded",
  REVOKED: "Revoked",
};

export const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "muted" | "warning"> = {
  AWAITING_ORGANIZATION: "warning",
  AWAITING_PARTICIPANT: "warning",
  CHANGES_REQUESTED: "warning",
  CONFIRMED: "default",
  DECLINED: "muted",
  DISPUTED: "warning",
  SUPERSEDED: "muted",
  REVOKED: "muted",
};

export type ViewerRole = "participant" | "organization";

/**
 * "Needs action" is two different things wearing one name, which is what made
 * the tab look empty while work was outstanding (#6): a record submitted for
 * approval is still the participant's open item even though the next move is
 * not theirs. Splitting the statuses by who holds the ball lets the tab show
 * both without pretending the second group is actionable.
 *
 * The two roles are mirror images — one side's "your turn" is the other's
 * "waiting" — so they are defined together to stay that way.
 */
export const YOUR_TURN_STATUSES: Record<ViewerRole, string[]> = {
  participant: ["AWAITING_PARTICIPANT", "CHANGES_REQUESTED"],
  organization: ["AWAITING_ORGANIZATION"],
};

export const WAITING_ON_OTHERS_STATUSES: Record<ViewerRole, string[]> = {
  participant: ["AWAITING_ORGANIZATION"],
  organization: ["AWAITING_PARTICIPANT", "CHANGES_REQUESTED"],
};

export const FORM_CERT_STATUS_LABELS: Record<string, string> = {
  AWAITING_ORGANIZATION: "Awaiting certification",
  CHANGES_REQUESTED: "Changes requested",
  CERTIFIED: "Certified — ready to finalize",
  DECLINED: "Declined",
  FINALIZED: "Finalized",
};

export const FORM_CERT_STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "muted" | "warning"> = {
  AWAITING_ORGANIZATION: "warning",
  CHANGES_REQUESTED: "warning",
  CERTIFIED: "default",
  DECLINED: "muted",
  FINALIZED: "muted",
};

export const CATEGORY_LABELS: Record<string, string> = {
  WORK: "Work",
  VOLUNTEER: "Volunteer",
  EDUCATION: "Education",
  TRAINING: "Training",
  COMMUNITY_SERVICE: "Community service",
  OTHER: "Other",
};
