"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ActivityFieldsForm,
  activityFieldsToPayload,
  emptyActivityFields,
  type ActivityFormFields,
} from "@/components/ActivityFieldsForm";
import { normalizeHandle } from "@/lib/utils";

type OrgOption = { id: string; name: string };
type ParticipantResult = { type: "participant"; handle: string; displayName: string };

function NewOrgRecordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgId, setOrgId] = useState(searchParams.get("orgId") ?? "");
  const [participantHandle, setParticipantHandle] = useState(searchParams.get("participantHandle") ?? "");
  const [participantName, setParticipantName] = useState(searchParams.get("participantName") ?? "");
  const [participantQuery, setParticipantQuery] = useState("");
  const [participantResults, setParticipantResults] = useState<ParticipantResult[]>([]);
  const [fields, setFields] = useState<ActivityFormFields>(emptyActivityFields);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.user?.organizations ?? []).map((o: { id: string; name: string }) => ({
          id: o.id,
          name: o.name,
        }));
        setOrgs(list);
        if (!orgId && list.length === 1) setOrgId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!participantQuery.trim() || participantHandle) {
      setParticipantResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(participantQuery.trim())}`);
      const data = await res.json();
      setParticipantResults((data.results ?? []).filter((r: { type: string }) => r.type === "participant"));
    }, 250);
    return () => clearTimeout(t);
  }, [participantQuery, participantHandle]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !participantHandle) {
      setError("Choose which organization you're acting as and who the record is for.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/activity/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        participantHandle: normalizeHandle(participantHandle),
        ...activityFieldsToPayload(fields),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "participant_not_found" ? "No participant found with that handle." : "Couldn't create the record.");
      return;
    }
    const data = await res.json();
    router.push(`/activity/${data.record.id}`);
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <Link href="/activity" className="text-sm text-muted-foreground">
        ← Back
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Create activity record</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Volunteer and community-service records confirm immediately. Other categories are sent to
          the participant to accept.
        </p>
      </div>

      {orgs.length > 1 && (
        <div>
          <label className="text-sm font-medium">Acting as</label>
          <select
            className="mt-1 flex h-12 w-full rounded-md border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            <option value="">Choose an organization</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {participantHandle ? (
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
          Creating a record for <span className="font-semibold">{participantName || `@${participantHandle}`}</span>{" "}
          <button
            type="button"
            className="ml-2 text-xs underline"
            onClick={() => {
              setParticipantHandle("");
              setParticipantName("");
            }}
          >
            change
          </button>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium">Participant</label>
          <Input
            className="mt-1"
            value={participantQuery}
            onChange={(e) => setParticipantQuery(e.target.value)}
            placeholder="Search participant handle or name"
          />
          {participantResults.length > 0 && (
            <div className="mt-2 flex flex-col divide-y divide-border rounded-md border border-border">
              {participantResults.map((r) => (
                <button
                  key={r.handle}
                  type="button"
                  className="p-3 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setParticipantHandle(r.handle);
                    setParticipantName(r.displayName);
                  }}
                >
                  {r.displayName} · @{r.handle}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <ActivityFieldsForm value={fields} onChange={setFields} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading || !fields.title || !orgId || !participantHandle}>
          {loading ? "Creating..." : "Create record"}
        </Button>
      </form>
    </div>
  );
}

export default function NewOrgRecordPage() {
  return (
    <Suspense fallback={null}>
      <NewOrgRecordForm />
    </Suspense>
  );
}
