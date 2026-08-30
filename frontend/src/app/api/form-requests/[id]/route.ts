import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getVerifierEligibleMembership } from "@/lib/activity";
import { certifierActions, requesterActions, STATUS_LABELS } from "@/lib/formCertification";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const certRequest = await db.formCertificationRequest.findUnique({
      where: { id: params.id },
      include: {
        participantProfile: { include: { handle: true } },
        organization: { include: { handle: true } },
        verifierMembership: true,
        certifiedByUser: true,
        generatedForm: true,
      },
    });

    if (!certRequest) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const isRequester = session.userId === certRequest.requestedByUserId;
    const membership = await getVerifierEligibleMembership(certRequest.organizationId, session.userId);
    const isOrgMember = Boolean(membership);

    if (!isRequester && !isOrgMember) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const availableActions = isOrgMember
      ? certifierActions(certRequest.status)
      : isRequester
      ? requesterActions(certRequest.status)
      : [];

    return NextResponse.json({
      request: {
        ...certRequest,
        tasks: JSON.parse(certRequest.tasks) as string[],
        statusLabel: STATUS_LABELS[certRequest.status] ?? certRequest.status,
      },
      viewer: {
        isRequester,
        isOrgMember,
        isOrgAdmin: membership?.role === "ADMIN",
        availableActions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
