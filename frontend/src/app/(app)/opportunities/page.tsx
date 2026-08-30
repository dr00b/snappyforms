"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type OpportunityListItem = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  taskCategory: string | null;
  remoteOrInPerson: string;
  openings: number;
  signedUpCount: number;
  organizationName: string;
  organizationHandle: string | null;
  locationName: string | null;
};

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      const url = q.trim() ? `/api/opportunities?q=${encodeURIComponent(q.trim())}` : "/api/opportunities";
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          setOpportunities(data.opportunities ?? []);
          setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timeout);
  }, [q]);

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-bold">Volunteer opportunities</h1>
      <Input placeholder="Search by title or organization" value={q} onChange={(e) => setQ(e.target.value)} />

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {!loading && opportunities.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No upcoming opportunities found.</p>
      )}

      <div className="flex flex-col gap-3">
        {opportunities.map((o) => {
          const full = o.signedUpCount >= o.openings;
          return (
            <Link key={o.id} href={`/opportunities/${o.id}`}>
              <Card className="transition hover:border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{o.title}</CardTitle>
                    <Badge variant={full ? "muted" : "default"}>{full ? "Full" : `${o.openings - o.signedUpCount} open`}</Badge>
                  </div>
                  <CardDescription>
                    {o.organizationName}
                    {o.locationName ? ` · ${o.locationName}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(o.date).toLocaleDateString()}</span>
                  {o.startTime && <span>· {o.startTime}{o.endTime ? `–${o.endTime}` : ""}</span>}
                  {o.taskCategory && <Badge variant="muted">{o.taskCategory}</Badge>}
                  <Badge variant="outline">{o.remoteOrInPerson === "REMOTE" ? "Remote" : "In person"}</Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
