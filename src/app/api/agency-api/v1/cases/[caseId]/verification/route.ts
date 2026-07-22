import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/apiError";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { verifyPassword } from "@/lib/auth/password";
import { getCaseHoursView } from "@/lib/caseHours";
import { formatMaskedCaseNumber } from "@/lib/encryption";
import { logApiRequest } from "@/lib/apiRequestLog";

const REQUIRED_SCOPE = "cases:verification:read";

export async function POST(request: Request, { params }: { params: { caseId: string } }) {
  try {
    const endpoint = `/api/agency-api/v1/cases/${params.caseId}/verification`;
    const clientIdHeader = request.headers.get("x-verwovo-client-id");
    const clientSecretHeader = request.headers.get("x-verwovo-client-secret");

    const limit = checkRateLimit(`agency-api:${clientIdHeader ?? "anon"}`, 60 * 1000, 30);
    if (!limit.allowed) {
      await logApiRequest({
        clientIdAttempted: clientIdHeader,
        endpoint,
        method: "POST",
        outcome: "RATE_LIMITED",
        statusCode: 429,
      });
      return NextResponse.json(
        { error: "rate_limited", retryAfterMs: limit.retryAfterMs },
        { status: 429 }
      );
    }

    if (!clientIdHeader || !clientSecretHeader) {
      await logApiRequest({
        clientIdAttempted: clientIdHeader,
        endpoint,
        method: "POST",
        outcome: "AUTH_FAILED",
        statusCode: 401,
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const client = await db.aPIClient.findUnique({ where: { clientId: clientIdHeader } });
    if (!client || client.status !== "ACTIVE") {
      await logApiRequest({
        clientIdAttempted: clientIdHeader,
        endpoint,
        method: "POST",
        outcome: "AUTH_FAILED",
        statusCode: 401,
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const secretOk = await verifyPassword(clientSecretHeader, client.clientSecretHash);
    if (!secretOk) {
      await logApiRequest({
        apiClientId: client.id,
        endpoint,
        method: "POST",
        outcome: "AUTH_FAILED",
        statusCode: 401,
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const scopes: string[] = JSON.parse(client.scopes);
    if (!scopes.includes(REQUIRED_SCOPE)) {
      await logApiRequest({
        apiClientId: client.id,
        endpoint,
        method: "POST",
        outcome: "FORBIDDEN_SCOPE",
        statusCode: 403,
      });
      return NextResponse.json({ error: "forbidden_scope" }, { status: 403 });
    }

    const kase = await db.participantCase.findFirst({
      where: { id: params.caseId, agencyId: client.agencyId },
    });
    if (!kase) {
      await logApiRequest({
        apiClientId: client.id,
        endpoint,
        method: "POST",
        outcome: "NOT_FOUND",
        statusCode: 404,
      });
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const view = await getCaseHoursView(kase.id);
    if (view.status !== "ok") {
      await logApiRequest({
        apiClientId: client.id,
        endpoint,
        method: "POST",
        participantCaseId: kase.id,
        outcome: "NO_CONSENT",
        statusCode: 403,
      });
      return NextResponse.json({ error: "consent_required" }, { status: 403 });
    }

    const body = {
      caseReference: formatMaskedCaseNumber(kase.caseNumberLast4),
      hoursConfirmed: view.hoursConfirmed,
      hoursRequired: view.hoursRequired,
      meetsRequirement: view.meetsRequirement,
      windowStart: view.windowStart,
      windowEnd: view.windowEnd,
    };

    await logApiRequest({
      apiClientId: client.id,
      endpoint,
      method: "POST",
      participantCaseId: kase.id,
      outcome: "SUCCESS",
      statusCode: 200,
      responseSummary: JSON.stringify(body),
    });

    return NextResponse.json(body);
  } catch (error) {
    return handleApiError(error);
  }
}
