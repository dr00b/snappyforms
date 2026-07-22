# Security notes (prototype)

VERWOVO is a hackathon-sprint prototype. It is **not** hardened for production or for handling
real personal data. Do not put real names, SSNs, case numbers, or other real personal information
into this instance.

## What's implemented

- OTP codes and magic-link tokens are stored as SHA-256 hashes, never in plaintext; passwords use
  bcrypt.
- OTP codes expire after 10 minutes, allow 5 verification attempts, have a 45s resend cooldown, and
  are rate-limited to 5 requests/hour per identifier.
- Sessions are opaque, DB-backed, revocable tokens (not JWTs) in httpOnly cookies, so "sign out of
  this device" / "sign out everywhere" actually invalidate server-side state immediately.
- QR codes encode only an opaque, randomly generated identifier — never a name, handle, date of
  birth, or case number.
- Case-sensitive-looking inputs (handles) are normalized and compared case-insensitively to avoid
  homograph-style duplicate-handle confusion.
- `ParticipantCase.caseNumberEncrypted` is encrypted at rest with AES-256-GCM
  (`src/lib/encryption.ts`, Node's built-in `node:crypto`, keyed by `CASE_DATA_ENCRYPTION_KEY`).
  Only a masked last-4 fragment is ever shown by default; the full value is decrypted only inside
  one ADMIN-only, rate-limited, audit-logged "reveal case number" action.
- The simulated agency API (`/api/agency-api/v1/...`) uses client-credential auth
  (`x-verwovo-client-id` / `x-verwovo-client-secret`, secret bcrypt-compared, never stored in
  plaintext), enforces per-client scopes, is rate-limited, and requires an active participant
  `Consent` row before returning any hours data — every call, success or failure, is logged to
  `APIRequest`.

## Known limitations (by design, for a sprint prototype)

- **Rate limiting is in-memory** (`src/lib/auth/rateLimit.ts`), not shared across instances and
  reset on server restart. A real deployment needs Redis (or similar) for this to hold under
  horizontal scaling.
- **No real email/SMS delivery.** All "sends" are logged to the `DevNotification` table and shown
  at `/dev/inbox`, gated by `DEMO_MODE`. Turn `DEMO_MODE=false` in any shared/public deployment —
  this also disables the demo-login buttons.
- **IP address capture** trusts the `x-forwarded-for` header as-is; behind a real proxy this needs
  proxy-specific trusted-header configuration to avoid spoofing.
- **No CSRF token** on state-changing routes; they rely on `sameSite=lax` cookies and being
  same-origin fetches from the app itself. Add explicit CSRF protection before any production use.
- **No email/SMS ownership verification beyond OTP possession.** Anyone who can read a code from
  `/dev/inbox` (i.e., anyone with access to this demo instance) can complete login as any
  identifier — acceptable for a sandboxed demo, not for production.
- **`CASE_DATA_ENCRYPTION_KEY` falls back to an insecure, logged, dev-only key if unset.** This is
  fine for a local sandbox but must be set to a real random value (`openssl rand -hex 32`) in any
  shared or persistent environment.
- **The seeded agency API client secret (`demo-agency-secret-123`) is intentionally public**, same
  treatment as the `VerwovoDemo!1` password — documented in README.md so reviewers can `curl` the
  simulated endpoint. Don't reuse this pattern for anything that isn't a disposable demo instance.

## Dependency note

Pinned to the latest Next.js 14.2.x patch (`14.2.35`) rather than the current major (16.x) to avoid
an untested framework-wide API migration (async `cookies()`/`params`, etc.) mid-sprint. `npm audit`
still flags a handful of Next.js advisories that only apply to specific self-hosted/production
configurations this prototype doesn't use (custom Image Optimizer remote patterns, i18n middleware,
WebSocket upgrade proxying) plus one moderate transitive `postcss` advisory bundled inside Next
itself. Re-run `npm audit` and consider the Next 15/16 upgrade before any real deployment.

## If this becomes a real product

- Move rate limiting and OTP storage to a shared store (Redis) with proper locking.
- Add a managed email/SMS provider behind the existing `logNotification` interface (it's already
  the single choke point to swap).
- Add CSRF protection and stricter `Content-Security-Policy` headers.
- Move `CASE_DATA_ENCRYPTION_KEY` to a real secrets manager / KMS with rotation support, rather
  than a single static env var — the encryption mechanism itself (AES-256-GCM,
  `src/lib/encryption.ts`) is real, but key management is sprint-scoped.
- Give `APIClient` real secret rotation and per-client rate-limit tuning instead of one seeded,
  static demo credential.
