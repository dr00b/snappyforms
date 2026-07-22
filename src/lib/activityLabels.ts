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
