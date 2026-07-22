"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Session = {
  id: string;
  device: string;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/auth/sessions");
    const data = await res.json();
    setSessions(data.sessions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function revoke(id: string) {
    await fetch(`/api/auth/sessions/${id}/revoke`, { method: "POST" });
    await load();
  }

  async function revokeOthers() {
    await fetch("/api/auth/sessions/revoke-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeCurrent: false }),
    });
    await load();
  }

  async function signOutEverywhere() {
    await fetch("/api/auth/sessions/revoke-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeCurrent: true }),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <Link href="/settings" className="text-sm text-muted-foreground">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold">Devices &amp; sessions</h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{s.device}</p>
                    {s.isCurrent && <Badge>This device</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last active {new Date(s.lastSeenAt).toLocaleString()}
                  </p>
                </div>
                {!s.isCurrent && (
                  <Button variant="outline" size="sm" onClick={() => revoke(s.id)}>
                    Sign out
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <Button variant="outline" onClick={revokeOthers}>
          Sign out of all other devices
        </Button>
        <Button variant="destructive" onClick={signOutEverywhere}>
          Sign out of all devices (including this one)
        </Button>
      </div>
    </div>
  );
}
