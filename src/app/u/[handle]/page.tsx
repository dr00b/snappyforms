import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { generateQrDataUrl, qrTargetUrl } from "@/lib/qr";
import { getCurrentSession } from "@/lib/auth/session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { initials, normalizeHandle } from "@/lib/utils";

export default async function ParticipantProfilePage({ params }: { params: { handle: string } }) {
  const value = normalizeHandle(params.handle);
  const handle = await db.handle.findUnique({
    where: { value },
    include: { participantProfile: { include: { qrIdentifier: true } } },
  });

  if (!handle || handle.ownerType !== "PARTICIPANT" || !handle.participantProfile) {
    notFound();
  }

  const profile = handle.participantProfile;
  const qrImage = profile.qrIdentifier
    ? await generateQrDataUrl(qrTargetUrl(profile.qrIdentifier.id))
    : null;
  const session = await getCurrentSession();
  const canCreateRecord = Boolean(session?.user.organizationMembers.some((m) => m.status === "ACTIVE"));

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <Link href="/search" className="text-sm text-muted-foreground">
        ← Back
      </Link>

      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-xl">{initials(profile.displayName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xl font-bold">{profile.displayName}</p>
          <p className="text-sm text-muted-foreground">@{handle.displayValue}</p>
        </div>
      </div>

      {qrImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrImage} alt="QR code" className="mx-auto h-48 w-48 rounded-lg border border-border bg-white p-3" />
      )}

      {canCreateRecord && (
        <Button asChild>
          <Link
            href={`/activity/new-for-participant?participantHandle=${handle.value}&participantName=${encodeURIComponent(profile.displayName)}`}
          >
            Create activity record
          </Link>
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verified records</CardTitle>
          <CardDescription>
            A public summary of this participant&apos;s confirmed records (category, dates, total
            hours — never case or contact details) arrives with the Phase 3 public verification page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          VERWOVO never displays case numbers, benefit status, contact details, or full activity
          history on a public profile.
        </CardContent>
      </Card>
    </div>
  );
}
