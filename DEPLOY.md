# Deploying SnappyForms to Firebase App Hosting

SnappyForms is a Next.js 14 (App Router) app backed by PostgreSQL via Prisma. Firebase
App Hosting builds the app from your GitHub repo, serves it on Cloud Run, and resolves
secrets from Google Cloud Secret Manager. Configuration lives in
[`apphosting.yaml`](apphosting.yaml).

> **Root directory:** `/` (the repo root). This is not a monorepo — `package.json`,
> `next.config.js`, `src/`, and `prisma/` are all at the root.

---

## 0. Prerequisites

- A Firebase project on the **Blaze (pay-as-you-go)** plan (App Hosting requires it).
- The Firebase CLI **v13.x or newer**:
  ```bash
  npm install -g firebase-tools
  firebase --version   # >= 13
  firebase login
  ```
- Your code pushed to a **GitHub** repository (App Hosting deploys from GitHub).
- A reachable **PostgreSQL** database (e.g. Neon). Use a **pooled** connection string
  — App Hosting scales to multiple instances and a direct connection will exhaust
  Postgres connection slots.

---

## 1. Prepare the production database

Apply the schema to your production database. App Hosting builds and serves but does
**not** run migrations for you, so do this yourself (once per schema change):

```bash
# Use the DIRECT (non-pooled) URL for migrations — pooled endpoints don't support DDL well.
DATABASE_URL="postgresql://<user>:<pass>@<direct-host>/<db>?sslmode=require" \
  npx prisma migrate deploy
```

This applies everything in `prisma/migrations/` (currently the single squashed
`20260724000000_init`). Do **not** seed a real deployment with the demo data —
`prisma/seed.ts` is for local/demo use only.

---

## 2. Create the secrets

The app needs three secret values. Generate strong ones:

```bash
openssl rand -hex 32   # -> SESSION_SECRET
openssl rand -hex 32   # -> CASE_DATA_ENCRYPTION_KEY
```

Store all three in Secret Manager via the CLI. `apphosting:secrets:set` creates the
secret and grants the App Hosting backend access in one step:

```bash
firebase apphosting:secrets:set DATABASE_URL
#   paste your POOLED connection string when prompted

firebase apphosting:secrets:set SESSION_SECRET
#   paste the first openssl value

firebase apphosting:secrets:set CASE_DATA_ENCRYPTION_KEY
#   paste the second openssl value
```

These names match the `secret:` references in `apphosting.yaml`. If you create the
backend before the secrets, re-grant access afterwards with
`firebase apphosting:secrets:grantaccess <NAME> --backend <BACKEND_ID>`.

---

## 3. Set your app domain

Edit [`apphosting.yaml`](apphosting.yaml) and replace the placeholder:

```yaml
  - variable: APP_BASE_URL
    value: https://REPLACE-with-your-app-domain   # <- your App Hosting URL
```

`APP_BASE_URL` is used to build QR-code payload links and magic-link URLs, so it must
match the domain the app is actually served on. You can fill in the real value after
the first deploy tells you the URL, then redeploy.

`DEMO_MODE` and `NEXT_PUBLIC_DEMO_MODE` are already set to `"false"` for production —
leave them off unless you deliberately want the seeded demo-login buttons and
`/dev/inbox`.

---

## 4. Create the App Hosting backend

Link the GitHub repo to a backend. This walks you through installing the GitHub app,
picking the repo, the **live branch** (e.g. `main`), and a region:

```bash
firebase apphosting:backends:create --project <YOUR_PROJECT_ID>
```

When prompted for the repository root, accept the default (`/`).

---

## 5. Deploy

App Hosting uses **continuous deployment**: every push to the connected live branch
triggers a build + rollout.

```bash
git push origin main
```

Watch the rollout:

```bash
firebase apphosting:backends:list
# or view build logs in the Firebase console → App Hosting → your backend
```

To trigger a rollout manually (e.g. without a new commit):

```bash
firebase apphosting:rollouts:create <BACKEND_ID>
```

What runs during the build (no action needed — this is just what happens):
1. `npm ci` → the `postinstall` script runs `prisma generate`.
2. `npm run build` → `next build`.
3. The image is deployed to Cloud Run with the `apphosting.yaml` env/secrets.

---

## 6. Verify

- Open the backend URL. `/login` should render (the password sign-in form; demo-login
  buttons are hidden because `NEXT_PUBLIC_DEMO_MODE=false`).
- Sign in with a real account and confirm the session sticks — App Hosting serves
  HTTPS, so the `Secure` session cookie works. **Do not** set `INSECURE_HTTP_COOKIES`
  here; that flag exists only for the local plain-HTTP container stack.
- Check the App Hosting logs for any Prisma connection errors (usually a sign the
  `DATABASE_URL` isn't the pooled endpoint, or the secret didn't resolve).

---

## Ongoing: schema changes

For any future migration:

```bash
# 1. locally, against a dev DB:
npx prisma migrate dev --name <change>
git add prisma/migrations && git commit -m "migration: <change>"

# 2. apply to production BEFORE (or as part of) the deploy:
DATABASE_URL="<prod-direct-url>" npx prisma migrate deploy

# 3. push to trigger the rollout:
git push origin main
```

Applying the migration before the new code rolls out avoids the app briefly running
against a schema it doesn't expect.

---

## Environment variable reference

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Secret | **Pooled** Postgres URL for the app; use the direct URL only for `migrate deploy` |
| `SESSION_SECRET` | Secret | Signs/authenticates session cookies (`openssl rand -hex 32`) |
| `CASE_DATA_ENCRYPTION_KEY` | Secret | AES-256-GCM key for `ParticipantCase.caseNumberEncrypted` (`openssl rand -hex 32`) |
| `APP_BASE_URL` | Plain | Public https URL; used for QR/magic-link generation |
| `DEMO_MODE` | Plain | `"false"` in production |
| `NEXT_PUBLIC_DEMO_MODE` | Plain (BUILD) | `"false"`; inlined into the client bundle at build time |
