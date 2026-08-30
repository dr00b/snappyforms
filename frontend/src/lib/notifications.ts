import { db } from "@/lib/db";

export type NotificationChannel = "EMAIL" | "SMS" | "INAPP";

/**
 * SnappyForms prototype does not send real email/SMS. Every "send" is logged here and
 * surfaced in the /dev/inbox panel so a demo presenter can read codes/links without
 * needing a real mailbox or phone.
 */
export async function logNotification(opts: {
  channel: NotificationChannel;
  toIdentifier: string;
  subject?: string;
  body: string;
}) {
  await db.devNotification.create({
    data: {
      channel: opts.channel,
      toIdentifier: opts.toIdentifier,
      subject: opts.subject,
      body: opts.body,
    },
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev-notification:${opts.channel}] to=${opts.toIdentifier} :: ${opts.body}`);
  }
}

export function buildOtpMessage(code: string, purpose: "LOGIN" | "MAGIC_LINK") {
  if (purpose === "MAGIC_LINK") {
    return `Your SnappyForms sign-in link code is ${code}. This is a demonstration message — SnappyForms never sends real SMS/email in this prototype.`;
  }
  return `Your SnappyForms verification code is ${code}. It expires in 10 minutes. This is a demonstration message.`;
}
