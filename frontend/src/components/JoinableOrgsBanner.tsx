"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type JoinableOrg = {
  organizationId: string;
  organizationName: string;
  organizationHandle: string | null;
  allowAutoJoin: boolean;
};

export function JoinableOrgsBanner() {
  const [orgs, setOrgs] = useState<JoinableOrg[] | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/organizations/joinable")
      .then((res) => (res.ok ? res.json() : { organizations: [] }))
      .then((data) => setOrgs(data.organizations ?? []))
      .catch(() => setOrgs([]));
  }, []);

  if (!orgs || orgs.length === 0) return null;

  async function handleJoin(org: JoinableOrg) {
    setJoiningId(org.organizationId);
    try {
      const res = await fetch(`/api/organizations/${org.organizationId}/join`, { method: "POST" });
      if (res.ok) {
        setJoinedIds((prev) => new Set(prev).add(org.organizationId));
      }
    } finally {
      setJoiningId(null);
    }
  }

  const remaining = orgs.filter((o) => !joinedIds.has(o.organizationId));
  if (remaining.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {remaining.map((org) => (
        <Card key={org.organizationId} className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Join {org.organizationName}?</CardTitle>
            <CardDescription>
              Your email matches this organization's verified domain.{" "}
              {org.allowAutoJoin
                ? "You can join and start verifying activity right away."
                : "An admin will need to approve your request."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleJoin(org)} disabled={joiningId === org.organizationId}>
              {joiningId === org.organizationId
                ? "Joining..."
                : org.allowAutoJoin
                  ? "Join organization"
                  : "Request to join"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
