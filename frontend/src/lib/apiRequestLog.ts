import { db } from "@/lib/db";

/** Audit trail for the simulated external agency API — distinct from AuditLog
 * (which models human in-app state transitions), since this is keyed by a
 * machine apiClientId (nullable, since auth failures must still log a row) and
 * needs HTTP-shaped fields (method, statusCode). Called on every branch of the
 * agency-api route, success and failure alike. */
export async function logApiRequest(entry: {
  apiClientId?: string | null;
  clientIdAttempted?: string | null;
  endpoint: string;
  method: string;
  participantCaseId?: string | null;
  outcome: string;
  statusCode: number;
  responseSummary?: string;
}) {
  await db.aPIRequest.create({
    data: {
      apiClientId: entry.apiClientId ?? undefined,
      clientIdAttempted: entry.clientIdAttempted ?? undefined,
      endpoint: entry.endpoint,
      method: entry.method,
      participantCaseId: entry.participantCaseId ?? undefined,
      outcome: entry.outcome,
      statusCode: entry.statusCode,
      responseSummary: entry.responseSummary,
    },
  });
}
