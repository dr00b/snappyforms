"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ActivityFieldsForm,
  activityFieldsToPayload,
  recordToFormFields,
  type ActivityFormFields,
} from "@/components/ActivityFieldsForm";
import { STATUS_LABELS, STATUS_BADGE_VARIANT, CATEGORY_LABELS } from "@/lib/activityLabels";
import { ShareLinkPanel } from "@/components/ShareLinkPanel";

type ActionKey = "confirm" | "decline" | "request-changes" | "accept" | "dispute" | "resubmit" | "revise" | "revoke";

export default function ActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [message, setMessage] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [reviseFields, setReviseFields] = useState<ActivityFormFields | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/activity/${params.id}`);
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!data?.record) {
    return <div className="px-6 py-8 text-sm text-muted-foreground">Loading...</div>;
  }

  const { record, viewer } = data;
  const actions: string[] = viewer.availableActions;

  async function runAction(action: ActionKey, body: unknown) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/activity/${params.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("That didn't go through. Please try again.");
      return;
    }
    if (action === "revise") {
      const json = await res.json();
      router.push(`/activity/${json.record.id}`);
      return;
    }
    setActiveAction(null);
    setMessage("");
    setAcknowledged(false);
    await load();
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <Link href="/activity" className="text-sm text-muted-foreground">
        ← Back
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{record.title}</h1>
          <Badge variant={STATUS_BADGE_VARIANT[record.status] ?? "outline"}>
            {STATUS_LABELS[record.status] ?? record.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {CATEGORY_LABELS[record.category] ?? record.category} · {record.participantProfile.displayName} ·{" "}
          {record.organization.name}
        </p>
        {record.revisionNumber > 1 && (
          <p className="mt-1 text-xs text-muted-foreground">Revision {record.revisionNumber}</p>
        )}
      </div>

      {record.fraudFlags.length > 0 && (
        <div className="flex flex-col gap-2">
          {record.fraudFlags.map((f: { id: string; message: string }) => (
            <div key={f.id} className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              {f.message}
            </div>
          ))}
        </div>
      )}

      {record.supersedes && (
        <p className="text-xs text-muted-foreground">
          This is a correction of{" "}
          <Link href={`/activity/${record.supersedes.id}`} className="underline">
            an earlier record
          </Link>
          .
        </p>
      )}
      {record.supersededBy && (
        <p className="text-xs text-muted-foreground">
          This record was corrected —{" "}
          <Link href={`/activity/${record.supersededBy.id}`} className="underline">
            view the current version
          </Link>
          .
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          {record.description && <div className="col-span-2 text-muted-foreground">{record.description}</div>}
          {record.activityDate && <Field label="Date" value={new Date(record.activityDate).toLocaleDateString()} />}
          {record.totalHours != null && <Field label="Total hours" value={String(record.totalHours)} />}
          {record.paidStatus && <Field label="Paid status" value={record.paidStatus === "PAID" ? "Paid" : "Unpaid"} />}
          {record.locationType && (
            <Field label="Location" value={record.locationType === "REMOTE" ? "Remote" : "In person"} />
          )}
          {record.weeklyHours != null && <Field label="Weekly hours" value={String(record.weeklyHours)} />}
          {record.monthlyHours != null && <Field label="Monthly hours" value={String(record.monthlyHours)} />}
          {record.supervisorName && <Field label="Supervisor" value={`${record.supervisorName}${record.supervisorTitle ? `, ${record.supervisorTitle}` : ""}`} />}
          {record.transportationProvided && <Field label="Transportation" value="Provided" />}
          {record.supportingNotes && <div className="col-span-2 text-muted-foreground">{record.supportingNotes}</div>}
        </CardContent>
      </Card>

      {record.status === "CONFIRMED" && viewer.isOwningParticipant && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/forms">Generate form</Link>
            </Button>
            <ShareLinkPanel resourceType="ACTIVITY_RECORD" resourceId={record.id} label={record.title} />
          </CardContent>
        </Card>
      )}

      {(record.confirmations.length > 0 || record.disputes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
            {record.confirmations.map((c: any) => (
              <div key={c.id}>
                <span className="font-medium text-foreground">{c.confirmedByUser.email ?? c.confirmedByUser.phone}</span>{" "}
                {c.action.toLowerCase().replaceAll("_", " ")}
                {c.message ? ` — ${c.message}` : ""} · {new Date(c.createdAt).toLocaleString()}
              </div>
            ))}
            {record.disputes.map((d: any) => (
              <div key={d.id}>
                <span className="font-medium text-foreground">{d.raisedByUser.email ?? d.raisedByUser.phone}</span> disputed:{" "}
                {d.reason} · {new Date(d.createdAt).toLocaleString()}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {actions.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {actions.includes("confirm") && (
              <Button size="sm" onClick={() => setActiveAction("confirm")}>
                Confirm Record
              </Button>
            )}
            {actions.includes("decline") && (
              <Button size="sm" variant="outline" onClick={() => setActiveAction("decline")}>
                Decline
              </Button>
            )}
            {actions.includes("request-changes") && (
              <Button size="sm" variant="outline" onClick={() => setActiveAction("request-changes")}>
                Request changes
              </Button>
            )}
            {actions.includes("accept") && (
              <Button size="sm" onClick={() => setActiveAction("accept")}>
                Accept Record
              </Button>
            )}
            {actions.includes("dispute") && (
              <Button size="sm" variant="outline" onClick={() => setActiveAction("dispute")}>
                Dispute
              </Button>
            )}
            {actions.includes("resubmit") && (
              <Button
                size="sm"
                onClick={() => {
                  setReviseFields(recordToFormFields(record));
                  setActiveAction("resubmit");
                }}
              >
                Edit &amp; resubmit
              </Button>
            )}
            {actions.includes("revise") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReviseFields(recordToFormFields(record));
                  setActiveAction("revise");
                }}
              >
                Correct record
              </Button>
            )}
            {actions.includes("revoke") && viewer.isOrgAdmin && (
              <Button size="sm" variant="destructive" onClick={() => setActiveAction("revoke")}>
                Revoke
              </Button>
            )}
          </div>

          {activeAction === "confirm" && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <p className="text-sm">
                  I confirm that the activity details shown above are accurate to the best of my
                  knowledge and that I am authorized to verify them for this organization.
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                  I have reviewed the dates, hours, activity, and participant information.
                </label>
                <div className="flex gap-2">
                  <Button disabled={!acknowledged || submitting} onClick={() => runAction("confirm", { acknowledged: true })}>
                    Confirm Record
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeAction === "decline" && (
            <ActionForm
              placeholder="Optional note for the participant"
              submitLabel="Confirm decline"
              submitting={submitting}
              onCancel={() => setActiveAction(null)}
              onSubmit={() => runAction("decline", { message: message || undefined })}
              message={message}
              setMessage={setMessage}
            />
          )}

          {activeAction === "request-changes" && (
            <ActionForm
              placeholder="What needs to change?"
              submitLabel="Send"
              required
              submitting={submitting}
              onCancel={() => setActiveAction(null)}
              onSubmit={() => runAction("request-changes", { message })}
              message={message}
              setMessage={setMessage}
            />
          )}

          {activeAction === "accept" && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                  I confirm this reflects my activity accurately.
                </label>
                <div className="flex gap-2">
                  <Button disabled={!acknowledged || submitting} onClick={() => runAction("accept", { acknowledged: true })}>
                    Accept Record
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeAction === "dispute" && (
            <ActionForm
              placeholder="Why are you disputing this record?"
              submitLabel="Submit dispute"
              required
              submitting={submitting}
              onCancel={() => setActiveAction(null)}
              onSubmit={() => runAction("dispute", { reason: message })}
              message={message}
              setMessage={setMessage}
            />
          )}

          {(activeAction === "resubmit" || activeAction === "revise") && reviseFields && (
            <Card>
              <CardContent className="flex flex-col gap-4 p-4">
                <ActivityFieldsForm value={reviseFields} onChange={setReviseFields} />
                <div className="flex gap-2">
                  <Button
                    disabled={submitting}
                    onClick={() => runAction(activeAction, activityFieldsToPayload(reviseFields))}
                  >
                    {activeAction === "resubmit" ? "Resubmit" : "Save correction"}
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeAction === "revoke" && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <p className="text-sm">This will mark the record as revoked. This cannot be undone.</p>
                <div className="flex gap-2">
                  <Button variant="destructive" disabled={submitting} onClick={() => runAction("revoke", {})}>
                    Confirm revoke
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function ActionForm({
  placeholder,
  submitLabel,
  required,
  submitting,
  message,
  setMessage,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  required?: boolean;
  submitting: boolean;
  message: string;
  setMessage: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <textarea
          className="flex min-h-20 w-full rounded-md border border-border bg-card px-4 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex gap-2">
          <Button disabled={submitting || (required && !message.trim())} onClick={onSubmit}>
            {submitLabel}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
