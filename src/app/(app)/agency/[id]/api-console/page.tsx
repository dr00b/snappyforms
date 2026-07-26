"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type ClientInfo = {
  id: string;
  name: string;
  clientId: string;
  scopes: string[];
  status: string;
  createdAt: string;
};

type RequestLogItem = {
  id: string;
  endpoint: string;
  method: string;
  outcome: string;
  statusCode: number;
  createdAt: string;
};

export default function ApiConsolePage() {
  const params = useParams<{ id: string }>();
  const [clients, setClients] = useState<ClientInfo[] | null>(null);
  const [recentRequests, setRecentRequests] = useState<RequestLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/agency/${params.id}/api-clients`);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "request_failed");
      return;
    }
    const data = await res.json();
    setClients(data.clients);
    setRecentRequests(data.recentRequests);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (error) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <p className="text-sm text-destructive">Admin access required to view the API console.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">API console</h1>
      </div>

      {clients?.map((client) => (
        <Card key={client.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{client.name}</CardTitle>
              <Badge variant={client.status === "ACTIVE" ? "default" : "muted"}>{client.status}</Badge>
            </div>
            <CardDescription>
              Client ID: <code className="rounded bg-muted px-1">{client.clientId}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              {client.scopes.map((s) => (
                <Badge key={s} variant="muted">
                  {s}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              The client secret is never shown here — it was issued once at seed time. Example call:
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`curl -X POST http://localhost:3000/api/agency-api/v1/cases/<caseId>/verification \\
  -H "x-snappyforms-client-id: ${client.clientId}" \\
  -H "x-snappyforms-client-secret: <secret>"`}
            </pre>
            <a
              className="text-xs text-primary underline"
              href="/api/agency-api/v1/openapi.json"
              target="_blank"
              rel="noreferrer"
            >
              View OpenAPI spec
            </a>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Recent API requests</h2>
        {recentRequests.length === 0 && (
          <p className="text-sm text-muted-foreground">No requests logged yet.</p>
        )}
        {recentRequests.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between p-3 text-xs">
              <div>
                <p className="font-medium">
                  {r.method} {r.endpoint}
                </p>
                <p className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
              </div>
              <Badge variant={r.outcome === "SUCCESS" ? "default" : "warning"}>
                {r.statusCode} {r.outcome}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
