"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Download, CheckCircle2 } from "lucide-react";
import { AdvocacyPanel } from "@/components/AdvocacyPanel";

type Destination = {
  participantCaseId: string;
  agencyName: string;
  faxNumber: string;
  programName: string;
  caseNumberLast4: string;
};

type Receipt = {
  id: string;
  confirmationNumber: string;
  pageCount: number;
  destinationName: string;
  destinationFax: string;
  caseNumberLast4: string | null;
  senderName: string;
  sentAt: string;
};

export function FaxPanel({
  generatedFormId,
  formName,
}: {
  generatedFormId: string;
  formName: string;
}) {
  const [open, setOpen] = useState(false);
  const [destinations, setDestinations] = useState<Destination[] | null>(null);
  const [selected, setSelected] = useState("");
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || destinations) return;
    fetch("/api/fax-destinations")
      .then((r) => r.json())
      .then((data) => {
        const list: Destination[] = data.destinations ?? [];
        setDestinations(list);
        setSelected(list[0]?.participantCaseId ?? "");
      })
      .catch(() => setDestinations([]));
  }, [open, destinations]);

  async function send() {
    setSending(true);
    setError(null);
    const res = await fetch(`/api/generated-forms/${generatedFormId}/fax`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantCaseId: selected }),
    });
    setSending(false);
    if (!res.ok) {
      setError("The transmission didn't go through. Try again.");
      return;
    }
    setReceipt(await res.json());
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" data-testid="open-fax" onClick={() => setOpen(true)}>
        <Printer className="mr-1 h-4 w-4" /> Fax to my caseworker
      </Button>
    );
  }

  if (receipt) {
    const destination = destinations?.find((d) => d.participantCaseId === selected);
    return (
      <div className="flex flex-col gap-3">
        <Card className="border-primary" data-testid="fax-receipt">
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" /> Fax sent
            </p>
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">To</dt>
              <dd>{receipt.destinationName}</dd>
              <dt className="text-muted-foreground">Fax number</dt>
              <dd>{receipt.destinationFax}</dd>
              <dt className="text-muted-foreground">Confirmation</dt>
              <dd className="font-semibold" data-testid="fax-confirmation">
                {receipt.confirmationNumber}
              </dd>
              <dt className="text-muted-foreground">Pages</dt>
              <dd>{receipt.pageCount} (including cover sheet)</dd>
              <dt className="text-muted-foreground">Sent</dt>
              <dd>{new Date(receipt.sentAt).toLocaleString()}</dd>
            </dl>
            <Button asChild size="sm" variant="outline" className="mt-1 self-start">
              <a href={`/api/fax-transmissions/${receipt.id}/download`} data-testid="download-fax">
                <Download className="mr-1 h-4 w-4" /> Download what was sent
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Simulated transmission. No fax was dialed and nothing was sent to{" "}
              {receipt.destinationName}.
            </p>
          </CardContent>
        </Card>

        <AdvocacyPanel
          faxTransmissionId={receipt.id}
          agencyName={receipt.destinationName}
          programName={destination?.programName ?? null}
          formName={formName}
          senderName={receipt.senderName}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Send this form to a caseworker
        </p>

        {destinations === null && <p className="text-sm text-muted-foreground">Loading...</p>}

        {destinations?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No open case with a fax number on file. A caseworker has to open a case before you can
            send documentation to it.
          </p>
        )}

        {destinations && destinations.length > 0 && (
          <>
            <label className="text-sm font-medium" htmlFor="fax-destination">
              Send to
            </label>
            <select
              id="fax-destination"
              data-testid="fax-destination"
              className="flex h-11 w-full rounded-md border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {destinations.map((d) => (
                <option key={d.participantCaseId} value={d.participantCaseId}>
                  {d.agencyName} — {d.programName} (case XXXX-{d.caseNumberLast4})
                </option>
              ))}
            </select>

            <p className="text-xs text-muted-foreground">
              A cover sheet is added in front of the form with your name, the case number, and a
              confirmation number. Your full case number is never printed.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button size="sm" disabled={sending || !selected} data-testid="send-fax" onClick={send}>
                {sending ? "Sending..." : "Send fax"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
