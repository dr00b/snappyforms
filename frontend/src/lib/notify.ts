import { db } from "@/lib/db";
import { logNotification } from "@/lib/notifications";

export type NotificationType =
  | "VERIFICATION_REQUESTED"
  | "VERIFICATION_CONFIRMED"
  | "CHANGES_REQUESTED"
  | "VERIFICATION_DECLINED"
  | "RECORD_DISPUTED"
  | "RECORD_REVISED"
  | "RECORD_REVOKED"
  | "PROPOSED_RECORD_RECEIVED";

/**
 * Creates the in-app Notification row AND logs a simulated email via the Phase 1
 * dev-notification infrastructure (src/lib/notifications.ts) — this is the
 * "placeholder adapter" the spec asks for, reusing what already exists instead of
 * building a second delivery pipeline.
 */
export async function notifyUser(
  userId: string,
  opts: { type: NotificationType; title: string; body: string; activityRecordId?: string }
) {
  await db.notification.create({
    data: {
      userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      activityRecordId: opts.activityRecordId,
    },
  });

  const user = await db.user.findUnique({ where: { id: userId } });
  const identifier = user?.email ?? user?.phone;
  if (identifier) {
    await logNotification({
      channel: user?.email ? "EMAIL" : "SMS",
      toIdentifier: identifier,
      subject: opts.title,
      body: opts.body,
    });
  }
}
