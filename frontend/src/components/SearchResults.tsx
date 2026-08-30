"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";

export type SearchResult =
  | { type: "participant"; handle: string; displayName: string; avatarColor?: string }
  | { type: "organization"; handle: string; displayName: string; orgType?: string };

export function SearchResults({ results }: { results: SearchResult[] }) {
  if (results.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No matches yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {results.map((r) => (
        <Link
          key={`${r.type}-${r.handle}`}
          href={r.type === "participant" ? `/u/${r.handle}` : `/o/${r.handle}`}
          className="flex items-center gap-3 py-3"
        >
          <Avatar>
            <AvatarFallback>{initials(r.displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold">{r.displayName}</p>
            <p className="text-xs text-muted-foreground">@{r.handle}</p>
          </div>
          <Badge variant={r.type === "participant" ? "muted" : "secondary"}>
            {r.type === "participant" ? "Person" : "Organization"}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
