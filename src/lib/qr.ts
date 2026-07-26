import QRCode from "qrcode";

export function qrTargetUrl(opaqueId: string) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return `${base}/q/${opaqueId}`;
}

/**
 * The target of a hosted shift's rotating QR. Unlike qrTargetUrl's permanent
 * opaque ids, this URL is only good for the ~30 seconds the code inside it
 * survives — that expiry is the whole point.
 */
export function shiftTargetUrl(opportunityId: string, code: string) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return `${base}/shift/${opportunityId}?c=${code}`;
}

export async function generateQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 480,
    color: { dark: "#0f172a", light: "#00000000" },
  });
}
