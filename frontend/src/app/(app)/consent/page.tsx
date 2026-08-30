"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type ConsentCase = {
  id: string;
  agencyName: string;
  benefitProgramName: string;
  status: string;
  hasConsent: boolean;
  grantedAt: string | null;
};

export default function ConsentPage() {
  const [cases, setCases] = useState<ConsentCase[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/consent");
    if (!res.ok) {
      setCases([]);
      return;
    }
    const data = await res.json();
    setCases(data.cases ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function grant(caseId: string) {
    setBusyId(caseId);
    try {
      await fetch(`/api/consent/${caseId}/grant`, { method: "POST" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(caseId: string) {
    setBusyId(caseId);
    try {
      await fetch(`/api/consent/${caseId}/revoke`, { method: "POST" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-bold">Consent center</h1>
      <p className="text-sm text-muted-foreground">
        Agencies with an open case for you can only see your confirmed activity hours if you
        grant consent below. You can revoke access at any time.
      </p>

      {cases === null && <p className="text-sm text-muted-foreground">Loading...</p>}
      {cases?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No agencies have an open case for you yet.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {cases?.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{c.agencyName}</CardTitle>
                <Badge variant={c.hasConsent ? "default" : "muted"}>
                  {c.hasConsent ? "Active" : "Not shared"}
                </Badge>
              </div>
              <CardDescription>{c.benefitProgramName}</CardDescription>
            </CardHeader>
            <CardContent>
              {c.hasConsent ? (
                <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => revoke(c.id)}>
                  Revoke
                </Button>
              ) : (
                <Button size="sm" disabled={busyId === c.id} onClick={() => grant(c.id)}>
                  Grant
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
