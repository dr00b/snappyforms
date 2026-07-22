"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  STATUS_LABELS,
  STATUS_BADGE_VARIANT,
  CATEGORY_LABELS,
  FORM_CERT_STATUS_LABELS,
  FORM_CERT_STATUS_BADGE_VARIANT,
} from "@/lib/activityLabels";

type Identity =
  | { key: "participant"; label: string }
  | { key: `org:${string}`; label: string; orgId: string; role: string };

type ActivityListItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  totalHours: number | null;
  activityDate: string | null;
  participantName: string;
  organizationName: string;
  hasFraudFlags: boolean;
  updatedAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  actor: string;
  targetType: string | null;
  priorStatus: string | null;
  newStatus: string | null;
  createdAt: string;
};

type FormCertRequestItem = {
  id: string;
  status: string;
  participantName: string;
  updatedAt: string;
};

type MemberItem = {
  membershipId: string;
  displayName: string;
  role: string;
  status: string;
  email?: string;
  joinedAt?: string;
  recordsVerified?: number;
  disputes?: number;
  lastActiveAt?: string | null;
  firstApprovalAt?: string | null;
  ratifiedAt?: string | null;
  needsRatification?: boolean;
};

const NEEDS_ACTION_ORG = ["AWAITING_ORGANIZATION"];
const NEEDS_ACTION_PARTICIPANT = ["AWAITING_PARTICIPANT", "CHANGES_REQUESTED"];

const MEMBER_STATUS_BADGE: Record<string, "default" | "muted" | "warning" | "outline"> = {
  ACTIVE: "default",
  PENDING: "warning",
  REQUESTED: "muted",
  SUSPENDED: "outline",
};

export default function ActivityPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [records, setRecords] = useState<ActivityListItem[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [formCertRequests, setFormCertRequests] = useState<FormCertRequestItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [tab, setTab] = useState("needs-action");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) return;
        const list: Identity[] = [];
        if (data.user.participant) {
          list.push({ key: "participant", label: "My records" });
        }
        for (const org of data.user.organizations) {
          list.push({ key: `org:${org.id}`, label: org.name, orgId: org.id, role: org.role });
        }
        setIdentities(list);
        setSelected(list[0]?.key ?? null);
      });
  }, []);

  const currentIdentity = identities.find((i) => i.key === selected);
  const isOrgAdmin = currentIdentity && "role" in currentIdentity && currentIdentity.role === "ADMIN";

  useEffect(() => {
    if (!currentIdentity) return;
    setLoading(true);
    const url = "orgId" in currentIdentity ? `/api/activity?orgId=${currentIdentity.orgId}` : "/api/activity";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data.records ?? []);
        setLoading(false);
      });
  }, [currentIdentity]);

  useEffect(() => {
    if (tab !== "audit" || !currentIdentity || !("orgId" in currentIdentity)) return;
    fetch(`/api/organizations/${currentIdentity.orgId}/audit-log`)
      .then((r) => r.json())
      .then((data) => setAuditEntries(data.entries ?? []));
  }, [tab, currentIdentity]);

  useEffect(() => {
    if (tab !== "form-certs" || !currentIdentity || !("orgId" in currentIdentity)) return;
    fetch(`/api/form-requests?orgId=${currentIdentity.orgId}`)
      .then((r) => r.json())
      .then((data) => setFormCertRequests(data.requests ?? []));
  }, [tab, currentIdentity]);

  async function loadMembers() {
    if (!currentIdentity || !("orgId" in currentIdentity)) return;
    const res = await fetch(`/api/organizations/${currentIdentity.orgId}/members?all=true`);
    const data = await res.json();
    setMembers(data.members ?? []);
  }

  useEffect(() => {
    if (tab !== "members" || !isOrgAdmin) return;
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, currentIdentity, isOrgAdmin]);

  async function runMemberAction(membershipId: string, action: string) {
    if (!currentIdentity || !("orgId" in currentIdentity)) return;
    setMemberActionId(membershipId);
    try {
      await fetch(`/api/organizations/${currentIdentity.orgId}/members/${membershipId}/${action}`, {
        method: "POST",
      });
      await loadMembers();
    } finally {
      setMemberActionId(null);
    }
  }

  const isOrgView = Boolean(currentIdentity && "orgId" in currentIdentity);
  const needsActionStatuses = isOrgView ? NEEDS_ACTION_ORG : NEEDS_ACTION_PARTICIPANT;

  const filtered = useMemo(() => {
    if (tab === "needs-action") return records.filter((r) => needsActionStatuses.includes(r.status));
    if (tab === "confirmed") return records.filter((r) => r.status === "CONFIRMED");
    return records;
  }, [records, tab, needsActionStatuses]);

  const newHref = isOrgView
    ? `/activity/new-for-participant?orgId=${(currentIdentity as { orgId: string }).orgId}`
    : "/activity/new";

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity</h1>
        <Button asChild size="sm">
          <Link href={newHref}>+ New</Link>
        </Button>
      </div>

      {identities.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {identities.map((i) => (
            <button
              key={i.key}
              onClick={() => setSelected(i.key)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
                selected === i.key ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="needs-action">Needs action</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          {isOrgView && <TabsTrigger value="form-certs">Form certifications</TabsTrigger>}
          {isOrgAdmin && <TabsTrigger value="members">Members</TabsTrigger>}
          {isOrgAdmin && <TabsTrigger value="audit">Audit log</TabsTrigger>}
        </TabsList>

        {["needs-action", "confirmed", "all"].map((value) => (
          <TabsContent key={value} value={value} className="flex flex-col gap-3">
            {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!loading && filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
            )}
            {filtered.map((r) => (
              <Link key={r.id} href={`/activity/${r.id}`}>
                <Card className="transition hover:border-primary">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-semibold">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[r.category] ?? r.category} · {isOrgView ? r.participantName : r.organizationName}
                      </p>
                      {r.activityDate && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.activityDate).toLocaleDateString()}
                          {r.totalHours ? ` · ${r.totalHours}h` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={STATUS_BADGE_VARIANT[r.status] ?? "outline"}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                      {r.hasFraudFlags && (
                        <Badge variant="warning" className="text-[10px]">
                          Needs review
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>
        ))}

        {isOrgView && (
          <TabsContent value="form-certs" className="flex flex-col gap-3">
            {formCertRequests.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No PA 1938 certification requests yet.
              </p>
            )}
            {formCertRequests.map((r) => (
              <Link key={r.id} href={`/forms/requests/${r.id}`}>
                <Card className="transition hover:border-primary">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-semibold">PA 1938 — {r.participantName}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(r.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={FORM_CERT_STATUS_BADGE_VARIANT[r.status] ?? "outline"}>
                      {FORM_CERT_STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>
        )}

        {isOrgAdmin && (
          <TabsContent value="members" className="flex flex-col gap-4">
            {members.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No members yet.</p>}

            {members.some((m) => m.needsRatification) && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-amber-900">Needs ratification</h3>
                {members
                  .filter((m) => m.needsRatification)
                  .map((m) => (
                    <Card key={m.membershipId} className="border-amber-300 bg-amber-50">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm font-semibold">{m.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            First approval on {m.firstApprovalAt ? new Date(m.firstApprovalAt).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={memberActionId === m.membershipId}
                          onClick={() => runMemberAction(m.membershipId, "ratify")}
                        >
                          Ratify
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {members.some((m) => m.status === "REQUESTED") && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Join requests</h3>
                {members
                  .filter((m) => m.status === "REQUESTED")
                  .map((m) => (
                    <Card key={m.membershipId}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm font-semibold">{m.displayName}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                        <Button
                          size="sm"
                          disabled={memberActionId === m.membershipId}
                          onClick={() => runMemberAction(m.membershipId, "approve-join")}
                        >
                          Approve
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">All members</h3>
              {members.map((m) => (
                <Card key={m.membershipId}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{m.displayName}</p>
                          <Badge variant={m.role === "ADMIN" ? "default" : "muted"}>{m.role}</Badge>
                          <Badge variant={MEMBER_STATUS_BADGE[m.status] ?? "outline"}>{m.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.recordsVerified ?? 0} verified · {m.disputes ?? 0} disputed ·{" "}
                      {m.lastActiveAt ? `active ${new Date(m.lastActiveAt).toLocaleDateString()}` : "never active"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {m.status === "ACTIVE" && m.role !== "ADMIN" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={memberActionId === m.membershipId}
                          onClick={() => runMemberAction(m.membershipId, "suspend")}
                        >
                          Suspend
                        </Button>
                      )}
                      {m.status === "SUSPENDED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={memberActionId === m.membershipId}
                          onClick={() => runMemberAction(m.membershipId, "reactivate")}
                        >
                          Reactivate
                        </Button>
                      )}
                      {(m.status === "PENDING" || m.status === "REQUESTED") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={memberActionId === m.membershipId}
                          onClick={() => runMemberAction(m.membershipId, "activate")}
                        >
                          Activate now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {isOrgAdmin && (
          <TabsContent value="audit" className="flex flex-col gap-2">
            {auditEntries.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No activity logged yet.</p>
            )}
            {auditEntries.map((e) => (
              <Card key={e.id}>
                <CardContent className="p-3 text-xs">
                  <p className="font-medium">{e.action.replaceAll("_", " ")}</p>
                  <p className="text-muted-foreground">
                    {e.actor} · {new Date(e.createdAt).toLocaleString()}
                  </p>
                  {e.priorStatus && e.newStatus && (
                    <p className="text-muted-foreground">
                      {e.priorStatus} → {e.newStatus}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
