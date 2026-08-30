import { db } from "@/lib/db";
import { getVerificationView } from "@/lib/verification";

export type ResolvedShareLink =
  | { status: "not_found" }
  | { status: "expired" }
  | {
      status: "ok";
      resourceType: "ACTIVITY_RECORD";
      label: string | null;
      expiresAt: Date;
      view: Awaited<ReturnType<typeof getVerificationView>>;
    }
  | {
      status: "ok";
      resourceType: "GENERATED_FORM";
      label: string | null;
      expiresAt: Date;
      form: { id: string; templateKey: string; organizationName: string; createdAt: Date };
    };

export async function resolveShareLink(token: string, opts: { bumpAccess?: boolean } = {}): Promise<ResolvedShareLink> {
  const link = await db.shareLink.findUnique({ where: { id: token } });
  if (!link) return { status: "not_found" };
  if (link.revokedAt || link.expiresAt < new Date()) return { status: "expired" };

  if (opts.bumpAccess) {
    await db.shareLink.update({
      where: { id: link.id },
      data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
    });
  }

  if (link.resourceType === "ACTIVITY_RECORD") {
    const view = await getVerificationView(link.resourceId);
    return { status: "ok", resourceType: "ACTIVITY_RECORD", label: link.label, view, expiresAt: link.expiresAt };
  }

  const form = await db.generatedForm.findUnique({
    where: { id: link.resourceId },
    include: { organization: true },
  });
  if (!form) return { status: "not_found" };

  return {
    status: "ok",
    resourceType: "GENERATED_FORM",
    label: link.label,
    expiresAt: link.expiresAt,
    form: { id: form.id, templateKey: form.templateKey, organizationName: form.organization.name, createdAt: form.createdAt },
  };
}
