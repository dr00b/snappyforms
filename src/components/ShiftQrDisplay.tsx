"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CodeResponse = {
  code: string;
  targetUrl: string;
  dataUrl: string;
  expiresAt: string;
  stepSeconds: number;
};

type Checkin = {
  displayName: string;
  handle: string | null;
  checkedInAt: string | null;
  activityRecordId: string | null;
};

type ShiftSummary = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
};

const CHECKIN_POLL_MS = 5000;

export default function ShiftQrDisplay({ shiftId }: { shiftId: string }) {
  const [current, setCurrent] = useState<CodeResponse | null>(null);
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>();

  const loadCode = useCallback(async () => {
    // Re-arm from the server's own expiry rather than a fixed interval, so the
    // display can't drift out of step with the codes the server accepts. A
    // failed attempt still schedules the next one — the QR on stage has to
    // recover on its own.
    let delay = 5000;
    try {
      const res = await fetch(`/api/opportunities/${shiftId}/code`);
      const data = await res.json();
      if (res.ok) {
        setError(null);
        setCurrent(data);
        delay = Math.max(1000, new Date(data.expiresAt).getTime() - Date.now() + 250);
      } else {
        setError(data.error ?? "request_failed");
      }
    } catch {
      setError("network_error");
    }
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(loadCode, delay);
  }, [shiftId]);

  useEffect(() => {
    loadCode();
    return () => clearTimeout(refreshTimer.current);
  }, [loadCode]);

  useEffect(() => {
    async function loadCheckins() {
      const res = await fetch(`/api/opportunities/${shiftId}/checkins`);
      if (!res.ok) return;
      const data = await res.json();
      setShift(data.shift);
      setCheckins(data.checkins ?? []);
    }
    loadCheckins();
    const interval = setInterval(loadCheckins, CHECKIN_POLL_MS);
    return () => clearInterval(interval);
  }, [shiftId]);

  // Countdown is cosmetic: it compares the server's expiry against this
  // device's clock, and the server accepts a step either side anyway.
  useEffect(() => {
    if (!current) return;
    const tick = () =>
      setSecondsLeft(
        Math.max(0, Math.ceil((new Date(current.expiresAt).getTime() - Date.now()) / 1000))
      );
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [current]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">{shift?.title ?? "Shift in progress"}</h1>
        <p className="text-sm text-muted-foreground">
          Hold this up as volunteers finish. The code changes every {current?.stepSeconds ?? 30}{" "}
          seconds, so a screenshot is useless a minute later.
        </p>
      </div>

      {/* A failed refresh shows inline rather than replacing the view: on stage,
          a blip should not take the QR and the check-in list off the screen. */}
      {error && (
        <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          Couldn&apos;t refresh the code ({error.replace(/_/g, " ")}). Retrying.
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          {current ? (
            <>
              <img
                src={current.dataUrl}
                alt="Shift check-in QR code"
                data-testid="shift-qr"
                className="h-64 w-64 rounded-lg border border-border bg-white p-3"
              />
              <p
                data-testid="shift-code"
                className="font-mono text-3xl font-bold tracking-widest tabular-nums"
              >
                {current.code}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="shift-countdown">
                Refreshes in {secondsLeft}s
              </p>
              <a
                data-testid="shift-open-link"
                href={current.targetUrl}
                className="text-xs text-primary underline"
              >
                Can&apos;t scan? Open this link
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Generating code…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base" data-testid="checkin-count">
            {checkins.length} signed in
          </CardTitle>
          <CardDescription>
            Each scan writes a confirmed record with you as the verifier.
          </CardDescription>
        </CardHeader>
        {checkins.length > 0 && (
          <CardContent className="flex flex-col gap-2">
            {checkins.map((c) => (
              <div
                key={c.activityRecordId ?? c.handle ?? c.displayName}
                className="flex items-center justify-between text-sm"
              >
                <span>{c.displayName}</span>
                {c.handle && (
                  <Link href={`/u/${c.handle}`} className="text-xs text-muted-foreground underline">
                    @{c.handle}
                  </Link>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
