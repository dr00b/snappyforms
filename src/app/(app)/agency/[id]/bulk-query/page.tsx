"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type BenefitProgram = { id: string; name: string };
type JobSummary = {
  id: string;
  benefitProgramName: string;
  totalCases: number;
  includedCount: number;
  excludedCount: number;
  createdAt: string;
};

export default function BulkQueryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [benefitPrograms, setBenefitPrograms] = useState<BenefitProgram[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/agency/${params.id}/bulk-query`);
    if (!res.ok) return;
    const data = await res.json();
    setBenefitPrograms(data.benefitPrograms ?? []);
    setJobs(data.jobs ?? []);
    if (!selectedProgramId && data.benefitPrograms?.length) {
      setSelectedProgramId(data.benefitPrograms[0].id);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function runQuery() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/${params.id}/bulk-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benefitProgramId: selectedProgramId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "request_failed");
        return;
      }
      router.push(`/agency/${params.id}/bulk-query/${data.jobId}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Bulk query</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run a bulk verification query</CardTitle>
          <CardDescription>
            Checks every open case for a program against its confirmed hours this month.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <select
            className="flex h-12 w-full rounded-md border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
          >
            {benefitPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button disabled={running || !selectedProgramId} onClick={runQuery}>
            {running ? "Running..." : "Run bulk query"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Past runs</h2>
        {jobs.length === 0 && <p className="text-sm text-muted-foreground">No bulk queries run yet.</p>}
        {jobs.map((job) => (
          <Link key={job.id} href={`/agency/${params.id}/bulk-query/${job.id}`}>
            <Card className="transition hover:border-primary">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">{job.benefitProgramName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {job.includedCount} included · {job.excludedCount} excluded
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
