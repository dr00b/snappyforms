"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, CheckCircle2 } from "lucide-react";
import { defaultAdvocacyBody } from "@/lib/advocacy";

type Sent = {
  id: string;
  recipientName: string;
  recipientOffice: string;
};

export function AdvocacyPanel({
  faxTransmissionId,
  agencyName,
  programName,
  formName,
  senderName,
}: {
  faxTransmissionId?: string;
  agencyName: string;
  programName: string | null;
  formName: string;
  senderName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zip, setZip] = useState("");
  const [body, setBody] = useState(() =>
    defaultAdvocacyBody({
      senderName: senderName ?? "A constituent",
      agencyName,
      programName,
      formName,
    })
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    const res = await fetch("/api/advocacy/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zip, body, faxTransmissionId }),
    });
    setSending(false);
    if (!res.ok) {
      setError("Enter a 5-digit ZIP code and a message.");
      return;
    }
    setSent(await res.json());
  }

  if (sent) {
    return (
      <Card className="border-primary" data-testid="advocacy-sent">
        <CardContent className="flex flex-col gap-2 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4" /> Message drafted
          </p>
          <p className="text-xs text-muted-foreground">
            Addressed to {sent.recipientName} — {sent.recipientOffice}.
          </p>
          <p className="text-xs text-muted-foreground">
            Demonstration only. This message was saved to your account and was not delivered to any
            congressional office.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-2 p-4">
          <p className="text-sm font-semibold">Why are we still faxing?!</p>
          <p className="text-xs text-muted-foreground">
            Many state agencies can pull data directly from providers like SnappyForms.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            data-testid="open-advocacy"
            onClick={() => setOpen(true)}
          >
            <Megaphone className="mr-1 h-4 w-4" /> Tell my representative
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ask for interoperability in federal benefits programs
        </p>

        <label className="text-sm font-medium" htmlFor="advocacy-zip">
          Your ZIP code
        </label>
        <input
          id="advocacy-zip"
          data-testid="advocacy-zip"
          inputMode="numeric"
          maxLength={5}
          className="flex h-11 w-full rounded-md border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
          placeholder="17101"
        />

        <label className="text-sm font-medium" htmlFor="advocacy-body">
          Your message
        </label>
        <textarea
          id="advocacy-body"
          data-testid="advocacy-body"
          className="flex min-h-64 w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <p className="text-xs text-muted-foreground">
          Demonstration only. SnappyForms does not deliver messages to congressional offices — this
          drafts one and saves it to your account so you can send it yourself.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button size="sm" disabled={sending || zip.length !== 5} data-testid="send-advocacy" onClick={send}>
            {sending ? "Saving..." : "Save my message"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
