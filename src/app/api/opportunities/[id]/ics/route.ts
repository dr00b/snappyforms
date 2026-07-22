import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function toIcsDate(date: Date, time: string | null) {
  const d = new Date(date);
  if (time) {
    const [h, m] = time.split(":").map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  }
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(text: string) {
  return text.replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const opportunity = await db.volunteerOpportunity.findUnique({
    where: { id: params.id },
    include: { organization: true, location: true },
  });
  if (!opportunity) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const start = toIcsDate(opportunity.date, opportunity.startTime);
  const end = toIcsDate(opportunity.date, opportunity.endTime ?? opportunity.startTime);
  const location = opportunity.location?.name ?? opportunity.organization.name;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VERWOVO//Opportunity//EN",
    "BEGIN:VEVENT",
    `UID:${opportunity.id}@verwovo.demo`,
    `DTSTAMP:${toIcsDate(new Date(), null)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(opportunity.title)}`,
    `LOCATION:${escapeIcs(location)}`,
    `DESCRIPTION:${escapeIcs(opportunity.description ?? `Volunteer opportunity with ${opportunity.organization.name}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${opportunity.title.replace(/[^a-z0-9]/gi, "-")}.ics"`,
    },
  });
}
