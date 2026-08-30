"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DemoLoginButtons } from "@/components/DemoLoginButtons";

type CodeStep = "identifier" | "code";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const linkError = searchParams.get("error");

  const [step, setStep] = useState<CodeStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (linkError === "expired_link") setError("That sign-in link expired. Request a new one.");
    if (linkError === "missing_token") setError("That sign-in link was invalid.");
  }, [linkError]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function goToDashboard(needsOnboarding: boolean) {
    router.push(needsOnboarding ? "/onboarding" : next || "/dashboard");
    router.refresh();
  }

  async function sendCode() {
    setError(null);
    setLoading(true);
    const { ok, data } = await postJson("/api/auth/request-code", { identifier, purpose: "LOGIN" });
    setLoading(false);
    if (!ok) {
      setError(data.message ?? "Couldn't send a code. Check the email or phone number.");
      return;
    }
    setInfo("Code sent. In this demo, open /dev/inbox to read it.");
    setStep("code");
    setCooldown(45);
  }

  async function verifyCode() {
    setError(null);
    setLoading(true);
    const { ok, data } = await postJson("/api/auth/verify-code", { identifier, code });
    setLoading(false);
    if (!ok) {
      setError(
        data.error === "invalid_code"
          ? "That code isn't right. Try again."
          : data.error === "too_many_attempts"
          ? "Too many attempts. Request a new code."
          : "That code expired. Request a new one."
      );
      return;
    }
    goToDashboard(data.needsOnboarding);
  }

  async function passwordLogin() {
    setError(null);
    setLoading(true);
    const { ok, data } = await postJson("/api/auth/password-login", { identifier, password });
    setLoading(false);
    if (!ok) {
      setError("Incorrect email/phone or password.");
      return;
    }
    goToDashboard(data.needsOnboarding);
  }

  async function magicLink() {
    setError(null);
    setLoading(true);
    const { ok, data } = await postJson("/api/auth/magic-link/request", { identifier });
    setLoading(false);
    if (!ok) {
      setError(data.message ?? "Couldn't send a link.");
      return;
    }
    setInfo("Link sent. In this demo, open /dev/inbox and tap it.");
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="code" onValueChange={() => { setError(null); setInfo(null); setStep("identifier"); }}>
        <TabsList>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="magic">Magic link</TabsTrigger>
        </TabsList>

        <TabsContent value="code">
          {step === "identifier" ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendCode();
              }}
            >
              <label className="text-sm font-medium">Email or mobile number</label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or 555-010-1234"
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send code"}
              </Button>
            </form>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                verifyCode();
              }}
            >
              <label className="text-sm font-medium">6-digit code sent to {identifier}</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                required
              />
              <Button type="submit" disabled={loading || code.length !== 6}>
                {loading ? "Verifying..." : "Verify & sign in"}
              </Button>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button type="button" className="underline" onClick={() => setStep("identifier")}>
                  Use a different email/phone
                </button>
                <button
                  type="button"
                  className="underline disabled:opacity-50"
                  disabled={cooldown > 0}
                  onClick={sendCode}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </TabsContent>

        <TabsContent value="password">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              passwordLogin();
            }}
          >
            <label className="text-sm font-medium">Email or mobile number</label>
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            <label className="text-sm font-medium">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="magic">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              magicLink();
            }}
          >
            <label className="text-sm font-medium">Email or mobile number</label>
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Email me a sign-in link"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {info && <p className="text-sm text-primary">{info}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {(info || step === "code") && (
        <Link href="/dev/inbox" target="_blank" className="text-center text-xs text-muted-foreground underline">
          Open the dev notification inbox
        </Link>
      )}

      <DemoLoginButtons />
    </div>
  );
}
