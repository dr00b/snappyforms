import { NextResponse } from "next/server";
import { generateQrDataUrl, qrTargetUrl } from "@/lib/qr";

export async function GET(_request: Request, { params }: { params: { opaqueId: string } }) {
  const targetUrl = qrTargetUrl(params.opaqueId);
  const dataUrl = await generateQrDataUrl(targetUrl);
  return NextResponse.json({ dataUrl, targetUrl });
}
