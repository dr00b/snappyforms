"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/activityLabels";

export type ActivityFormFields = {
  category: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: string;
  totalHours: string;
  weeklyHours: string;
  monthlyHours: string;
  paidStatus: string;
  locationType: string;
  transportationProvided: boolean;
  supervisorName: string;
  supervisorTitle: string;
  supportingNotes: string;
};

export const emptyActivityFields: ActivityFormFields = {
  category: "VOLUNTEER",
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  activityDate: "",
  startTime: "",
  endTime: "",
  breakMinutes: "",
  totalHours: "",
  weeklyHours: "",
  monthlyHours: "",
  paidStatus: "UNPAID",
  locationType: "IN_PERSON",
  transportationProvided: false,
  supervisorName: "",
  supervisorTitle: "",
  supportingNotes: "",
};

const selectClass =
  "flex h-12 w-full rounded-md border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function recordToFormFields(record: Record<string, unknown>): ActivityFormFields {
  return {
    category: (record.category as string) ?? "VOLUNTEER",
    title: (record.title as string) ?? "",
    description: (record.description as string) ?? "",
    startDate: toDateInput(record.startDate as string | null),
    endDate: toDateInput(record.endDate as string | null),
    activityDate: toDateInput(record.activityDate as string | null),
    startTime: (record.startTime as string) ?? "",
    endTime: (record.endTime as string) ?? "",
    breakMinutes: record.breakMinutes != null ? String(record.breakMinutes) : "",
    totalHours: record.totalHours != null ? String(record.totalHours) : "",
    weeklyHours: record.weeklyHours != null ? String(record.weeklyHours) : "",
    monthlyHours: record.monthlyHours != null ? String(record.monthlyHours) : "",
    paidStatus: (record.paidStatus as string) ?? "UNPAID",
    locationType: (record.locationType as string) ?? "IN_PERSON",
    transportationProvided: Boolean(record.transportationProvided),
    supervisorName: (record.supervisorName as string) ?? "",
    supervisorTitle: (record.supervisorTitle as string) ?? "",
    supportingNotes: (record.supportingNotes as string) ?? "",
  };
}

export function activityFieldsToPayload(fields: ActivityFormFields) {
  return {
    category: fields.category,
    title: fields.title,
    description: fields.description || undefined,
    startDate: fields.startDate || undefined,
    endDate: fields.endDate || undefined,
    activityDate: fields.activityDate || undefined,
    startTime: fields.startTime || undefined,
    endTime: fields.endTime || undefined,
    breakMinutes: fields.breakMinutes || undefined,
    totalHours: fields.totalHours || undefined,
    weeklyHours: fields.weeklyHours || undefined,
    monthlyHours: fields.monthlyHours || undefined,
    paidStatus: fields.paidStatus || undefined,
    locationType: fields.locationType || undefined,
    transportationProvided: fields.transportationProvided,
    supervisorName: fields.supervisorName || undefined,
    supervisorTitle: fields.supervisorTitle || undefined,
    supportingNotes: fields.supportingNotes || undefined,
  };
}

export function ActivityFieldsForm({
  value,
  onChange,
}: {
  value: ActivityFormFields;
  onChange: (value: ActivityFormFields) => void;
}) {
  const [showMore, setShowMore] = useState(false);

  function set<K extends keyof ActivityFormFields>(key: K, v: ActivityFormFields[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium">Category</label>
        <select className={`mt-1 ${selectClass}`} value={value.category} onChange={(e) => set("category", e.target.value)}>
          {Object.entries(CATEGORY_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Activity title</label>
        <Input
          className="mt-1"
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Weekend food pantry volunteer"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="mt-1 flex min-h-20 w-full rounded-md border border-border bg-card px-4 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Date</label>
          <Input className="mt-1" type="date" value={value.activityDate} onChange={(e) => set("activityDate", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Total hours</label>
          <Input
            className="mt-1"
            type="number"
            min="0"
            step="0.5"
            value={value.totalHours}
            onChange={(e) => set("totalHours", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Paid or unpaid</label>
          <select className={`mt-1 ${selectClass}`} value={value.paidStatus} onChange={(e) => set("paidStatus", e.target.value)}>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Location</label>
          <select className={`mt-1 ${selectClass}`} value={value.locationType} onChange={(e) => set("locationType", e.target.value)}>
            <option value="IN_PERSON">In person</option>
            <option value="REMOTE">Remote</option>
          </select>
        </div>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={() => setShowMore((s) => !s)}>
        {showMore ? "Hide additional details" : "Add additional details"}
      </Button>

      {showMore && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Start date</label>
              <Input className="mt-1" type="date" value={value.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">End date</label>
              <Input className="mt-1" type="date" value={value.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Start time</label>
              <Input className="mt-1" type="time" value={value.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">End time</label>
              <Input className="mt-1" type="time" value={value.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Break (minutes)</label>
              <Input className="mt-1" type="number" min="0" value={value.breakMinutes} onChange={(e) => set("breakMinutes", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Weekly hours</label>
              <Input className="mt-1" type="number" min="0" step="0.5" value={value.weeklyHours} onChange={(e) => set("weeklyHours", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Monthly hours</label>
              <Input className="mt-1" type="number" min="0" step="0.5" value={value.monthlyHours} onChange={(e) => set("monthlyHours", e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.transportationProvided}
              onChange={(e) => set("transportationProvided", e.target.checked)}
            />
            Transportation provided
          </label>

          <div>
            <label className="text-sm font-medium">Supervisor name</label>
            <Input className="mt-1" value={value.supervisorName} onChange={(e) => set("supervisorName", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Supervisor title</label>
            <Input className="mt-1" value={value.supervisorTitle} onChange={(e) => set("supervisorTitle", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Supporting notes</label>
            <textarea
              className="mt-1 flex min-h-16 w-full rounded-md border border-border bg-card px-4 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={value.supportingNotes}
              onChange={(e) => set("supportingNotes", e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
