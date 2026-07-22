"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const DEMO_ACCOUNTS = [
  { seed: "maya", label: "Maya Johnson", sub: "Participant · @maya-j" },
  { seed: "northside-admin", label: "Northside Admin", sub: "Org admin · @northside-center" },
  { seed: "keystone-admin", label: "Keystone Admin", sub: "Business admin · @keystone-services" },
  { seed: "dcao-admin", label: "DCAO Admin", sub: "Agency admin · Demonstration County" },
] as const;

export function DemoLoginButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  async function login(seed: string) {
    setLoading(seed);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "demo_account_not_seeded" ? "Run `npm run db:seed` first." : "Could not log in.");
        return;
      }
      router.push(data.needsOnboarding ? "/onboarding" : "/dashboard");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Demo logins (sandbox only)
      </p>
      {DEMO_ACCOUNTS.map((account) => (
        <Button
          key={account.seed}
          type="button"
          variant="outline"
          className="justify-start"
          disabled={loading !== null}
          onClick={() => login(account.seed)}
        >
          <span className="flex flex-col items-start">
            <span>{loading === account.seed ? "Signing in..." : account.label}</span>
            <span className="text-xs font-normal text-muted-foreground">{account.sub}</span>
          </span>
        </Button>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
