import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, Building2 } from "lucide-react";

export default async function OnboardingPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  if (session.user.participantProfile || session.user.organizationMembers.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Welcome to VERWOVO</h1>
        <p className="mt-1 text-sm text-muted-foreground">How will you be using VERWOVO?</p>
      </div>

      <Link href="/onboarding/participant">
        <Card className="transition hover:border-primary">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <User className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>I&apos;m an individual</CardTitle>
              <CardDescription>Track and verify my own work, volunteer, and training activity.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Link>

      <Link href="/onboarding/organization">
        <Card className="transition hover:border-primary">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>I&apos;m registering an organization</CardTitle>
              <CardDescription>Verify activity for participants and manage members.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
