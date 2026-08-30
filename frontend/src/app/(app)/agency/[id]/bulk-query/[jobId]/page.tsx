"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type ResultRow = {
  participantName: string;
  maskedCaseNumber: string;
  included: boolean;
  excludedReason: string | null;
  hoursConfirmed: number | null;
  hoursRequired: number | null;
  meetsRequirement: boolean | null;
};

type JobDetail = {
  id: string;
  benefitProgramName: string;
  totalCases: number;
  includedCount: number;
  excludedCount: number;
  createdAt: string;
  results: ResultRow[];
};

export default function BulkQueryResultsPage() {
  const params = useParams<{ id: string; jobId: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);

  useEffect(() => {
    fetch(`/api/agency/${params.id}/bulk-query/${params.jobId}`)
      .then((r) => r.json())
      .then((data) => setJob(data.job));
  }, [params.id, params.jobId]);

  if (!job) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-2">
        <Link href={`/agency/${params.id}/bulk-query`}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">{job.benefitProgramName} — results</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {job.includedCount} included · {job.excludedCount} excluded
          </CardTitle>
          <CardDescription>Run on {new Date(job.createdAt).toLocaleString()}</CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-2">
        {job.results.map((r, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold">{r.participantName}</p>
                <p className="text-xs text-muted-foreground">{r.maskedCaseNumber}</p>
              </div>
              {r.included ? (
                <div className="flex flex-col items-end gap-1">
                  <p className="text-xs text-muted-foreground">
                    {r.hoursConfirmed} / {r.hoursRequired ?? "—"} hrs
                  </p>
                  <Badge variant={r.meetsRequirement ? "default" : "warning"}>
                    {r.meetsRequirement ? "Meets requirement" : "Below requirement"}
                  </Badge>
                </div>
              ) : (
                <Badge variant="muted">Excluded — {r.excludedReason === "NO_CONSENT" ? "no consent" : r.excludedReason}</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
