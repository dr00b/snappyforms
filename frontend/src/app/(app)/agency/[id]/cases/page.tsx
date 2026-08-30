"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type CaseListItem = {
  id: string;
  participantName: string;
  benefitProgramName: string;
  maskedCaseNumber: string;
  status: string;
  hasConsent: boolean;
  hours:
    | { status: "no_consent" }
    | { status: "case_not_found" }
    | { status: "ok"; hoursConfirmed: number; hoursRequired: number | null; meetsRequirement: boolean | null };
};

export default function AgencyCasesPage() {
  const params = useParams<{ id: string }>();
  const [cases, setCases] = useState<CaseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agency/${params.id}/cases`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "request_failed");
          return;
        }
        const data = await res.json();
        setCases(data.cases);
      })
      .catch(() => setError("request_failed"));
  }, [params.id]);

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Cases</h1>
      </div>

      {error && <p className="text-sm text-destructive">You don't have access to this agency's cases.</p>}
      {!error && cases === null && <p className="text-sm text-muted-foreground">Loading...</p>}
      {cases?.length === 0 && <p className="text-sm text-muted-foreground">No cases yet.</p>}

      <div className="flex flex-col gap-3">
        {cases?.map((c) => (
          <Link key={c.id} href={`/agency/${params.id}/cases/${c.id}`}>
            <Card className="transition hover:border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{c.participantName}</CardTitle>
                  <Badge variant={c.status === "OPEN" ? "default" : "muted"}>{c.status}</Badge>
                </div>
                <CardDescription>
                  {c.benefitProgramName} · {c.maskedCaseNumber}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {c.hours.status === "ok" ? (
                  <p className="text-sm">
                    {c.hours.hoursConfirmed} confirmed hour{c.hours.hoursConfirmed === 1 ? "" : "s"} this month
                    {c.hours.hoursRequired != null && ` · ${c.hours.hoursRequired} required`}
                    {c.hours.meetsRequirement != null && (
                      <Badge className="ml-2" variant={c.hours.meetsRequirement ? "default" : "warning"}>
                        {c.hours.meetsRequirement ? "Meets requirement" : "Below requirement"}
                      </Badge>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No consent — hours not shared</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
