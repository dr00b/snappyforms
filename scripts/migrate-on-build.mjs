// Applies pending Prisma migrations during a deployment build.
//
// App Hosting builds and serves but has no migration step of its own, so a
// schema change used to ship as working code pointed at a database that did not
// have the column yet — the failure looks like a generic 500 at runtime, far
// from its cause. Running here means a migration that fails takes the build down
// with it, and no release ever reaches users ahead of its schema.
//
// It is deliberately a NO-OP unless MIGRATE_DATABASE_URL is set, so `npm run
// build` stays offline-safe everywhere else: the Docker image build, CI, and a
// developer's laptop all build without touching any database.
//
// MIGRATE_DATABASE_URL must be Neon's DIRECT (non-pooled) URL. The pooled
// endpoint runs through PgBouncer in transaction mode, which breaks the session
// advisory lock migrations take — see DEPLOY.md.

import { execFileSync } from "node:child_process";

const url = process.env.MIGRATE_DATABASE_URL;

if (!url) {
  console.log("[migrate-on-build] MIGRATE_DATABASE_URL not set — skipping migrations.");
  process.exit(0);
}

console.log("[migrate-on-build] Applying pending migrations...");

try {
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
  console.log("[migrate-on-build] Migrations are up to date.");
} catch {
  // Fail the build. Shipping code that expects a column the database lacks is
  // strictly worse than not shipping.
  console.error("[migrate-on-build] Migration failed — failing the build.");
  process.exit(1);
}
