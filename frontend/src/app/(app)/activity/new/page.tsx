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

type Member = { membershipId: string; displayName: string; role: string };
type OrgResult = { type: "organization"; handle: string; displayName: string };

function NewActivityRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orgId, setOrgId] = useState(searchParams.get("orgId") ?? "");
  const [orgName, setOrgName] = useState(searchParams.get("orgName") ?? "");
  const [orgQuery, setOrgQuery] = useState("");
  const [orgResults, setOrgResults] = useState<OrgResult[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [verifierMembershipId, setVerifierMembershipId] = useState("");
  const [fields, setFields] = useState<ActivityFormFields>(() => {
    const title = searchParams.get("title");
    return title ? { ...emptyActivityFields, title } : emptyActivityFields;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgQuery.trim() || orgId) {
      setOrgResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(orgQuery.trim())}`);
      const data = await res.json();
      setOrgResults((data.results ?? []).filter((r: { type: string }) => r.type === "organization"));
    }, 250);
    return () => clearTimeout(t);
  }, [orgQuery, orgId]);

  useEffect(() => {
    if (!orgId) {
      setMembers([]);
      return;
    }
    fetch(`/api/organizations/${orgId}/members`)
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []));
  }, [orgId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) {
      setError("Choose an organization first.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/activity/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        verifierMembershipId: verifierMembershipId || undefined,
        ...activityFieldsToPayload(fields),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Couldn't submit the request. Check the form and try again.");
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
        <h1 className="text-2xl font-bold">Request verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about the activity and who can confirm it.
        </p>
      </div>

      {orgId ? (
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
          Requesting from <span className="font-semibold">{orgName || "this organization"}</span>{" "}
          <button type="button" className="ml-2 text-xs underline" onClick={() => { setOrgId(""); setOrgName(""); }}>
            change
          </button>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium">Organization</label>
          <Input className="mt-1" value={orgQuery} onChange={(e) => setOrgQuery(e.target.value)} placeholder="Search organization handle or name" />
          {orgResults.length > 0 && (
            <div className="mt-2 flex flex-col divide-y divide-border rounded-md border border-border">
              {orgResults.map((r) => (
                <button
                  key={r.handle}
                  type="button"
                  className="p-3 text-left text-sm hover:bg-muted"
                  onClick={async () => {
                    const idRes = await fetch(`/api/organizations/by-handle/${r.handle}`);
                    if (idRes.ok) {
                      const idData = await idRes.json();
                      setOrgId(idData.id);
                      setOrgName(idData.name);
                    }
                  }}
                >
                  {r.displayName} · @{r.handle}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {orgId && (
        <div>
          <label className="text-sm font-medium">Verifier (optional)</label>
          <select
            className="mt-1 flex h-12 w-full rounded-md border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={verifierMembershipId}
            onChange={(e) => setVerifierMembershipId(e.target.value)}
          >
            <option value="">Any available reviewer</option>
            {members.map((m) => (
              <option key={m.membershipId} value={m.membershipId}>
                {m.displayName} ({m.role === "ADMIN" ? "Admin" : "Member"})
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <ActivityFieldsForm value={fields} onChange={setFields} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading || !fields.title || !orgId}>
          {loading ? "Submitting..." : "Submit request"}
        </Button>
      </form>
    </div>
  );
}

export default function NewActivityRequestPage() {
  return (
    <Suspense fallback={null}>
      <NewActivityRequestForm />
    </Suspense>
  );
}
