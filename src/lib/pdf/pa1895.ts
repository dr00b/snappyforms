import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

// Unlike pa1938.ts, which draws a demonstration form from scratch, this fills
// the *official* PA 1895 AcroForm. The template is vendored at
// src/lib/pdf/templates/pa1895.pdf; re-download it from the DHS site when the
// form revision changes (current: PA 1895 2/19). The field names below come
// from that PDF and are the fragile part of this module — the assertions in
// shift-flow.mjs open a generated form and read them back.
//
// The per-row signature column is a real fillable field, so each row carries
// the name of the host whose rotating QR confirmed it. As with PA 1938, a
// typed name is a demonstration of provenance, not a legally binding
// electronic signature.

const TEMPLATE_PATH = path.join(process.cwd(), "src/lib/pdf/templates/pa1895.pdf");

/** The form prints ten daily rows; a week of shifts always fits. */
export const PA1895_MAX_ROWS = 10;

const TEXT_FIELDS = {
  weekEnding: "Week ending Saturday",
  clientName: "CLIENT NAME",
  comments: "COMMENTS",
  clientSignature: "CLIENT SIGNATURE",
  clientSignatureDate: "DATE",
} as const;

const ROW_FIELDS = {
  date: "DATERow",
  typeOfActivity: "TYPE OF ACTIVITYRow",
  contactPersonAndPhone: "ACTIVITY CONTACT PERSON AND PHONE Row",
  authorizedSignature: "AUTHORIZED ACTIVITY CONTACTS SIGNATURERow",
  beginTime: "BEGIN TIMERow",
  endTime: "END TIMERow",
  totalDailyHours: "TOTAL DAILY HOURSRow",
} as const;

/** Community Service Programs (activity codes 20, 32) — the box every shift row falls under. */
const COMMUNITY_SERVICE_CHECKBOX = "Community";

export type Pa1895Row = {
  date: Date;
  typeOfActivity: string;
  contactPersonAndPhone: string;
  /** Who signed off on this row — the shift host whose QR confirmed it. */
  authorizedSignature: string;
  beginTime: string;
  endTime: string;
  totalDailyHours: number;
};

export type Pa1895Input = {
  clientName: string;
  weekEnding: Date;
  rows: Pa1895Row[];
  comments: string;
  generatedOn?: Date;
};

/**
 * The Saturday that closes the week containing `date`. All shift dates are
 * stored as UTC midnight, so this stays in UTC rather than drifting a day for
 * anyone west of Greenwich.
 */
export function weekEndingSaturday(date: Date): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + ((6 - result.getUTCDay() + 7) % 7));
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/** Whether every date falls in the same Sunday–Saturday week. */
export function sameFormWeek(dates: Date[]): boolean {
  if (dates.length === 0) return false;
  const first = weekEndingSaturday(dates[0]).getTime();
  return dates.every((d) => weekEndingSaturday(d).getTime() === first);
}

export function formatFormDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${date.getUTCFullYear()}`;
}

export async function renderPa1895Form(input: Pa1895Input): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(await readFile(TEMPLATE_PATH));
  const form = pdfDoc.getForm();

  const generatedOn = input.generatedOn ?? new Date();

  form.getTextField(TEXT_FIELDS.clientName).setText(input.clientName);
  form.getTextField(TEXT_FIELDS.weekEnding).setText(formatFormDate(input.weekEnding));
  form.getTextField(TEXT_FIELDS.comments).setText(input.comments);
  form.getTextField(TEXT_FIELDS.clientSignature).setText(input.clientName);
  form.getTextField(TEXT_FIELDS.clientSignatureDate).setText(formatFormDate(generatedOn));

  input.rows.slice(0, PA1895_MAX_ROWS).forEach((row, index) => {
    const n = index + 1;
    form.getTextField(`${ROW_FIELDS.date}${n}`).setText(formatFormDate(row.date));
    form.getTextField(`${ROW_FIELDS.typeOfActivity}${n}`).setText(row.typeOfActivity);
    form
      .getTextField(`${ROW_FIELDS.contactPersonAndPhone}${n}`)
      .setText(row.contactPersonAndPhone);
    form
      .getTextField(`${ROW_FIELDS.authorizedSignature}${n}`)
      .setText(row.authorizedSignature);
    form.getTextField(`${ROW_FIELDS.beginTime}${n}`).setText(row.beginTime);
    form.getTextField(`${ROW_FIELDS.endTime}${n}`).setText(row.endTime);
    form.getTextField(`${ROW_FIELDS.totalDailyHours}${n}`).setText(String(row.totalDailyHours));
  });

  form.getCheckBox(COMMUNITY_SERVICE_CHECKBOX).check();

  return pdfDoc.save();
}
