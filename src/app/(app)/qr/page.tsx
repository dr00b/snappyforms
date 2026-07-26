"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { QrScanner } from "@/components/QrScanner";
import { ShareLinkPanel } from "@/components/ShareLinkPanel";
import { normalizeHandle } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/activityLabels";
import { Printer, Share2, Download, FileText } from "lucide-react";

type ShareableRecord = {
  id: string;
  title: string;
  category: string;
  activityDate: string | null;
  totalHours: number | null;
};

type ShareableForm = {
  id: string;
  templateKey: string;
  organizationName: string;
  createdAt: string;
};

type Identity = {
  key: string;
  kind: "participant" | "organization";
  displayName: string;
  handle: string | null;
  qrId: string | null;
};

export default function QrHubPage() {
  const router = useRouter();
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<{ dataUrl: string; targetUrl: string } | null>(null);
  const [manualHandle, setManualHandle] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasParticipant, setHasParticipant] = useState(false);
  const [shareableRecords, setShareableRecords] = useState<ShareableRecord[]>([]);
  const [shareableForms, setShareableForms] = useState<ShareableForm[]>([]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) return;
        const list: Identity[] = [];
        if (data.user.participant) {
          list.push({
            key: "participant",
            kind: "participant",
            displayName: data.user.participant.displayName,
            handle: data.user.participant.handle,
            qrId: data.user.participant.qrId,
          });
          setHasParticipant(true);
          fetch("/api/activity?status=CONFIRMED")
            .then((r) => r.json())
            .then((d) => setShareableRecords(d.records ?? []));
          fetch("/api/generated-forms")
            .then((r) => r.json())
            .then((d) => setShareableForms(d.forms ?? []));
        }
        for (const org of data.user.organizations) {
          list.push({ key: `org:${org.id}`, kind: "organization", displayName: org.name, handle: org.handle, qrId: org.qrId });
        }
        setIdentities(list);
        setSelected(list[0]?.key ?? null);
      });
  }, []);

  useEffect(() => {
    const identity = identities.find((i) => i.key === selected);
    if (!identity?.qrId) {
      setQrImage(null);
      return;
    }
    fetch(`/api/qr/${identity.qrId}/render`)
      .then((r) => r.json())
      .then(setQrImage);
  }, [selected, identities]);

  async function resolveScan(text: string) {
    setScanError(null);
    const opaqueId = text.split("/").filter(Boolean).pop() ?? text;
    const res = await fetch(`/api/qr/${opaqueId}`);
    if (!res.ok) {
      setScanError("That code isn't recognized.");
      return;
    }
    const data = await res.json();
    if (data.type === "participant") {
      router.push(`/u/${data.handle}`);
      return;
    }
    if (data.type === "organization" || data.type === "location") {
      router.push(`/o/${data.handle}`);
      return;
    }
    if (data.type === "opportunity") {
      await fetch(`/api/opportunities/${data.id}/check-in`, { method: "POST" }).catch(() => undefined);
      router.push(`/opportunities/${data.id}`);
      return;
    }
    setScanError("That code isn't recognized.");
  }

  async function resolveManual(e: React.FormEvent) {
    e.preventDefault();
    setScanError(null);
    const needle = normalizeHandle(manualHandle);
    const res = await fetch(`/api/search?q=${encodeURIComponent(needle)}`);
    const data = await res.json();
    const match = data.results?.find((r: { handle: string }) => normalizeHandle(r.handle) === needle);
    if (!match) {
      setScanError("No handle found matching that.");
      return;
    }
    router.push(match.type === "participant" ? `/u/${match.handle}` : `/o/${match.handle}`);
  }

  function downloadImage() {
    if (!qrImage) return;
    const a = document.createElement("a");
    a.href = qrImage.dataUrl;
    a.download = "snappyforms-qr.png";
    a.click();
  }

  async function shareImage() {
    if (!qrImage) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My SnappyForms QR code", url: qrImage.targetUrl });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(qrImage.targetUrl);
    alert("Link copied to clipboard.");
  }

  const current = identities.find((i) => i.key === selected);

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-bold">QR</h1>

      <Tabs defaultValue="scan-me">
        <TabsList>
          <TabsTrigger value="scan-code">Scan Code</TabsTrigger>
          <TabsTrigger value="scan-me">Scan Me</TabsTrigger>
          <TabsTrigger value="form-request">Form Request</TabsTrigger>
        </TabsList>

        <TabsContent value="scan-code" className="flex flex-col gap-4">
          <QrScanner onDecode={resolveScan} />
          <form className="flex flex-col gap-2" onSubmit={resolveManual}>
            <label className="text-sm font-medium">Camera unavailable? Enter a handle</label>
            <div className="flex gap-2">
              <Input value={manualHandle} onChange={(e) => setManualHandle(e.target.value)} placeholder="@handle" />
              <Button type="submit">Go</Button>
            </div>
            {scanError && <p className="text-sm text-destructive">{scanError}</p>}
          </form>
        </TabsContent>

        <TabsContent value="scan-me" className="flex flex-col items-center gap-4">
          {identities.length > 1 && (
            <div className="flex w-full gap-2 overflow-x-auto">
              {identities.map((i) => (
                <button
                  key={i.key}
                  onClick={() => setSelected(i.key)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
                    selected === i.key ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {i.displayName}
                </button>
              ))}
            </div>
          )}

          {current && (
            <>
              <p className="text-lg font-bold">{current.displayName}</p>
              <p className="text-sm text-muted-foreground">@{current.handle}</p>
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrImage.dataUrl} alt="QR code" className="h-64 w-64 rounded-lg border border-border bg-white p-3" />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                  Generating...
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-1 h-4 w-4" /> Print
                </Button>
                <Button variant="outline" size="sm" onClick={shareImage}>
                  <Share2 className="mr-1 h-4 w-4" /> Share
                </Button>
                <Button variant="outline" size="sm" onClick={downloadImage}>
                  <Download className="mr-1 h-4 w-4" /> Save
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="form-request" className="flex flex-col gap-4">
          {!hasParticipant ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> Form Request
                </CardTitle>
                <CardDescription>
                  Create a personal participant profile to request or share your own records.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Share a confirmed record or a generated document. Sharing creates a secure QR code
                and link that expires automatically.
              </p>

              {shareableRecords.length === 0 && shareableForms.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nothing to share yet — confirmed records and generated forms will appear here.
                </p>
              )}

              {shareableRecords.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div>
                      <p className="text-sm font-semibold">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[r.category] ?? r.category}
                        {r.activityDate ? ` · ${new Date(r.activityDate).toLocaleDateString()}` : ""}
                        {r.totalHours != null ? ` · ${r.totalHours}h` : ""}
                      </p>
                    </div>
                    <ShareLinkPanel resourceType="ACTIVITY_RECORD" resourceId={r.id} label={r.title} />
                  </CardContent>
                </Card>
              ))}

              {shareableForms.map((f) => (
                <Card key={f.id}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div>
                      <p className="text-sm font-semibold">{f.templateKey.replaceAll("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.organizationName} · {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ShareLinkPanel resourceType="GENERATED_FORM" resourceId={f.id} label={f.templateKey} />
                  </CardContent>
                </Card>
              ))}

              <Button asChild variant="outline" size="sm">
                <Link href="/forms">Generate a new document</Link>
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
