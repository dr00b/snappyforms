"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck } from "lucide-react";

// Lives outside the (app) group and outside middleware's protected prefixes on
// purpose: the middleware redirect carries only the pathname, which would drop
// the ?c= code and strand a volunteer at a shift they can no longer confirm.
// Auth is handled here instead, keeping the full URL in the login `next`.

type Shift = {
  id: string;
  title: string;
  description: string | null;
  organizationName: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  totalHours: number | null;
  contactPerson: string | null;
};

type Confirmed = { id: string; title: string; totalHours: number | null };

const MESSAGES: Record<string, string> = {
  invalid_code:
    "That code has expired. Ask the organizer for the current one — it changes every 30 seconds.",
  shift_not_found: "This shift no longer exists.",
  shift_not_hosted: "This shift isn't accepting check-ins.",
  shift_host_not_authorized:
    "The person who started this shift is no longer able to sign for the organization.",
  participant_profile_required: "You need a participant profile to check in to a shift.",
};

function describe(error: string) {
  return MESSAGES[error] ?? error.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { timeZone: "UTC", dateStyle: "medium" });
}

export default function ShiftCheckInPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const code = searchParams.get("c") ?? "";

  const [shift, setShift] = useState<Shift | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [alreadyRecordId, setAlreadyRecordId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadPreview = useCallback(async () => {
    const res = await fetch(
      `/api/opportunities/${params.id}/shift-preview?c=${encodeURIComponent(code)}`
    );
    const data = await res.json();
    if (res.status === 401 && data.error === "unauthenticated") {
      setNeedsLogin(true);
      return;
    }
    if (res.status === 403) {
      setNeedsLogin(true);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "request_failed");
      return;
    }
    setShift(data.shift);
    setAlreadyRecordId(data.alreadyCheckedIn ? data.activityRecordId : null);
  }, [params.id, code]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${params.id}/scan-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === "already_checked_in") {
        setAlreadyRecordId(data.activityRecordId ?? null);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "request_failed");
        return;
      }
      setConfirmed(data.record);
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(`/shift/${params.id}?c=${code}`)}`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          SnappyForms shift check-in
        </p>
        <h1 className="mt-1 text-xl font-bold">
          {confirmed ? "Shift confirmed" : "Confirm your shift"}
        </h1>
      </div>

      {needsLogin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in to confirm</CardTitle>
            <CardDescription>
              Sign in and you&apos;ll come straight back here — but hurry, this code expires in
              seconds. If it does, just scan again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={loginHref}>Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Couldn&apos;t confirm</CardTitle>
            <CardDescription data-testid="shift-error">{describe(error)}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {confirmed && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <CheckCircle2 className="h-5 w-5" /> {confirmed.title}
            </CardTitle>
            <CardDescription data-testid="shift-confirmed">
              {confirmed.totalHours ?? 0} hours are now on your record, signed by the organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild>
              <Link href={`/activity/${confirmed.id}`}>View the record</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/forms">Put it on a PA 1895</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {alreadyRecordId && !confirmed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">You&apos;re already checked in</CardTitle>
            <CardDescription>This shift is on your record.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/activity/${alreadyRecordId}`}>View the record</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {shift && !confirmed && !alreadyRecordId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{shift.title}</CardTitle>
            <CardDescription>{shift.organizationName}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(shift.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hours</span>
              <span>
                {shift.startTime}–{shift.endTime} ({shift.totalHours ?? 0}h)
              </span>
            </div>
            {shift.contactPerson && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Signed by</span>
                <span>{shift.contactPerson}</span>
              </div>
            )}
            <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              You scanned a code that was only valid for a few seconds, so this confirms you and
              the organizer were together. Confirming signs the record immediately.
            </p>
            <Button onClick={confirm} disabled={submitting} data-testid="confirm-shift">
              {submitting ? "Confirming…" : "Confirm I volunteered"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
