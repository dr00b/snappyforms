import QRCode from "qrcode";

export function qrTargetUrl(opaqueId: string) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return `${base}/q/${opaqueId}`;
}

export async function generateQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 480,
    color: { dark: "#0f172a", light: "#00000000" },
  });
}
