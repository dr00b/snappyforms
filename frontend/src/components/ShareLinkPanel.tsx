"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Share2, Copy } from "lucide-react";

const EXPIRY_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

const FIELD_DESCRIPTIONS: Record<string, string> = {
  ACTIVITY_RECORD:
    "Activity category, organization name, date range, total hours, confirmation date, and your name or initials (per your verification privacy setting). Never case numbers, contact details, or your full activity history.",
  GENERATED_FORM: "The generated PDF document only.",
};

export function ShareLinkPanel({
  resourceType,
  resourceId,
  label,
}: {
  resourceType: "ACTIVITY_RECORD" | "GENERATED_FORM";
  resourceId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(24 * 7);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string; expiresAt: string } | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);

  async function createLink() {
    setLoading(true);
    const res = await fetch("/api/share-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType, resourceId, expiresInHours, label }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return;
    setResult(data);
    setConfirming(false);
    const dataUrl = await QRCode.toDataURL(data.url, { margin: 1, width: 320 });
    setQrImage(dataUrl);
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="mr-1 h-4 w-4" /> Share
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        {!result ? (
          !confirming ? (
            <>
              <label className="text-sm font-medium">Link expires in</label>
              <select
                className="flex h-11 w-full rounded-md border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.hours} value={o.hours}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setConfirming(true)}>
                  Continue
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase text-muted-foreground">What will be shared</p>
              <p className="text-sm">{FIELD_DESCRIPTIONS[resourceType]}</p>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view it until it expires. You can revoke it early anytime.
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={loading} onClick={createLink}>
                  {loading ? "Creating..." : "Confirm & create link"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Back
                </Button>
              </div>
            </>
          )
        ) : (
          <>
            {qrImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrImage} alt="Share QR code" className="mx-auto h-40 w-40 rounded-lg border border-border bg-white p-2" />
            )}
            <p className="break-all text-center text-xs text-muted-foreground">{result.url}</p>
            <p className="text-center text-xs text-muted-foreground">
              Expires {new Date(result.expiresAt).toLocaleString()}
            </p>
            <div className="flex justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(result.url)}
              >
                <Copy className="mr-1 h-4 w-4" /> Copy link
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
