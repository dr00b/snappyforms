import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, ShieldCheck, Search } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-between gap-10 px-6 py-10">
        <div>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            Demonstration prototype — not a government system
          </div>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            Your time. Verified and ready when you need it.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            VERWOVO helps you confirm work, volunteer, education, and training activities and keep
            trusted records ready to download or share.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <QrCode className="h-5 w-5 text-primary" />
                <p className="text-sm">Scan a handle, no forms to fill out on the spot.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="text-sm">Organizations confirm activity so records are trustworthy.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Search className="h-5 w-5 text-primary" />
                <p className="text-sm">Find people and organizations by simple, searchable handles.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link href="/login?intent=participant">Create My Account</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/login?intent=organization&next=/onboarding/organization">
              Register an Organization
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/login">Explore the Demo</Link>
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            VERWOVO does not determine benefit eligibility and never transmits real records to any
            government agency.
          </p>
        </div>
      </div>
    </div>
  );
}
