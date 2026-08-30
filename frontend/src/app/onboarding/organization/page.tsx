"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HandlePicker } from "@/components/HandlePicker";

const ORG_TYPES = [
  { value: "NONPROFIT", label: "Nonprofit" },
  { value: "BUSINESS", label: "Business" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "OTHER", label: "Other" },
];

export default function OrganizationOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    type: "NONPROFIT",
    primaryEmail: "",
    website: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    zip: "",
    taxStatus: "",
    einDemo: "",
  });
  const [handle, setHandle] = useState("");
  const [handleAvailable, setHandleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/onboarding/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, handle }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "handle_taken" ? "That handle was just taken — try another." : "Check the form and try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Register your organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;ll become the organization&apos;s administrator. Domain verification and member
          approvals are demonstrated in a later phase of this prototype.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div>
          <label className="text-sm font-medium">Organization name</label>
          <Input className="mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium">Organization type</label>
          <select
            className="mt-1 flex h-12 w-full rounded-md border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            {ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Handle</label>
          <div className="mt-1">
            <HandlePicker value={handle} onChange={setHandle} onStatusChange={setHandleAvailable} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Primary business email</label>
          <Input
            className="mt-1"
            type="email"
            value={form.primaryEmail}
            onChange={(e) => set("primaryEmail", e.target.value)}
            placeholder="hello@yourorg.org"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Website (optional)</label>
          <Input className="mt-1" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
        </div>

        <div>
          <label className="text-sm font-medium">Phone</label>
          <Input className="mt-1" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-sm font-medium">Address</label>
            <Input className="mt-1" value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
          </div>
          <Input placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
          <Input placeholder="State" value={form.state} onChange={(e) => set("state", e.target.value)} />
          <Input placeholder="ZIP" value={form.zip} onChange={(e) => set("zip", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium">Tax status (optional, demonstration only)</label>
          <Input className="mt-1" value={form.taxStatus} onChange={(e) => set("taxStatus", e.target.value)} placeholder="e.g. 501(c)(3)" />
        </div>

        <div>
          <label className="text-sm font-medium">EIN (optional, demonstration only — not verified)</label>
          <Input className="mt-1" value={form.einDemo} onChange={(e) => set("einDemo", e.target.value)} placeholder="XX-XXXXXXX" />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading || !handleAvailable || form.name.trim().length < 2 || !form.primaryEmail}>
          {loading ? "Creating..." : "Register organization"}
        </Button>
      </form>
    </div>
  );
}
