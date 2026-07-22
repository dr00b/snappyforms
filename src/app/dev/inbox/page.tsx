import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshButton } from "@/components/RefreshButton";

export const dynamic = "force-dynamic";

export default async function DevInboxPage() {
  if (process.env.DEMO_MODE !== "true") {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        The dev notification inbox is disabled outside demo mode.
      </div>
    );
  }

  const notifications = await db.devNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dev inbox</h1>
          <p className="text-sm text-muted-foreground">
            This prototype never sends real email/SMS. Codes and links appear here instead.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="flex flex-col gap-3">
        {notifications.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing yet — request a code to see it here.</p>
        )}
        {notifications.map((n) => (
          <Card key={n.id}>
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{n.channel}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm font-medium">{n.subject}</p>
              <p className="text-xs text-muted-foreground">to {n.toIdentifier}</p>
              <p className="mt-1 break-words text-sm">{n.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
