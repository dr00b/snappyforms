"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar, QrCode } from "lucide-react";

type OpportunityDetail = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  openings: number;
  taskCategory: string | null;
  contactPerson: string | null;
  minimumAge: number | null;
  accessibilityInfo: string | null;
  transportationInfo: string | null;
  backgroundCheckRequired: boolean;
  trainingRequired: boolean;
  remoteOrInPerson: string;
  organizationId: string;
  organizationName: string;
  organizationHandle: string | null;
  locationName: string | null;
  qrId: string | null;
  signedUpCount: number;
};

type MySignup = { status: string; checkedInAt: string | null } | null;

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null);
  const [mySignup, setMySignup] = useState<MySignup>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/opportunities/${params.id}`);
    if (!res.ok) {
      setOpportunity(null);
      return;
    }
    const data = await res.json();
    setOpportunity(data.opportunity);
    setMySignup(data.mySignup ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function signUp() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/opportunities/${params.id}/signup`, { method: "POST" });
      if (res.ok) await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/opportunities/${params.id}/cancel`, { method: "POST" });
      if (res.ok) await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function checkIn() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/opportunities/${params.id}/check-in`, { method: "POST" });
      if (res.ok) await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleQr() {
    if (showQr) {
      setShowQr(false);
      return;
    }
    if (!qrImage && opportunity?.qrId) {
      const res = await fetch(`/api/qr/${opportunity.qrId}/render`);
      const data = await res.json();
      setQrImage(data.dataUrl);
    }
    setShowQr(true);
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <p className="text-sm text-muted-foreground">Opportunity not found.</p>
        <Link href="/opportunities" className="text-sm text-primary underline">
          Back to opportunities
        </Link>
      </div>
    );
  }

  const full = opportunity.signedUpCount >= opportunity.openings;
  const isSignedUp = mySignup && mySignup.status !== "CANCELLED";
  const isCheckedIn = mySignup?.status === "CHECKED_IN";

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-2">
        <Link href="/opportunities">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">{opportunity.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{opportunity.organizationName}</CardTitle>
            <Badge variant={full ? "muted" : "default"}>
              {full ? "Full" : `${opportunity.openings - opportunity.signedUpCount} open`}
            </Badge>
          </div>
          <CardDescription>{opportunity.locationName ?? "Location TBD"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            {new Date(opportunity.date).toLocaleDateString()}
            {opportunity.startTime && ` · ${opportunity.startTime}${opportunity.endTime ? `–${opportunity.endTime}` : ""}`}
          </p>
          {opportunity.description && <p className="text-muted-foreground">{opportunity.description}</p>}
          <div className="flex flex-wrap gap-2">
            {opportunity.taskCategory && <Badge variant="muted">{opportunity.taskCategory}</Badge>}
            <Badge variant="outline">{opportunity.remoteOrInPerson === "REMOTE" ? "Remote" : "In person"}</Badge>
            {opportunity.backgroundCheckRequired && <Badge variant="warning">Background check required</Badge>}
            {opportunity.trainingRequired && <Badge variant="warning">Training required</Badge>}
          </div>
          {opportunity.minimumAge !== null && (
            <p className="text-xs text-muted-foreground">Minimum age: {opportunity.minimumAge}</p>
          )}
          {opportunity.contactPerson && (
            <p className="text-xs text-muted-foreground">Contact: {opportunity.contactPerson}</p>
          )}
          {opportunity.accessibilityInfo && (
            <p className="text-xs text-muted-foreground">Accessibility: {opportunity.accessibilityInfo}</p>
          )}
          {opportunity.transportationInfo && (
            <p className="text-xs text-muted-foreground">Transportation: {opportunity.transportationInfo}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {!isSignedUp && (
          <Button disabled={submitting || full} onClick={signUp}>
            {full ? "Full" : "Sign up"}
          </Button>
        )}
        {isSignedUp && !isCheckedIn && (
          <Button variant="outline" disabled={submitting} onClick={cancel}>
            Cancel signup
          </Button>
        )}
        {isSignedUp && (
          <Button asChild variant="outline">
            <a href={`/api/opportunities/${opportunity.id}/ics`}>
              <Calendar className="mr-1 h-4 w-4" /> Add to calendar
            </a>
          </Button>
        )}
        {isSignedUp && !isCheckedIn && (
          <Button variant="outline" disabled={submitting} onClick={checkIn}>
            Check in
          </Button>
        )}
        {opportunity.qrId && (
          <Button variant="outline" onClick={toggleQr}>
            <QrCode className="mr-1 h-4 w-4" /> {showQr ? "Hide QR" : "Show QR"}
          </Button>
        )}
      </div>

      {isCheckedIn && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Checked in</CardTitle>
            <CardDescription>
              Request verification for the hours you complete here — it'll pre-fill this organization for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                router.push(
                  `/activity/new?orgId=${opportunity.organizationId}&orgName=${encodeURIComponent(
                    opportunity.organizationName
                  )}&title=${encodeURIComponent(opportunity.title)}`
                )
              }
            >
              Request verification
            </Button>
          </CardContent>
        </Card>
      )}

      {showQr && qrImage && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImage} alt="Opportunity check-in QR code" className="h-48 w-48" />
            <p className="text-xs text-muted-foreground">Scan to check in on-site</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
