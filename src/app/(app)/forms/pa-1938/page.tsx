"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

type ConfirmedRecord = {
  id: string;
  title: string;
  category: string;
  activityDate: string | null;
  totalHours: number | null;
  organizationName: string;
  organizationHandle: string | null;
};

type OrgOption = { id: string; name: string };
type Member = { membershipId: string; displayName: string; role: string };

const STEPS = ["Activity", "Volunteer", "Agency", "Service", "Review"] as const;

export default function Pa1938WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [records, setRecords] = useState<ConfirmedRecord[]>([]);
  const [orgIdByHandle, setOrgIdByHandle] = useState<Record<string, string>>({});
  const [selectedOrgHandle, setSelectedOrgHandle] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [verifierMembershipId, setVerifierMembershipId] = useState("");

  const [participant, setParticipant] = useState({
    fullName: "",
    dob: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [agency, setAgency] = useState({ name: "", phone: "", address: "", city: "", state: "", zip: "" });
  const [service, setService] = useState({
    startDate: "",
    endDate: "",
    transportationProvided: false,
    week1Hours: "0",
    week2Hours: "0",
    week3Hours: "0",
    week4Hours: "0",
    tasks: ["", "", ""],
  });

  const [submitting, setSubmitting] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.participant?.displayName) {
          setParticipant((p) => ({ ...p, fullName: data.user.participant.displayName }));
        }
      });
    fetch("/api/activity?status=CONFIRMED")
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.records ?? []).filter((r: ConfirmedRecord) =>
          ["VOLUNTEER", "COMMUNITY_SERVICE"].includes(r.category)
        );
        setRecords(filtered);
      });
  }, []);

  const orgOptions: OrgOption[] = Array.from(
    new Map(records.map((r) => [r.organizationHandle, { id: r.organizationHandle ?? "", name: r.organizationName }])).values()
  );

  async function selectOrg(handle: string) {
    setSelectedOrgHandle(handle);
    setSelectedRecordId("");
    setVerifierMembershipId("");
    const idRes = await fetch(`/api/organizations/by-handle/${handle}`);
    if (idRes.ok) {
      const idData = await idRes.json();
      setOrgIdByHandle((m) => ({ ...m, [handle]: idData.id }));
      const detailRes = await fetch(`/api/organizations/${idData.id}`);
      if (detailRes.ok) {
        const org = await detailRes.json();
        setAgency({
          name: org.name ?? "",
          phone: org.phone ?? "",
          address: org.addressLine1 ?? "",
          city: org.city ?? "",
          state: org.state ?? "",
          zip: org.zip ?? "",
        });
      }
      const membersRes = await fetch(`/api/organizations/${idData.id}/members`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members ?? []);
      }
    }
  }

  function selectRecord(id: string) {
    setSelectedRecordId(id);
    const record = records.find((r) => r.id === id);
    if (record?.activityDate) {
      setService((s) => ({ ...s, startDate: record.activityDate!.slice(0, 10), endDate: record.activityDate!.slice(0, 10) }));
    }
    if (record?.totalHours) {
      setService((s) => ({ ...s, week1Hours: String(record.totalHours) }));
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/form-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant,
        agency,
        service: {
          ...service,
          week1Hours: Number(service.week1Hours) || 0,
          week2Hours: Number(service.week2Hours) || 0,
          week3Hours: Number(service.week3Hours) || 0,
          week4Hours: Number(service.week4Hours) || 0,
          tasks: service.tasks.filter(Boolean),
        },
        organizationId: orgIdByHandle[selectedOrgHandle],
        verifierMembershipId: verifierMembershipId || undefined,
        sourceRecordId: selectedRecordId || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Couldn't send the request. Check the required fields and try again.");
      return;
    }
    const data = await res.json();
    setResultId(data.id);
  }

  if (resultId) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <h1 className="text-2xl font-bold">Sent for certification</h1>
        <p className="text-sm text-muted-foreground">
          Your PA 1938 request was sent to {agency.name || "the organization"} for a site manager
          to review and certify. You&apos;ll be notified once it&apos;s certified, and you can then
          finalize and download the PDF.
        </p>
        <Button asChild>
          <Link href={`/forms/requests/${resultId}`}>View request</Link>
        </Button>
        <Button variant="ghost" onClick={() => router.push("/forms")}>
          Back to Forms
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <Link href="/forms" className="text-sm text-muted-foreground">
        ← Back
      </Link>
      <div>
        <h1 className="text-2xl font-bold">PA 1938 demonstration form</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          You&apos;ll fill in your info and the service details. A site manager at the organization
          certifies it before it becomes a final document.
        </p>
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Choose the organization this form is for. Only organizations where you have a confirmed
            volunteer or community-service record are shown.
          </p>
          {orgOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any confirmed volunteer records yet.
            </p>
          )}
          {orgOptions.map((o) => (
            <label key={o.id} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
              <input
                type="radio"
                name="org"
                checked={selectedOrgHandle === o.id}
                onChange={() => selectOrg(o.id)}
              />
              {o.name}
            </label>
          ))}
          {selectedOrgHandle && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Optional: prefill from a specific record</p>
              {records
                .filter((r) => r.organizationHandle === selectedOrgHandle)
                .map((r) => (
                  <label key={r.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-xs">
                    <input type="radio" name="record" checked={selectedRecordId === r.id} onChange={() => selectRecord(r.id)} />
                    {r.title} — {r.activityDate ? new Date(r.activityDate).toLocaleDateString() : "—"} · {r.totalHours ?? 0}h
                  </label>
                ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <Field label="Full name" value={participant.fullName} onChange={(v) => setParticipant((p) => ({ ...p, fullName: v }))} />
          <Field label="Date of birth" type="date" value={participant.dob} onChange={(v) => setParticipant((p) => ({ ...p, dob: v }))} />
          <Field label="Address" value={participant.address} onChange={(v) => setParticipant((p) => ({ ...p, address: v }))} />
          <div className="grid grid-cols-3 gap-2">
            <Field label="City" value={participant.city} onChange={(v) => setParticipant((p) => ({ ...p, city: v }))} />
            <Field label="State" value={participant.state} onChange={(v) => setParticipant((p) => ({ ...p, state: v }))} />
            <Field label="ZIP" value={participant.zip} onChange={(v) => setParticipant((p) => ({ ...p, zip: v }))} />
          </div>
          <p className="text-xs text-muted-foreground">
            Your Social Security number isn&apos;t collected here — you can optionally add the last
            4 digits later, only when you finalize the certified PDF yourself.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <Field label="Agency name" value={agency.name} onChange={(v) => setAgency((a) => ({ ...a, name: v }))} />
          <Field label="Agency phone" value={agency.phone} onChange={(v) => setAgency((a) => ({ ...a, phone: v }))} />
          <Field label="Agency address" value={agency.address} onChange={(v) => setAgency((a) => ({ ...a, address: v }))} />
          <div className="grid grid-cols-3 gap-2">
            <Field label="City" value={agency.city} onChange={(v) => setAgency((a) => ({ ...a, city: v }))} />
            <Field label="State" value={agency.state} onChange={(v) => setAgency((a) => ({ ...a, state: v }))} />
            <Field label="ZIP" value={agency.zip} onChange={(v) => setAgency((a) => ({ ...a, zip: v }))} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Service start date" type="date" value={service.startDate} onChange={(v) => setService((s) => ({ ...s, startDate: v }))} />
            <Field label="Expected end date" type="date" value={service.endDate} onChange={(v) => setService((s) => ({ ...s, endDate: v }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={service.transportationProvided}
              onChange={(e) => setService((s) => ({ ...s, transportationProvided: e.target.checked }))}
            />
            Transportation provided at no cost
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label="Week 1 hrs" type="number" value={service.week1Hours} onChange={(v) => setService((s) => ({ ...s, week1Hours: v }))} />
            <Field label="Week 2 hrs" type="number" value={service.week2Hours} onChange={(v) => setService((s) => ({ ...s, week2Hours: v }))} />
            <Field label="Week 3 hrs" type="number" value={service.week3Hours} onChange={(v) => setService((s) => ({ ...s, week3Hours: v }))} />
            <Field label="Week 4 hrs" type="number" value={service.week4Hours} onChange={(v) => setService((s) => ({ ...s, week4Hours: v }))} />
          </div>
          <p className="text-sm font-medium">Task descriptions (up to 3)</p>
          {service.tasks.map((t, i) => (
            <Input
              key={i}
              value={t}
              onChange={(e) => {
                const tasks = [...service.tasks];
                tasks[i] = e.target.value;
                setService((s) => ({ ...s, tasks }));
              }}
              placeholder={`Task ${i + 1}`}
            />
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium">Send to (optional)</label>
            <select
              className="mt-1 flex h-12 w-full rounded-md border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={verifierMembershipId}
              onChange={(e) => setVerifierMembershipId(e.target.value)}
            >
              <option value="">Any available site manager</option>
              {members.map((m) => (
                <option key={m.membershipId} value={m.membershipId}>
                  {m.displayName} ({m.role === "ADMIN" ? "Admin" : "Member"})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-border p-4 text-sm">
            <p className="font-semibold">{participant.fullName}</p>
            <p className="text-muted-foreground">
              {agency.name} · {service.startDate || "—"} to {service.endDate || "—"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              After you send this, a site manager at {agency.name || "the organization"} reviews and
              certifies it. You&apos;ll finalize and download the PDF once it&apos;s certified.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      <div className="flex gap-2">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !selectedOrgHandle}>
            Continue
          </Button>
        ) : (
          <Button disabled={submitting} onClick={submit}>
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Sending..." : "Send for certification"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <Input className="mt-1" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
