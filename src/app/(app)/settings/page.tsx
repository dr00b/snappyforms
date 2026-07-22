import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { LogoutButton } from "@/components/LogoutButton";
import { ChevronRight, Smartphone, AtSign, Bell } from "lucide-react";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { user } = session;

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <p className="text-sm font-semibold">Signed in as</p>
          <p className="text-sm text-muted-foreground">{user.email ?? user.phone}</p>
        </CardContent>
      </Card>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {user.participantProfile && (
          <Link href="/settings/handle" className="flex items-center justify-between p-4">
            <span className="flex items-center gap-3 text-sm font-medium">
              <AtSign className="h-4 w-4 text-muted-foreground" /> Change handle
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
        <Link href="/settings/sessions" className="flex items-center justify-between p-4">
          <span className="flex items-center gap-3 text-sm font-medium">
            <Smartphone className="h-4 w-4 text-muted-foreground" /> Devices &amp; sessions
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link href="/notifications" className="flex items-center justify-between p-4">
          <span className="flex items-center gap-3 text-sm font-medium">
            <Bell className="h-4 w-4 text-muted-foreground" /> Notifications
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <LogoutButton />

      <p className="text-center text-xs text-muted-foreground">
        VERWOVO is a demonstration prototype. It is not affiliated with the Pennsylvania Department
        of Human Services and does not transmit real records to any government agency.
      </p>
    </div>
  );
}
