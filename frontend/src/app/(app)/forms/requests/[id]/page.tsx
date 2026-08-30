"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FORM_CERT_STATUS_LABELS, FORM_CERT_STATUS_BADGE_VARIANT } from "@/lib/activityLabels";
import { Download } from "lucide-react";

type ActionKey = "certify" | "decline" | "request-changes" | "resubmit" | "finalize";

export default function FormRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizedFormId, setFinalizedFormId] = useState<string | null>(null);

  const [certForm, setCertForm] = useState({
    siteManagerName: "",
    siteManagerTitle: "",
    confirmationDate: new Date().toISOString().slice(0, 10),
    signature: "",
    acknowledged: false,
  });
  const [ssnLast4, setSsnLast4] = useState("");
  const [resubmitForm, setResubmitForm] = useState<any>(null);

  async function load() {
    const res = await fetch(`/api/form-requests/${params.id}`);
    const json = await res.json();
    setData(json);
    if (json.request) {
      setResubmitForm({
        participant: {
          fullName: json.request.participantFullName,
          dob: json.request.participantDob,
          address: json.request.participantAddress,
          city: json.request.participantCity,
          state: json.request.participantState,
          zip: json.request.participantZip,
        },
        agency: {
          name: json.request.agencyName,
          phone: json.request.agencyPhone,
          address: json.request.agencyAddress,
          city: json.request.agencyCity,
          state: json.request.agencyState,
          zip: json.request.agencyZip,
        },
        service: {
          startDate: json.request.serviceStartDate,
          endDate: json.request.serviceEndDate,
          transportationProvided: json.request.transportationProvided,
          week1Hours: String(json.request.week1Hours),
          week2Hours: String(json.request.week2Hours),
          week3Hours: String(json.request.week3Hours),
          week4Hours: String(json.request.week4Hours),
          tasks: [...json.request.tasks, "", "", ""].slice(0, 3),
        },
      });
    }
    if (json.viewer?.isOrgMember) {
      fetch("/api/me")
        .then((r) => r.json())
        .then((me) => {
          const org = me.user?.organizations?.find((o: any) => o.id === json.request.organizationId);
          if (org?.membershipDisplayName) {
            setCertForm((c) => ({ ...c, siteManagerName: org.membershipDisplayName }));
          }
        });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!data?.request) {
    return <div className="px-6 py-8 text-sm text-muted-foreground">Loading...</div>;
  }

  const { request, viewer } = data;
  const actions: string[] = viewer.availableActions;

  async function runAction(action: ActionKey, body: unknown) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/form-requests/${params.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("That didn't go through. Please try again.");
      return;
    }
    if (action === "finalize") {
      const json = await res.json();
      setFinalizedFormId(json.generatedFormId);
    }
    setActiveAction(null);
    setMessage("");
    await load();
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <Link href="/forms" className="text-sm text-muted-foreground">
        ← Back
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">PA 1938 demonstration form</h1>
          <Badge variant={FORM_CERT_STATUS_BADGE_VARIANT[request.status] ?? "outline"}>
            {FORM_CERT_STATUS_LABELS[request.status] ?? request.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {request.participantProfile.displayName} · {request.organization.name}
        </p>
      </div>

      {request.changeRequestMessage && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {request.status === "DECLINED" ? "Declined: " : "Changes requested: "}
          {request.changeRequestMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volunteer information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Name" value={request.participantFullName} />
          <Field label="Date of birth" value={request.participantDob} />
          <Field label="Address" value={request.participantAddress} />
          <Field label="City/State/ZIP" value={`${request.participantCity}, ${request.participantState} ${request.participantZip}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Start date" value={request.serviceStartDate} />
          <Field label="End date" value={request.serviceEndDate} />
          <Field label="Transportation" value={request.transportationProvided ? "Provided" : "No"} />
          <Field
            label="Total monthly hours"
            value={String(request.week1Hours + request.week2Hours + request.week3Hours + request.week4Hours)}
          />
          {request.tasks.length > 0 && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Tasks</p>
              {request.tasks.map((t: string, i: number) => (
                <p key={i}>• {t}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {request.siteManagerName && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certification</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Site manager" value={request.siteManagerName} />
            <Field label="Title" value={request.siteManagerTitle} />
            <Field label="Confirmed" value={request.confirmationDate} />
            <Field label="Signature" value={request.signature} />
          </CardContent>
        </Card>
      )}

      {finalizedFormId && (
        <Button asChild>
          <a href={`/api/generated-forms/${finalizedFormId}/download`}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </a>
        </Button>
      )}

      {request.generatedFormId && !finalizedFormId && (
        <Button asChild>
          <a href={`/api/generated-forms/${request.generatedFormId}/download`}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </a>
        </Button>
      )}

      {actions.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {actions.includes("certify") && (
              <Button size="sm" onClick={() => setActiveAction("certify")}>
                Certify
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
            {actions.includes("resubmit") && (
              <Button size="sm" onClick={() => setActiveAction("resubmit")}>
                Edit & resubmit
              </Button>
            )}
            {actions.includes("finalize") && (
              <Button size="sm" onClick={() => setActiveAction("finalize")}>
                Finalize & Download
              </Button>
            )}
          </div>

          {activeAction === "certify" && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <p className="text-sm">
                  I confirm that I am authorized to provide this information for the organization
                  and that the information entered is accurate to the best of my knowledge.
                </p>
                <TextField label="Site manager name" value={certForm.siteManagerName} onChange={(v) => setCertForm((c) => ({ ...c, siteManagerName: v }))} />
                <TextField label="Site manager title" value={certForm.siteManagerTitle} onChange={(v) => setCertForm((c) => ({ ...c, siteManagerTitle: v }))} />
                <TextField label="Confirmation date" type="date" value={certForm.confirmationDate} onChange={(v) => setCertForm((c) => ({ ...c, confirmationDate: v }))} />
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={certForm.acknowledged}
                    onChange={(e) => setCertForm((c) => ({ ...c, acknowledged: e.target.checked }))}
                  />
                  I have reviewed this information and am authorized to certify it.
                </label>
                <TextField label="Demonstration signature (typed name)" value={certForm.signature} onChange={(v) => setCertForm((c) => ({ ...c, signature: v }))} />
                <p className="text-xs text-muted-foreground">
                  This is a demonstration placeholder, not a legally binding electronic signature.
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={
                      submitting ||
                      !certForm.acknowledged ||
                      !certForm.siteManagerName ||
                      !certForm.siteManagerTitle ||
                      !certForm.signature
                    }
                    onClick={() => runAction("certify", certForm)}
                  >
                    Certify
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(activeAction === "decline" || activeAction === "request-changes") && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <textarea
                  className="flex min-h-20 w-full rounded-md border border-border bg-card px-4 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder={activeAction === "decline" ? "Optional note for the participant" : "What needs to change?"}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={submitting || (activeAction === "request-changes" && !message.trim())}
                    onClick={() =>
                      runAction(activeAction, activeAction === "decline" ? { message: message || undefined } : { message })
                    }
                  >
                    {activeAction === "decline" ? "Confirm decline" : "Send"}
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeAction === "resubmit" && resubmitForm && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <p className="text-sm font-semibold">Volunteer information</p>
                <TextField label="Full name" value={resubmitForm.participant.fullName} onChange={(v) => setResubmitForm((f: any) => ({ ...f, participant: { ...f.participant, fullName: v } }))} />
                <TextField label="Date of birth" type="date" value={resubmitForm.participant.dob} onChange={(v) => setResubmitForm((f: any) => ({ ...f, participant: { ...f.participant, dob: v } }))} />
                <TextField label="Address" value={resubmitForm.participant.address} onChange={(v) => setResubmitForm((f: any) => ({ ...f, participant: { ...f.participant, address: v } }))} />
                <p className="text-sm font-semibold">Service information</p>
                <TextField label="Start date" type="date" value={resubmitForm.service.startDate} onChange={(v) => setResubmitForm((f: any) => ({ ...f, service: { ...f.service, startDate: v } }))} />
                <TextField label="End date" type="date" value={resubmitForm.service.endDate} onChange={(v) => setResubmitForm((f: any) => ({ ...f, service: { ...f.service, endDate: v } }))} />
                <TextField label="Week 1 hours" type="number" value={resubmitForm.service.week1Hours} onChange={(v) => setResubmitForm((f: any) => ({ ...f, service: { ...f.service, week1Hours: v } }))} />
                <div className="flex gap-2">
                  <Button
                    disabled={submitting}
                    onClick={() =>
                      runAction("resubmit", {
                        ...resubmitForm,
                        service: {
                          ...resubmitForm.service,
                          week1Hours: Number(resubmitForm.service.week1Hours) || 0,
                          week2Hours: Number(resubmitForm.service.week2Hours) || 0,
                          week3Hours: Number(resubmitForm.service.week3Hours) || 0,
                          week4Hours: Number(resubmitForm.service.week4Hours) || 0,
                          tasks: resubmitForm.service.tasks.filter(Boolean),
                        },
                      })
                    }
                  >
                    Resubmit
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeAction === "finalize" && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <p className="text-sm text-muted-foreground">
                  Optionally add the last 4 digits of your SSN — it&apos;s used only to generate
                  this PDF and is never stored.
                </p>
                <TextField
                  label="SSN last 4 (optional)"
                  value={ssnLast4}
                  onChange={(v) => setSsnLast4(v.replace(/\D/g, "").slice(0, 4))}
                />
                <div className="flex gap-2">
                  <Button disabled={submitting} onClick={() => runAction("finalize", { ssnLast4: ssnLast4 || undefined })}>
                    Finalize & Download
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

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <Input className="mt-1" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
