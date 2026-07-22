import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { generateQrDataUrl, qrTargetUrl } from "@/lib/qr";
import { getCurrentSession } from "@/lib/auth/session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { initials, normalizeHandle } from "@/lib/utils";

export default async function OrganizationProfilePage({ params }: { params: { handle: string } }) {
  const value = normalizeHandle(params.handle);
  const handle = await db.handle.findUnique({
    where: { value },
    include: { organization: { include: { qrIdentifier: true } } },
  });

  if (!handle || handle.ownerType !== "ORGANIZATION" || !handle.organization) {
    notFound();
  }

  const org = handle.organization;
  const qrImage = org.qrIdentifier ? await generateQrDataUrl(qrTargetUrl(org.qrIdentifier.id)) : null;
  const session = await getCurrentSession();
  const canRequest = Boolean(session?.user.participantProfile);

  const opportunities = await db.volunteerOpportunity.findMany({
    where: { organizationId: org.id, date: { gte: new Date(new Date().toDateString()) } },
    include: { location: true, signups: true },
    orderBy: { date: "asc" },
    take: 10,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <Link href="/search" className="text-sm text-muted-foreground">
        ← Back
      </Link>

      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-xl">{initials(org.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xl font-bold">{org.name}</p>
          <p className="text-sm text-muted-foreground">@{handle.displayValue}</p>
          <Badge variant="secondary" className="mt-2">
            {org.type}
          </Badge>
        </div>
        {(org.city || org.state) && (
          <p className="text-xs text-muted-foreground">
            {[org.city, org.state].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      {qrImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrImage} alt="QR code" className="mx-auto h-48 w-48 rounded-lg border border-border bg-white p-3" />
      )}

      {canRequest && (
        <Button asChild>
          <Link href={`/activity/new?orgId=${org.id}&orgName=${encodeURIComponent(org.name)}`}>
            Request verification
          </Link>
        </Button>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Volunteer opportunities</h2>
        {opportunities.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming opportunities posted right now.</p>
        )}
        {opportunities.map((o) => {
          const signedUpCount = o.signups.filter((s) => s.status !== "CANCELLED").length;
          const full = signedUpCount >= o.openings;
          return (
            <Link key={o.id} href={`/opportunities/${o.id}`}>
              <Card className="transition hover:border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{o.title}</CardTitle>
                    <Badge variant={full ? "muted" : "default"}>{full ? "Full" : `${o.openings - signedUpCount} open`}</Badge>
                  </div>
                  <CardDescription>
                    {new Date(o.date).toLocaleDateString()}
                    {o.location ? ` · ${o.location.name}` : ""}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
