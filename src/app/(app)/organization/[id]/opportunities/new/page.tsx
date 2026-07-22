"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

type Location = { id: string; name: string };

const emptyForm = {
  locationId: "",
  title: "",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  openings: "1",
  taskCategory: "",
  contactPerson: "",
  minimumAge: "",
  accessibilityInfo: "",
  transportationInfo: "",
  backgroundCheckRequired: false,
  trainingRequired: false,
  remoteOrInPerson: "IN_PERSON",
};

export default function NewOpportunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/organizations/${params.id}/locations`)
      .then((r) => r.json())
      .then((data) => setLocations(data.locations ?? []));
  }, [params.id]);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${params.id}/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: form.locationId || undefined,
          title: form.title,
          description: form.description || undefined,
          date: form.date,
          startTime: form.startTime || undefined,
          endTime: form.endTime || undefined,
          openings: Number(form.openings) || 1,
          taskCategory: form.taskCategory || undefined,
          contactPerson: form.contactPerson || undefined,
          minimumAge: form.minimumAge ? Number(form.minimumAge) : undefined,
          accessibilityInfo: form.accessibilityInfo || undefined,
          transportationInfo: form.transportationInfo || undefined,
          backgroundCheckRequired: form.backgroundCheckRequired,
          trainingRequired: form.trainingRequired,
          remoteOrInPerson: form.remoteOrInPerson,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "request_failed");
        return;
      }
      router.push(`/opportunities/${data.opportunity.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex items-center gap-2">
        <Link href={`/organization/${params.id}/settings`}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">New volunteer opportunity</h1>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input className="mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="mt-1 flex min-h-24 w-full rounded-md border border-border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {locations.length > 0 && (
          <div>
            <label className="text-sm font-medium">Location</label>
            <select
              className="mt-1 flex h-12 w-full rounded-md border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={form.locationId}
              onChange={(e) => set("locationId", e.target.value)}
            >
              <option value="">No specific location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input className="mt-1" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Start</label>
            <Input className="mt-1" type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">End</label>
            <Input className="mt-1" type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">Openings</label>
            <Input
              className="mt-1"
              type="number"
              min={1}
              value={form.openings}
              onChange={(e) => set("openings", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <Input
              className="mt-1"
              placeholder="e.g. Food service"
              value={form.taskCategory}
              onChange={(e) => set("taskCategory", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Format</label>
          <select
            className="mt-1 flex h-12 w-full rounded-md border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={form.remoteOrInPerson}
            onChange={(e) => set("remoteOrInPerson", e.target.value)}
          >
            <option value="IN_PERSON">In person</option>
            <option value="REMOTE">Remote</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Contact person</label>
          <Input className="mt-1" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium">Minimum age</label>
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={form.minimumAge}
            onChange={(e) => set("minimumAge", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Accessibility info</label>
          <Input className="mt-1" value={form.accessibilityInfo} onChange={(e) => set("accessibilityInfo", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium">Transportation info</label>
          <Input
            className="mt-1"
            value={form.transportationInfo}
            onChange={(e) => set("transportationInfo", e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.backgroundCheckRequired}
            onChange={(e) => set("backgroundCheckRequired", e.target.checked)}
          />
          Background check required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.trainingRequired} onChange={(e) => set("trainingRequired", e.target.checked)} />
          Training required
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting || !form.title.trim() || !form.date}>
          {submitting ? "Creating..." : "Create opportunity"}
        </Button>
      </form>
    </div>
  );
}
