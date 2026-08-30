"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { SearchResults, type SearchResult } from "@/components/SearchResults";
import { Search as SearchIcon } from "lucide-react";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-bold">Search</h1>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search handles, people, or organizations"
        />
      </div>
      {loading && <p className="text-sm text-muted-foreground">Searching...</p>}
      {!loading && <SearchResults results={results} />}
    </div>
  );
}
