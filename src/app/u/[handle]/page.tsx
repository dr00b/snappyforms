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

  // Orgs the viewer can verify for (ACTIVE/PENDING members are verifier-eligible).
  const viewerOrgIds = session
    ? (
        await db.organizationMembership.findMany({
          where: { userId: session.userId, status: { in: ["ACTIVE", "PENDING"] } },
          select: { organizationId: true },
        })
      ).map((m) => m.organizationId)
    : [];
  const canCreateRecord = viewerOrgIds.length > 0;

  // Shifts this participant logged that are awaiting confirmation from one of the
  // viewer's orgs. This is what lets an authorizer scan a participant's QR and
  // approve the shift they just logged.
  const pendingForViewer = viewerOrgIds.length
    ? await db.activityRecord.findMany({
        where: {
          participantProfileId: profile.id,
          organizationId: { in: viewerOrgIds },
          status: "AWAITING_ORGANIZATION",
        },
        include: { organization: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

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

      {pendingForViewer.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Shifts awaiting your confirmation</CardTitle>
            <CardDescription>
              This participant logged {pendingForViewer.length === 1 ? "a shift" : "shifts"} for your
              organization. Review and authorize.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pendingForViewer.map((r) => (
              <Button key={r.id} asChild variant="outline" className="justify-between">
                <Link href={`/activity/${r.id}`}>
                  <span>{r.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.totalHours ? `${r.totalHours}h · ` : ""}Review &amp; confirm →
                  </span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {canCreateRecord && (
        <Button asChild variant={pendingForViewer.length > 0 ? "ghost" : "default"}>
          <Link
            href={`/activity/new-for-participant?participantHandle=${handle.value}&participantName=${encodeURIComponent(profile.displayName)}`}
          >
            Log a new shift for this participant
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
          SnappyForms never displays case numbers, benefit status, contact details, or full activity
          history on a public profile.
        </CardContent>
      </Card>
    </div>
  );
}
