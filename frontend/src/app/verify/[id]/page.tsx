import Link from "next/link";
import { getVerificationView } from "@/lib/verification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/lib/activityLabels";
import { ShieldCheck, ShieldOff, ShieldAlert } from "lucide-react";

export default async function VerifyPage({ params }: { params: { id: string } }) {
  const view = await getVerificationView(params.id);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          SnappyForms public verification
        </p>
        <h1 className="mt-1 text-xl font-bold">Verification {view.verificationId}</h1>
      </div>

      {view.status === "valid" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <ShieldCheck className="h-5 w-5" /> Valid record
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Participant" value={view.participantDisplay} />
            <Row label="Organization" value={view.organizationName} />
            <Row label="Category" value={CATEGORY_LABELS[view.category] ?? view.category} />
            {view.activityDate && <Row label="Date" value={new Date(view.activityDate).toLocaleDateString()} />}
            {(view.startDate || view.endDate) && (
              <Row
                label="Date range"
                value={`${view.startDate ? new Date(view.startDate).toLocaleDateString() : "—"} – ${
                  view.endDate ? new Date(view.endDate).toLocaleDateString() : "—"
                }`}
              />
            )}
            {view.totalHours != null && <Row label="Total hours" value={String(view.totalHours)} />}
            {view.confirmedAt && <Row label="Confirmed" value={new Date(view.confirmedAt).toLocaleDateString()} />}
          </CardContent>
        </Card>
      )}

      {view.status === "revoked" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <ShieldOff className="h-5 w-5" /> Revoked
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This record has been revoked by the verifying organization and is no longer valid.
          </CardContent>
        </Card>
      )}

      {view.status === "superseded" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5" /> Superseded
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This record was corrected.{" "}
            {view.supersededById && (
              <Link href={`/verify/${view.supersededById}`} className="underline">
                View the current version
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {view.status === "unavailable" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This verification is not available.
          </CardContent>
        </Card>
      )}

      <Badge variant="muted" className="w-fit">
        ID: {view.verificationId}
      </Badge>

      <p className="text-xs text-muted-foreground">
        SnappyForms is a demonstration prototype. This page never displays case numbers, dates of
        birth, home addresses, contact information, benefit program details, or full activity
        history.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
