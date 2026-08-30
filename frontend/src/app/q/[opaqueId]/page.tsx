import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function QrRedirectPage({ params }: { params: { opaqueId: string } }) {
  const identifier = await db.qRIdentifier.findUnique({
    where: { id: params.opaqueId },
    include: {
      participantProfile: { include: { handle: true } },
      organization: { include: { handle: true } },
      location: { include: { organization: { include: { handle: true } } } },
      opportunity: true,
    },
  });

  if (!identifier || identifier.revokedAt) {
    notFound();
  }

  if (identifier.ownerType === "PARTICIPANT" && identifier.participantProfile?.handle) {
    redirect(`/u/${identifier.participantProfile.handle.displayValue}`);
  }

  if (identifier.ownerType === "ORGANIZATION" && identifier.organization?.handle) {
    redirect(`/o/${identifier.organization.handle.displayValue}`);
  }

  if (identifier.ownerType === "LOCATION" && identifier.location?.organization.handle) {
    redirect(`/o/${identifier.location.organization.handle.displayValue}`);
  }

  if (identifier.ownerType === "OPPORTUNITY" && identifier.opportunity) {
    redirect(`/opportunities/${identifier.opportunity.id}`);
  }

  notFound();
}
