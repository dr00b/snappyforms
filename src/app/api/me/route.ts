import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const { user } = session;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      participant: user.participantProfile
        ? {
            displayName: user.participantProfile.displayName,
            handle: user.participantProfile.handle?.displayValue ?? null,
            qrId: user.participantProfile.qrIdentifier?.id ?? null,
            searchable: user.participantProfile.searchable,
          }
        : null,
      organizations: user.organizationMembers.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        handle: m.organization.handle?.displayValue ?? null,
        role: m.role,
        qrId: m.organization.qrIdentifier?.id ?? null,
        membershipDisplayName: m.displayName,
      })),
    },
  });
}
