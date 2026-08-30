"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HandlePicker } from "@/components/HandlePicker";

export default function ParticipantOnboardingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleAvailable, setHandleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/onboarding/participant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, handle }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "handle_taken" ? "That handle was just taken — try another." : "Something went wrong.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Create your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a display name and a handle people can search for.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div>
          <label className="text-sm font-medium">Display name</label>
          <Input
            className="mt-1"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Maya Johnson"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Handle</label>
          <div className="mt-1">
            <HandlePicker value={handle} onChange={setHandle} onStatusChange={setHandleAvailable} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading || !handleAvailable || displayName.trim().length < 2}>
          {loading ? "Creating..." : "Create profile"}
        </Button>
      </form>
    </div>
  );
}
