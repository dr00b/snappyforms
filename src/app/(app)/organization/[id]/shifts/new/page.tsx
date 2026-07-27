"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

// Hosting a shift is deliberately a shorter form than the full opportunity
// board entry: only the fields a PA 1895 row needs, so a representative can
// get a QR up on their phone in a few seconds while volunteers arrive.

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewShiftPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    title: searchParams.get("title") ?? "Volunteer shift",
    date: today(),
    startTime: "09:00",
    endTime: "12:00",
    taskCategory: "COMMUNITY_SERVICE",
    contactPerson: searchParams.get("contact") ?? "",
    contactPhone: "",
    description: "",
    remoteOrInPerson: "IN_PERSON",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${params.id}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          taskCategory: form.taskCategory,
          contactPerson: form.contactPerson,
          contactPhone: form.contactPhone || undefined,
          remoteOrInPerson: form.remoteOrInPerson,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "request_failed");
        return;
      }
      router.push(`/organization/${params.id}/shifts/${data.shift.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Host a shift</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        You&apos;ll get a QR code that changes every 30 seconds. Volunteers scan it when they
        finish, and their record is signed on the spot — no paperwork to chase afterwards.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium">What are volunteers doing?</label>
          <Input
            className="mt-1"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              className="mt-1"
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Start</label>
            <Input
              className="mt-1"
              type="time"
              value={form.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">End</label>
            <Input
              className="mt-1"
              type="time"
              value={form.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              required
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          These hours go on every record this shift signs.
        </p>

        <div>
          <label className="text-sm font-medium">Activity type</label>
          <select
            className="mt-1 flex h-12 w-full rounded-md border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={form.taskCategory}
            onChange={(e) => set("taskCategory", e.target.value)}
          >
            <option value="COMMUNITY_SERVICE">Community service</option>
            <option value="VOLUNTEER">Volunteer</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">Contact person</label>
            <Input
              className="mt-1"
              placeholder="Who is signing"
              value={form.contactPerson}
              onChange={(e) => set("contactPerson", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contact phone</label>
            <Input
              className="mt-1"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Notes (optional)</label>
          <textarea
            className="mt-1 flex min-h-20 w-full rounded-md border border-border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error.replace(/_/g, " ")}</p>}

        <Button type="submit" disabled={submitting} data-testid="start-shift">
          {submitting ? "Starting…" : "Start shift and show QR"}
        </Button>
      </form>
    </div>
  );
}
