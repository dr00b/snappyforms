import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import { QrCode, Search, Clock, Settings, ShieldCheck, ListChecks, Terminal } from "lucide-react";
import { JoinableOrgsBanner } from "@/components/JoinableOrgsBanner";
import { YOUR_TURN_STATUSES } from "@/lib/activityLabels";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { user } = session;
  const { participantProfile, organizationMembers, agencyMembers } = user;

  if (!participantProfile && organizationMembers.length === 0 && agencyMembers.length === 0) {
    redirect("/onboarding");
  }

  const participantCounts = participantProfile
    ? {
        // Deliberately "your turn" only, not everything on the Needs action tab:
        // this is a call-to-action badge, and counting records that are sitting
        // with the organization would nag the participant about work that is
        // not theirs to do.
        needsAction: await db.activityRecord.count({
          where: {
            participantProfileId: participantProfile.id,
            status: { in: YOUR_TURN_STATUSES.participant },
          },
        }),
        confirmed: await db.activityRecord.count({
          where: { participantProfileId: participantProfile.id, status: "CONFIRMED" },
        }),
      }
    : null;

  const orgCounts = await Promise.all(
    organizationMembers.map((m) =>
      db.activityRecord.count({
        where: { organizationId: m.organizationId, status: "AWAITING_ORGANIZATION" },
      })
    )
  );

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <JoinableOrgsBanner />

      {participantProfile && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback>{initials(participantProfile.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-bold">{participantProfile.displayName}</p>
              <p className="text-sm text-muted-foreground">@{participantProfile.handle?.displayValue}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/qr">
              <Card className="h-full transition hover:border-primary">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <QrCode className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">My QR code</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/search">
              <Card className="h-full transition hover:border-primary">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <Search className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Find an organization</span>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Link href="/opportunities">
            <Card className="transition hover:border-primary">
              <CardHeader>
                <CardTitle className="text-base">Browse volunteer opportunities</CardTitle>
                <CardDescription>Find and sign up for opportunities near you.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/activity">
            <Card className="transition hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" /> Activity records
                </CardTitle>
                <CardDescription>
                  {participantCounts!.needsAction > 0
                    ? `${participantCounts!.needsAction} need your attention · ${participantCounts!.confirmed} confirmed`
                    : `${participantCounts!.confirmed} confirmed record${participantCounts!.confirmed === 1 ? "" : "s"}`}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/consent">
            <Card className="transition hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" /> Consent center
                </CardTitle>
                <CardDescription>Control which agencies can see your verified hours.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </section>
      )}

      {organizationMembers.map((membership, i) => (
        <section key={membership.id} className="flex flex-col gap-4 border-t border-border pt-6 first:border-0 first:pt-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback>{initials(membership.organization.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{membership.organization.name}</p>
                <Badge variant={membership.role === "ADMIN" ? "default" : "muted"}>{membership.role}</Badge>
                {membership.status !== "ACTIVE" && (
                  <Badge variant="muted">{membership.status === "REQUESTED" ? "Pending approval" : "New verifier"}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{membership.organization.handle?.displayValue}</p>
            </div>
          </div>

          {membership.status === "REQUESTED" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Waiting on admin approval</CardTitle>
                <CardDescription>
                  An organization admin needs to approve your membership request before you can verify activity.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/qr">
                  <Card className="h-full transition hover:border-primary">
                    <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                      <QrCode className="h-6 w-6 text-primary" />
                      <span className="text-sm font-medium">Organization QR</span>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/search">
                  <Card className="h-full transition hover:border-primary">
                    <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                      <Search className="h-6 w-6 text-primary" />
                      <span className="text-sm font-medium">Find a participant</span>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              <Link href="/activity">
                <Card className="transition hover:border-primary">
                  <CardHeader>
                    <CardTitle className="text-base">Verification queue</CardTitle>
                    <CardDescription>
                      {orgCounts[i] > 0
                        ? `${orgCounts[i]} request${orgCounts[i] === 1 ? "" : "s"} awaiting review`
                        : "No pending requests right now."}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}

          {membership.role === "ADMIN" && membership.status === "ACTIVE" && (
            <Link href={`/organization/${membership.organizationId}/settings`}>
              <Card className="transition hover:border-primary">
                <CardContent className="flex items-center gap-2 p-4">
                  <Settings className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Manage organization</span>
                </CardContent>
              </Card>
            </Link>
          )}
        </section>
      ))}

      {agencyMembers.map((membership) => (
        <section key={membership.id} className="flex flex-col gap-4 border-t border-border pt-6 first:border-0 first:pt-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback>{initials(membership.agency.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{membership.agency.name}</p>
                <Badge variant={membership.role === "ADMIN" ? "default" : "muted"}>{membership.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Agency staff</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href={`/agency/${membership.agencyId}/cases`}>
              <Card className="h-full transition hover:border-primary">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <ListChecks className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Cases</span>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/agency/${membership.agencyId}/bulk-query`}>
              <Card className="h-full transition hover:border-primary">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Bulk query</span>
                </CardContent>
              </Card>
            </Link>
          </div>

          {membership.role === "ADMIN" && (
            <Link href={`/agency/${membership.agencyId}/api-console`}>
              <Card className="transition hover:border-primary">
                <CardContent className="flex items-center gap-2 p-4">
                  <Terminal className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">API console</span>
                </CardContent>
              </Card>
            </Link>
          )}
        </section>
      ))}

      {!participantProfile && (
        <Button asChild variant="outline">
          <Link href="/onboarding/participant">Also create a personal participant profile</Link>
        </Button>
      )}
    </div>
  );
}
