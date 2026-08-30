"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type Domain = {
  id: string;
  domain: string;
  status: string;
  verificationToken: string;
  allowAutoJoin: boolean;
};

type Location = {
  id: string;
  name: string;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
};

export default function OrganizationSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [domainInput, setDomainInput] = useState("");
  const [domainAutoJoin, setDomainAutoJoin] = useState(false);

  const [locationForm, setLocationForm] = useState({
    name: "",
    addressLine1: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
  });
  const [showLocationForm, setShowLocationForm] = useState(false);

  async function load() {
    const [domainsRes, locationsRes] = await Promise.all([
      fetch(`/api/organizations/${params.id}/domains`),
      fetch(`/api/organizations/${params.id}/locations`),
    ]);

    if (domainsRes.status === 403 || domainsRes.status === 401) {
      setError("admin_required");
      return;
    }

    const domainsJson = await domainsRes.json();
    const locationsJson = await locationsRes.json();
    setDomains(domainsJson.domains ?? []);
    setLocations(locationsJson.locations ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function claimDomain() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${params.id}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput, allowAutoJoin: domainAutoJoin }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "request_failed");
        return;
      }
      setDomainInput("");
      setDomainAutoJoin(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyDomain(domainId: string) {
    setSubmitting(true);
    try {
      await fetch(`/api/organizations/${params.id}/domains/${domainId}/verify`, { method: "POST" });
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAutoJoin(domainId: string, allowAutoJoin: boolean) {
    setSubmitting(true);
    try {
      await fetch(`/api/organizations/${params.id}/domains/${domainId}/auto-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowAutoJoin }),
      });
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function createLocation() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${params.id}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: locationForm.name,
          addressLine1: locationForm.addressLine1 || undefined,
          city: locationForm.city || undefined,
          state: locationForm.state || undefined,
          zip: locationForm.zip || undefined,
          phone: locationForm.phone || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "request_failed");
        return;
      }
      setLocationForm({ name: "", addressLine1: "", city: "", state: "", zip: "", phone: "" });
      setShowLocationForm(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  if (error === "admin_required") {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <p className="text-sm text-destructive">You need to be an active admin of this organization to view this page.</p>
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Organization settings</h1>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Verified domains</h2>
        <p className="text-sm text-muted-foreground">
          Members with a matching, verified email domain can find and join this organization.
        </p>

        {domains?.map((d) => (
          <Card key={d.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{d.domain}</CardTitle>
                <Badge variant={d.status === "VERIFIED" ? "default" : "muted"}>{d.status}</Badge>
              </div>
              {d.status === "PENDING" && (
                <CardDescription>
                  Add a DNS TXT record with value <code className="rounded bg-muted px-1">{d.verificationToken}</code> to
                  verify ownership (simulated for this demo).
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {d.status === "PENDING" && (
                <Button size="sm" disabled={submitting} onClick={() => verifyDomain(d.id)}>
                  Verify domain
                </Button>
              )}
              {d.status === "VERIFIED" && (
                <Button
                  size="sm"
                  variant={d.allowAutoJoin ? "outline" : "default"}
                  disabled={submitting}
                  onClick={() => toggleAutoJoin(d.id, !d.allowAutoJoin)}
                >
                  {d.allowAutoJoin ? "Disable auto-join" : "Enable auto-join"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Claim a new domain</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium">Domain</label>
              <Input
                className="mt-1"
                placeholder="example.org"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={domainAutoJoin} onChange={(e) => setDomainAutoJoin(e.target.checked)} />
              Allow auto-join (skip admin approval for new members with this domain)
            </label>
            <Button disabled={submitting || !domainInput.trim()} onClick={claimDomain}>
              Claim domain
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-base font-semibold">Locations</h2>

        {locations?.map((loc) => (
          <Card key={loc.id}>
            <CardHeader>
              <CardTitle className="text-base">{loc.name}</CardTitle>
              {(loc.addressLine1 || loc.city) && (
                <CardDescription>
                  {[loc.addressLine1, loc.city, loc.state, loc.zip].filter(Boolean).join(", ")}
                </CardDescription>
              )}
            </CardHeader>
          </Card>
        ))}

        {locations?.length === 0 && !showLocationForm && (
          <p className="text-sm text-muted-foreground">No locations yet.</p>
        )}

        {showLocationForm ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New location</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  className="mt-1"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  className="mt-1"
                  value={locationForm.addressLine1}
                  onChange={(e) => setLocationForm({ ...locationForm, addressLine1: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="City"
                  value={locationForm.city}
                  onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                />
                <Input
                  placeholder="State"
                  value={locationForm.state}
                  onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                />
                <Input
                  placeholder="Zip"
                  value={locationForm.zip}
                  onChange={(e) => setLocationForm({ ...locationForm, zip: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  className="mt-1"
                  value={locationForm.phone}
                  onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button disabled={submitting || !locationForm.name.trim()} onClick={createLocation}>
                  Add location
                </Button>
                <Button variant="ghost" onClick={() => setShowLocationForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" onClick={() => setShowLocationForm(true)}>
            Add a location
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-base font-semibold">Volunteer opportunities</h2>
        <p className="text-sm text-muted-foreground">
          Post opportunities for participants to find, sign up for, and check into.
        </p>
        <Button asChild variant="outline">
          <Link href={`/organization/${params.id}/opportunities/new`}>Create an opportunity</Link>
        </Button>
      </section>

      {error && error !== "admin_required" && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
