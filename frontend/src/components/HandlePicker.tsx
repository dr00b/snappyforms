"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { normalizeHandle } from "@/lib/utils";

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

export function HandlePicker({
  value,
  onChange,
  onStatusChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onStatusChange?: (available: boolean) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const normalized = normalizeHandle(value);
    if (normalized.length < 3) {
      setStatus("idle");
      onStatusChange?.(false);
      return;
    }
    setStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handles/check?value=${encodeURIComponent(normalized)}`);
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          onStatusChange?.(false);
          return;
        }
        setStatus(data.available ? "available" : "taken");
        onStatusChange?.(data.available);
      } catch {
        setStatus("invalid");
        onStatusChange?.(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div>
      <div className="flex items-center rounded-md border border-border bg-card focus-within:ring-2 focus-within:ring-primary">
        <span className="pl-4 text-muted-foreground">@</span>
        <Input
          className="border-0 focus-visible:ring-0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
          placeholder="your-handle"
          maxLength={30}
        />
      </div>
      <p className="mt-1 h-4 text-xs">
        {status === "checking" && <span className="text-muted-foreground">Checking availability...</span>}
        {status === "available" && <span className="text-primary">@{normalizeHandle(value)} is available</span>}
        {status === "taken" && <span className="text-destructive">That handle is already taken</span>}
        {status === "invalid" && (
          <span className="text-destructive">Use 3-30 lowercase letters, numbers, or hyphens</span>
        )}
      </p>
    </div>
  );
}
