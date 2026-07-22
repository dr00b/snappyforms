"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  activityRecordId: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setLoading(false);
      });
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <Link href="/settings" className="text-sm text-muted-foreground">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold">Notifications</h1>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {!loading && notifications.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
      )}

      <div className="flex flex-col gap-2">
        {notifications.map((n) => {
          const content = (
            <Card className={n.readAt ? "opacity-60" : ""}>
              <CardContent className="flex flex-col gap-1 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {!n.readAt && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          );

          return (
            <div key={n.id} onClick={() => !n.readAt && markRead(n.id)}>
              {n.activityRecordId ? <Link href={`/activity/${n.activityRecordId}`}>{content}</Link> : content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
