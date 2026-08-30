import { PdfWriter, drawVerwovoNotice } from "@/lib/pdf/render";
import { getFormTemplate } from "@/lib/formTemplates";

export type Pa1938Input = {
  participant: {
    fullName: string;
    dob: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  agency: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  service: {
    startDate: string;
    endDate: string;
    transportationProvided: boolean;
    week1Hours: number;
    week2Hours: number;
    week3Hours: number;
    week4Hours: number;
    tasks: string[];
  };
  certification: {
    siteManagerName: string;
    siteManagerTitle: string;
    confirmationDate: string;
    signature: string;
  };
};

export async function renderPa1938Form(input: Pa1938Input, ssnLast4?: string) {
  const template = getFormTemplate("PA_1938");
  const writer = await PdfWriter.create();

  writer.title("PA 1938 — Community Service / Volunteer Verification");
  writer.text(
    "This is a SnappyForms-generated demonstration document. It is not an official Commonwealth of Pennsylvania form.",
    { size: 8, gray: true }
  );
  writer.spacer(10);

  writer.heading("Volunteer and agency information");
  writer.keyValue("Volunteer name", input.participant.fullName);
  writer.keyValue("Date of birth", input.participant.dob);
  writer.keyValue("Address", input.participant.address);
  writer.keyValue("City / State / ZIP", `${input.participant.city}, ${input.participant.state} ${input.participant.zip}`);
  if (ssnLast4) {
    writer.keyValue("SSN (last 4)", `XXX-XX-${ssnLast4}`);
  }
  writer.spacer(4);
  writer.keyValue("Agency name", input.agency.name);
  writer.keyValue("Agency phone", input.agency.phone);
  writer.keyValue("Agency address", input.agency.address);
  writer.keyValue("Agency city / State / ZIP", `${input.agency.city}, ${input.agency.state} ${input.agency.zip}`);

  writer.heading("Community-service activity information");
  writer.keyValue("Service start date", input.service.startDate);
  writer.keyValue("Expected end date", input.service.endDate);
  writer.keyValue("Transportation provided at no cost", input.service.transportationProvided ? "Yes" : "No");
  writer.keyValue("Week 1 estimated hours", String(input.service.week1Hours));
  writer.keyValue("Week 2 estimated hours", String(input.service.week2Hours));
  writer.keyValue("Week 3 estimated hours", String(input.service.week3Hours));
  writer.keyValue("Week 4 estimated hours", String(input.service.week4Hours));
  const totalMonthly =
    input.service.week1Hours + input.service.week2Hours + input.service.week3Hours + input.service.week4Hours;
  writer.keyValue("Total monthly estimated hours", String(totalMonthly));
  writer.spacer(4);
  writer.text("Task descriptions:", { bold: true, size: 10 });
  const tasks = input.service.tasks.filter(Boolean).slice(0, 3);
  if (tasks.length === 0) {
    writer.text("—", { size: 9, gray: true });
  }
  for (const task of tasks) {
    writer.text(`• ${task}`, { size: 9 });
  }

  writer.heading("Agency certification");
  writer.text(template?.certificationLanguage ?? "", { size: 9, bold: true });
  writer.spacer(6);
  writer.keyValue("Site manager name", input.certification.siteManagerName);
  writer.keyValue("Site manager title", input.certification.siteManagerTitle);
  writer.keyValue("Confirmation date", input.certification.confirmationDate);
  writer.keyValue("Demonstration signature", input.certification.signature);
  writer.text(
    "This typed name is a demonstration placeholder only and is not a legally binding electronic signature.",
    { size: 8, gray: true }
  );

  drawVerwovoNotice(writer);

  return writer.bytes();
}
