"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type CaseDetail = {
  id: string;
  participantName: string;
  benefitProgramName: string;
  requiredHoursPerMonth: number | null;
  maskedCaseNumber: string;
  status: string;
  hasConsent: boolean;
  isAdmin: boolean;
  hours:
    | { status: "no_consent" }
    | { status: "case_not_found" }
    | { status: "ok"; hoursConfirmed: number; hoursRequired: number | null; meetsRequirement: boolean | null };
};

export default function AgencyCaseDetailPage() {
  const params = useParams<{ id: string; caseId: string }>();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedNumber, setRevealedNumber] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    fetch(`/api/agency/${params.id}/cases/${params.caseId}`)
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json();
          setError(json.error ?? "request_failed");
          return;
        }
        const json = await res.json();
        setData(json.case);
      })
      .catch(() => setError("request_failed"));
  }, [params.id, params.caseId]);

  async function revealCaseNumber() {
    setRevealing(true);
    try {
      const res = await fetch(
        `/api/agency/${params.id}/cases/${params.caseId}/reveal-case-number`,
        { method: "POST" }
      );
      const json = await res.json();
      if (res.ok) setRevealedNumber(json.caseNumber);
    } finally {
      setRevealing(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <p className="text-sm text-destructive">Couldn't load this case.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-2">
        <Link href={`/agency/${params.id}/cases`}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">{data.participantName}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{data.benefitProgramName}</CardTitle>
            <Badge variant={data.status === "OPEN" ? "default" : "muted"}>{data.status}</Badge>
          </div>
          <CardDescription>
            Case number: {revealedNumber ?? data.maskedCaseNumber}
            {data.requiredHoursPerMonth != null && ` · Requires ${data.requiredHoursPerMonth} hrs/month`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.isAdmin && !revealedNumber && (
            <Button size="sm" variant="outline" disabled={revealing} onClick={revealCaseNumber}>
              {revealing ? "Revealing..." : "Reveal case number"}
            </Button>
          )}

          {data.hours.status === "ok" ? (
            <div>
              <p className="text-sm font-medium">
                {data.hours.hoursConfirmed} confirmed hour{data.hours.hoursConfirmed === 1 ? "" : "s"} this month
              </p>
              {data.hours.meetsRequirement != null && (
                <Badge variant={data.hours.meetsRequirement ? "default" : "warning"}>
                  {data.hours.meetsRequirement ? "Meets requirement" : "Below requirement"}
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              The participant hasn't granted consent to share verified hours for this case yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
