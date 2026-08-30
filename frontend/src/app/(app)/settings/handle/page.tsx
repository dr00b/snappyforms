"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HandlePicker } from "@/components/HandlePicker";

export default function ChangeHandlePage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/settings/handle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "cooldown_active"
          ? "You can change your handle once per day."
          : data.error === "handle_taken"
          ? "That handle is already taken."
          : "Couldn't change your handle."
      );
      return;
    }
    router.push("/settings");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <Link href="/settings" className="text-sm text-muted-foreground">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold">Change handle</h1>
      <p className="text-sm text-muted-foreground">
        Handles can be changed once every 24 hours. Your old handle becomes available for others to
        claim.
      </p>

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <HandlePicker value={handle} onChange={setHandle} onStatusChange={setAvailable} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading || !available}>
          {loading ? "Saving..." : "Save new handle"}
        </Button>
      </form>
    </div>
  );
}
