"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareLinkPanel } from "@/components/ShareLinkPanel";
import { FaxPanel } from "@/components/FaxPanel";
import { FORM_TEMPLATES, FORM_TEMPLATE_LIST, type FormTemplateKey } from "@/lib/formTemplates";
import { CATEGORY_LABELS, FORM_CERT_STATUS_LABELS, FORM_CERT_STATUS_BADGE_VARIANT } from "@/lib/activityLabels";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";

type FormCertRequestSummary = {
  id: string;
  status: string;
  organizationName: string;
  updatedAt: string;
};

type Record_ = {
  id: string;
  title: string;
  category: string;
  status: string;
  activityDate: string | null;
  totalHours: number | null;
  organizationName: string;
  organizationHandle: string | null;
};

type GeneratedFormSummary = {
  id: string;
  templateKey: string;
  organizationName: string;
  createdAt: string;
};

function GenericGenerator({ templateKey, sourceCategories }: { templateKey: FormTemplateKey; sourceCategories: string[] }) {
  const [records, setRecords] = useState<Record_[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/activity?status=CONFIRMED")
      .then((r) => r.json())
      .then((data) => {
        setRecords((data.records ?? []).filter((r: Record_) => sourceCategories.includes(r.category)));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedRecords = records.filter((r) => selected.has(r.id));
  const orgHandles = new Set(selectedRecords.map((r) => r.organizationHandle));
  // PA 1895 signs each row separately, so a week can span organizations. The
  // summary forms speak for one organization, so they cannot.
  const multiOrg = templateKey !== "PA_1895" && orgHandles.size > 1;

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/forms/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateKey, activityRecordIds: [...selected] }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Couldn't generate that document.");
      return;
    }
    const data = await res.json();
    setResult(data.id);
  }

  if (result) {
    return (
      <div className="flex flex-col gap-2" data-testid="form-ready">
        <p className="text-sm text-primary">Document ready.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <a href={`/api/generated-forms/${result}/download`} data-testid="download-form">
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </a>
          </Button>
        </div>
        <FaxPanel generatedFormId={result} formName={FORM_TEMPLATES[templateKey].name} />
      </div>
    );
  }

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">No confirmed records match this document yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {records.map((r) => (
        <label
          key={r.id}
          data-testid="record-option"
          className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
        >
          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
          <span className="flex-1">
            {r.title}
            <span className="block text-xs text-muted-foreground">
              {CATEGORY_LABELS[r.category] ?? r.category} · {r.organizationName} ·{" "}
              {r.activityDate ? new Date(r.activityDate).toLocaleDateString() : "—"} · {r.totalHours ?? 0}h
            </span>
          </span>
        </label>
      ))}
      {multiOrg && <p className="text-xs text-destructive">Select records from a single organization only.</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        disabled={selected.size === 0 || multiOrg || loading}
        data-testid="generate-form"
        onClick={generate}
      >
        {loading ? "Generating..." : "Generate document"}
      </Button>
    </div>
  );
}

export default function FormsPage() {
  const [expanded, setExpanded] = useState<FormTemplateKey | null>(null);
  const [documents, setDocuments] = useState<GeneratedFormSummary[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FormCertRequestSummary[]>([]);

  useEffect(() => {
    fetch("/api/generated-forms")
      .then((r) => r.json())
      .then((data) => setDocuments(data.forms ?? []));
    fetch("/api/form-requests")
      .then((r) => r.json())
      .then((data) => setPendingRequests(data.requests ?? []));
  }, []);

  const openRequests = pendingRequests.filter((r) => r.status !== "FINALIZED" && r.status !== "DECLINED");

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-bold">Forms</h1>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="documents">My documents</TabsTrigger>
          <TabsTrigger value="pending">
            Pending{openRequests.length > 0 ? ` (${openRequests.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="flex flex-col gap-3">
          {FORM_TEMPLATE_LIST.map((t) => (
            <Card key={t.key} data-testid={`template-${t.key}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> {t.name}
                </CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {t.isGuidedWizard ? (
                  <Button asChild size="sm">
                    <Link href="/forms/pa-1938">Start guided form</Link>
                  </Button>
                ) : expanded === t.key ? (
                  <GenericGenerator templateKey={t.key} sourceCategories={t.sourceCategories} />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`choose-${t.key}`}
                    onClick={() => setExpanded(t.key)}
                  >
                    Choose records
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="flex flex-col gap-3">
          {documents.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No documents generated yet.</p>
          )}
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{d.templateKey.replaceAll("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.organizationName} · {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/generated-forms/${d.id}/download`}>
                      <Download className="mr-1 h-4 w-4" /> Download
                    </a>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ShareLinkPanel resourceType="GENERATED_FORM" resourceId={d.id} label={d.templateKey} />
                  <FaxPanel
                    generatedFormId={d.id}
                    formName={
                      FORM_TEMPLATES[d.templateKey as FormTemplateKey]?.name ??
                      d.templateKey.replaceAll("_", " ")
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="flex flex-col gap-3">
          {pendingRequests.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No PA 1938 certification requests yet.
            </p>
          )}
          {pendingRequests.map((r) => (
            <Link key={r.id} href={`/forms/requests/${r.id}`}>
              <Card className="transition hover:border-primary">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold">PA 1938 — {r.organizationName}</p>
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
      </Tabs>
    </div>
  );
}
