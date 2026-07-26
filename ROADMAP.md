# SnappyForms roadmap

This build implements all five phases of the product spec's build sequence: **Phase 1 — Core
demonstration**, **Phase 2 — Verification**, **Phase 3 — Documentation**, **Phase 4 — Organization
model**, and **Phase 5 — Future integration demonstration**. The "Also deferred" section below
covers what's intentionally out of scope for the whole prototype.

## Done: Phase 2 — Verification

- `ActivityRecord`, `RecordConfirmation`, `RecordDispute`, `FraudReviewFlag`, `Notification`,
  `AuditLog` entities. 8 of the spec's 10 statuses are used (see the Phase 2 plan for the two
  simplifications: no separate `DRAFT`/`REQUESTED`).
- Both directions: participant-initiated requests (`/activity/new`) and organization-initiated
  records (`/activity/new-for-participant`), with volunteer/community-service categories
  auto-confirming per spec section 5.
- The exact spec section 6 confirmation language, checkbox, and **Confirm Record** button, plus
  decline / request-changes / resubmit / accept / dispute / correct (revision) / revoke actions.
- Non-blocking fraud-review badges (`src/lib/activity.ts`'s `computeFraudFlags`): duplicate
  record, >16h/day, overlapping activity, high monthly hours, recently-created org, repeated
  verifier pairing.
- In-app notification center (`/notifications`, unread badge on the bottom nav) that also logs a
  simulated email via the Phase 1 dev-notification pipeline.
- Org admin audit log (a tab inside `/activity`) and member suspend/reactivate.

Not built in Phase 2 (still deferred): file attachments on activity records, a dedicated
admin fraud-review queue page (folded into the audit tab / record badges instead), and the
richer member-accountability dashboard (join date, per-member verification counts — that's Phase 4).

## Done: Phase 3 — Documentation

- PDF generation (`pdf-lib`, `src/lib/pdf/`) for the 4-template form library: PA 1938 demonstration
  (guided wizard at `/forms/pa-1938`), Monthly Volunteer Summary, Work Activity Verification, and
  Education/Training Attendance Verification (the latter three generated from a picker of
  confirmed records at `/forms`). `FormTemplate` is a static config
  (`src/lib/formTemplates.ts`), not a DB table — see the Phase 3 plan for why; `GeneratedForm`
  (PDF bytes) and `ShareLink` are real tables.
- `ShareLink` is the single mechanism behind both "time-limited sharing links" and the QR hub's
  **Form Request** tab (now functional, replacing the earlier placeholder) — expiration picker,
  a clear description of exactly what fields will be visible, a confirmation step, then a QR +
  copyable link, reachable from `/forms`, `/activity/[id]`, and `/qr`.
- Public, unauthenticated `/verify/[id]` and `/share/[token]` pages showing only the spec's
  allowed fields (participant name-or-initials per the new
  `ParticipantProfile.showFullNameOnVerification` flag, org, category, dates, hours, confirmation
  date) — never case numbers, contact info, or full history. Both are rate-limited via the
  existing `checkRateLimit` helper.

### Follow-up: collaborative PA 1938 certification

The first cut of the PA 1938 wizard let the *participant* type in and "sign" the agency
certification section themselves — a real design flaw, since that certification is supposed to
come from the organization's own representative. Fixed with a `FormCertificationRequest` entity
that mirrors the `ActivityRecord` confirm/decline/request-changes/resubmit workflow: the
participant submits volunteer + service info (`/forms/pa-1938`, now 3 steps + a review/send
step), an org rep reviews and **certifies** it in-app at `/forms/requests/[id]` (or declines /
requests changes), and only after certification does the participant **finalize** the actual PDF
— which is also where the optional SSN-last-4 field lives now, entered fresh at that final step
and never persisted, same guarantee as before but now correctly scoped to a multi-session flow.
Discoverable from `/forms`' new **Pending** tab (participant side) and `/activity`'s new
**Form certifications** tab (org side). Only PA 1938 needed this — the 3 generic templates'
"certification" is static boilerplate text, not a role someone else has to actively sign.

Not built (still deferred): file-attachment support carried over from Phase 2, and extending this
collaborative pattern to any future form template that might need a second-party signer.

## Done: Phase 4 — Organization model

- `OrganizationDomain` verification, simulated as a one-click "Verify domain" step showing the
  generated token as a DNS TXT-record instruction (`/organization/[id]/settings`) — no real DNS
  lookup or email send, consistent with how OTP codes are already simulated. Each domain has an
  independent `allowAutoJoin` toggle.
- Membership trust model, deliberately inverted from the spec's literal "verify before you can
  act" ordering per explicit product direction: `OrganizationMembership.status` gains `REQUESTED`
  (join needs admin approval — only reachable when the domain's `allowAutoJoin` is off) and
  `PENDING` (a real member who can **already** confirm/decline/request-changes on
  `ActivityRecord`s and certify/decline/request-changes on `FormCertificationRequest`s, the same
  as `ACTIVE`). The first approval action a `PENDING` member completes is stamped
  (`firstApprovalTargetType/Id/At`) purely as a trust-ledger entry — it never blocks or delays the
  action — and shows up in a **Needs ratification** queue on `/activity`'s new **Members** tab,
  where an admin's one-click **Ratify** flips them to `ACTIVE`. Admins can also **Activate now**
  or **suspend/reactivate** any member directly. `getVerifierEligibleMembership()` (`ACTIVE` or
  `PENDING`) replaces the old `ACTIVE`-only check everywhere a member takes a verification action;
  admin-only actions still require `ACTIVE` + `ADMIN`.
- `OrganizationLocation` with its own QR code, and `VolunteerOpportunity` /
  `OpportunitySignup` (browse/search at `/opportunities`, sign up, cancel, add-to-calendar via a
  plain-text `.ics` download, QR check-in reusing the existing scan infrastructure, and a
  "Request verification" hand-off into `/activity/new` prefilled with the org and opportunity
  title). Org profiles show a real upcoming-opportunities list instead of the earlier placeholder.
- Member accountability dashboard (`/activity` Members tab): status, join requests, records
  verified, disputes, and last-active timestamp per member, computed from existing
  `RecordConfirmation` / `RecordDispute` / `Session` data rather than new tracking columns.

Not built in Phase 4 (still deferred): a distinct "unusual transaction flags" dashboard signal
beyond the fraud badges already on individual records; a third "trusted member can approve joins"
permission tier (the spec mentions it as an option — only admins approve `REQUESTED` joins and
ratify first approvals in this build); a dedicated public `/locations/[id]` page (location QR
scans redirect to the org profile instead).

## Done: Phase 5 — Future integration demonstration

- **Agencies are administratively provisioned, not self-service** — `Agency` and
  `AgencyMembership` rows are seed-only, so `AgencyMembership` deliberately skips the Phase 4
  trust/ratification machinery entirely; every membership is created directly at `ACTIVE`.
  `role: "ADMIN" | "STAFF"` only gates the API console and case-number reveal from ordinary
  case/bulk-query work. `Agency` has no `Handle`/`QRIdentifier` — unlike organizations, nothing
  about an agency is publicly searchable or scannable; staff reach `/agency/[id]/...` from their
  dashboard.
- **Real encryption-at-rest for case numbers** (`src/lib/encryption.ts`, AES-256-GCM via Node's
  built-in `node:crypto`, no new dependency) — the first genuine encryption in this codebase
  (previously the only sensitive-field precedent was "never persist it," used for SSN-last-4 in
  Phase 3). `ParticipantCase` stores the full ciphertext plus a plaintext last-4 fragment for
  masked display without decrypting on every read; the real case number is only ever decrypted by
  one ADMIN-only, rate-limited, audit-logged **Reveal case number** action.
- **Consent center** (`/consent`, participant-facing): a single `Consent` row per case
  (grant/revoke, mirroring `ShareLink`'s `revokedAt`-nullable shape) gates every place an agency
  or its API can see a participant's confirmed hours. `getCaseHoursView()`
  (`src/lib/caseHours.ts`) is the one helper every consent-gated read path uses — it's never
  re-implemented inline — and always computes hours live from `ActivityRecord`, the same
  `_sum: { totalHours: true }` aggregate `computeFraudFlags` already uses, rather than storing
  derived state.
- **Agency dashboard**: Cases list/detail, a synchronous **bulk query** simulation
  (`BulkQueryJob` + `BulkQueryResult`, run against a `BenefitProgram`'s open cases — cases without
  consent are always included as an explicit "excluded — no consent" row, never silently
  dropped), and an ADMIN-only **API console** showing the seeded client's `clientId`/scopes (never
  the secret) plus a live request log.
- **Simulated external API**: `POST /api/agency-api/v1/cases/[caseId]/verification`, authenticated
  by client-credential headers (`x-snappyforms-client-id`/`x-snappyforms-client-secret`, bcrypt-compared),
  scope-checked against a `scopes` column on `APIClient` (a plain string column, not a separate
  `APIScope` table — the same static-config simplification as `FormTemplate`), consent-checked via
  `getCaseHoursView`, and rate-limited via the existing `checkRateLimit`. Every branch — including
  auth failures — logs an `APIRequest` row (kept separate from `AuditLog`, which models human
  in-app actions, not machine HTTP calls). A static OpenAPI description is served from
  `GET /api/agency-api/v1/openapi.json`.
- Seeded `Demonstration County Assistance Office` agency: an admin account (`dcao-admin`, added to
  the demo-login buttons), two `BenefitProgram`s (TANF, SNAP E&T), and two cases for Maya — one
  with active consent (hours visible immediately) and one without (to demo the live grant flow).

Not built in Phase 5 (still deferred): self-service agency onboarding; CRUD UI for
`BenefitProgram`/`ParticipantCase` (both are fictional case data — read + consent + verification
only); a real background job queue for `BulkQueryJob` (it runs synchronously); secret-rotation or
client-creation UI for `APIClient` (exactly one seeded client); multi-scope UI (the columns
support more than one scope value, but only one is ever used); conditional `BottomNav` items for
agency staff (reached via the dashboard instead, like other admin-only surfaces).

## Also deferred (not phase-specific)

- English/Spanish demonstration translations
- Block/report/impersonation controls in search
- Device/IP metadata beyond the current placeholder fields
