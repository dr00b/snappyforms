import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export class PdfWriter {
  private page!: PDFPage;
  private y = 0;

  private constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private boldFont: PDFFont
  ) {}

  static async create() {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const writer = new PdfWriter(doc, font, boldFont);
    writer.newPage();
    return writer;
  }

  private newPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private ensureSpace(needed: number) {
    if (this.y - needed < MARGIN) {
      this.newPage();
    }
  }

  title(text: string) {
    const lines = wrapText(this.boldFont, text, 18, PAGE_WIDTH - MARGIN * 2);
    for (const line of lines) {
      this.ensureSpace(24);
      this.page.drawText(line, { x: MARGIN, y: this.y, size: 18, font: this.boldFont, color: rgb(0.06, 0.09, 0.16) });
      this.y -= 22;
    }
    this.y -= 4;
  }

  heading(text: string) {
    this.ensureSpace(24);
    this.y -= 6;
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 12, font: this.boldFont, color: rgb(0.06, 0.09, 0.16) });
    this.y -= 8;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    this.y -= 14;
  }

  text(value: string, opts: { size?: number; bold?: boolean; gray?: boolean } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.boldFont : this.font;
    const color = opts.gray ? rgb(0.4, 0.4, 0.4) : rgb(0.1, 0.1, 0.1);
    const lines = wrapText(font, value, size, PAGE_WIDTH - MARGIN * 2);
    for (const line of lines) {
      this.ensureSpace(size + 6);
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font, color });
      this.y -= size + 6;
    }
  }

  keyValue(label: string, value: string) {
    const labelText = `${label}:`;
    const labelWidth = this.boldFont.widthOfTextAtSize(labelText, 10);
    const valueColumn = 160;

    if (labelWidth > valueColumn - 10) {
      // Long label: put the value on its own indented line so it never overlaps.
      this.ensureSpace(30);
      this.page.drawText(labelText, { x: MARGIN, y: this.y, size: 10, font: this.boldFont, color: rgb(0.3, 0.3, 0.3) });
      this.y -= 14;
      this.page.drawText(value || "—", { x: MARGIN + 12, y: this.y, size: 10, font: this.font, color: rgb(0.1, 0.1, 0.1) });
      this.y -= 16;
      return;
    }

    this.ensureSpace(16);
    this.page.drawText(labelText, { x: MARGIN, y: this.y, size: 10, font: this.boldFont, color: rgb(0.3, 0.3, 0.3) });
    this.page.drawText(value || "—", { x: MARGIN + valueColumn, y: this.y, size: 10, font: this.font, color: rgb(0.1, 0.1, 0.1) });
    this.y -= 16;
  }

  spacer(amount = 10) {
    this.y -= amount;
  }

  async bytes(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

export function drawVerwovoNotice(writer: PdfWriter) {
  writer.spacer(6);
  writer.text("Draft prepared by SnappyForms. Review all information before submission.", { size: 9, bold: true });
  writer.text(
    "SnappyForms helps prepare documentation using the information provided. The receiving agency determines whether a record or form meets its requirements.",
    { size: 8, gray: true }
  );
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}
