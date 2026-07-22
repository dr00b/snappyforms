import Link from "next/link";
import { resolveShareLink } from "@/lib/shareLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/activityLabels";
import { Download, ShieldCheck, ShieldOff, ShieldAlert, Clock } from "lucide-react";

export default async function SharePage({ params }: { params: { token: string } }) {
  const resolved = await resolveShareLink(params.token, { bumpAccess: true });

  if (resolved.status === "not_found") {
    return <StatusCard icon={<ShieldOff className="h-5 w-5" />} title="Not found" body="This share link doesn't exist." />;
  }

  if (resolved.status === "expired") {
    return (
      <StatusCard
        icon={<Clock className="h-5 w-5" />}
        title="Link expired"
        body="This share link has expired or was revoked by its owner. Ask them to send a new one."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shared via VERWOVO</p>
        {resolved.label && <h1 className="mt-1 text-xl font-bold">{resolved.label}</h1>}
      </div>

      {resolved.resourceType === "ACTIVITY_RECORD" && resolved.view.status === "valid" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <ShieldCheck className="h-5 w-5" /> Valid record
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Participant" value={resolved.view.participantDisplay} />
            <Row label="Organization" value={resolved.view.organizationName} />
            <Row label="Category" value={CATEGORY_LABELS[resolved.view.category] ?? resolved.view.category} />
            {resolved.view.totalHours != null && <Row label="Total hours" value={String(resolved.view.totalHours)} />}
            {resolved.view.confirmedAt && (
              <Row label="Confirmed" value={new Date(resolved.view.confirmedAt).toLocaleDateString()} />
            )}
          </CardContent>
        </Card>
      )}

      {resolved.resourceType === "ACTIVITY_RECORD" && resolved.view.status !== "valid" && (
        <StatusCard
          icon={<ShieldAlert className="h-5 w-5" />}
          title="Not currently valid"
          body="This record is no longer in a shareable state."
        />
      )}

      {resolved.resourceType === "GENERATED_FORM" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{resolved.form.templateKey.replaceAll("_", " ")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Row label="Organization" value={resolved.form.organizationName} />
            <Row label="Generated" value={new Date(resolved.form.createdAt).toLocaleDateString()} />
            <Button asChild>
              <a href={`/api/share/${params.token}/download`}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Expires {new Date(resolved.expiresAt).toLocaleString()}. VERWOVO is a demonstration
        prototype and never shares case numbers, contact details, or full activity history through
        links like this.
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

function StatusCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {icon} {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
      </Card>
      <Link href="/" className="text-center text-xs text-muted-foreground underline">
        Learn more about VERWOVO
      </Link>
    </div>
  );
}
