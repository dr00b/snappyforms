import { PdfWriter, drawVerwovoNotice, formatDate } from "@/lib/pdf/render";
import { getFormTemplate, type FormTemplateKey } from "@/lib/formTemplates";
import { CATEGORY_LABELS } from "@/lib/activityLabels";

export type GenericFormRecord = {
  title: string;
  category: string;
  activityDate: Date | null;
  totalHours: number | null;
  confirmedAt: Date | null;
};

export async function renderGenericForm(opts: {
  templateKey: FormTemplateKey;
  participantName: string;
  participantHandle: string;
  organizationName: string;
  records: GenericFormRecord[];
}) {
  const template = getFormTemplate(opts.templateKey);
  const writer = await PdfWriter.create();

  writer.title(template?.name ?? "VERWOVO activity summary");
  writer.text(`Generated ${new Date().toLocaleDateString()}`, { size: 9, gray: true });
  writer.spacer(10);

  writer.heading("Participant");
  writer.keyValue("Name", opts.participantName);
  writer.keyValue("Handle", `@${opts.participantHandle}`);

  writer.heading("Organization");
  writer.keyValue("Name", opts.organizationName);

  writer.heading("Activity records included");
  let totalHours = 0;
  for (const record of opts.records) {
    writer.text(record.title, { bold: true });
    writer.text(
      `${CATEGORY_LABELS[record.category] ?? record.category} · ${formatDate(record.activityDate)} · ${
        record.totalHours ?? 0
      } hours · confirmed ${formatDate(record.confirmedAt)}`,
      { size: 9, gray: true }
    );
    writer.spacer(4);
    totalHours += record.totalHours ?? 0;
  }

  writer.spacer(4);
  writer.keyValue("Total hours", String(totalHours));

  writer.heading("Certification");
  writer.text(template?.certificationLanguage ?? "", { size: 9 });

  drawVerwovoNotice(writer);

  return writer.bytes();
}
