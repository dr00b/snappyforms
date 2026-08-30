export { FORM_CERT_STATUS_LABELS as STATUS_LABELS } from "@/lib/activityLabels";

/** Actions an organization rep may take on a request in its current status. */
export function certifierActions(status: string): string[] {
  switch (status) {
    case "AWAITING_ORGANIZATION":
      return ["certify", "decline", "request-changes"];
    default:
      return [];
  }
}

/** Actions the requesting participant may take on a request in its current status. */
export function requesterActions(status: string): string[] {
  switch (status) {
    case "CHANGES_REQUESTED":
      return ["resubmit"];
    case "CERTIFIED":
      return ["finalize"];
    default:
      return [];
  }
}
