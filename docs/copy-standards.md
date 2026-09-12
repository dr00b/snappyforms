# Copy standards

Facts about **this repository's** copy: what may not be changed casually, and where copy
lives. Everything here is our own.

## Attribution and scope

Our copy review consults the public Intuit Content Design System
(<https://contentdesign.intuit.com/>) by fetching pages live at review time, the way a person
opens a page in a browser. That material is © Intuit Inc.; **none of it is reproduced, cached,
or paraphrased in this repository**, and Intuit has no involvement in or endorsement of this
project. See `.claude/skills/copy-review/SKILL.md` for the full posture.

This file deliberately contains **no general style rules** — no "use active voice", no
"sentence case", no word list. Style guidance comes from a live fetch or not at all. If the
site is unreachable, a review says so and falls back to the repo facts below. That keeps this
file provably ours and keeps the failure mode honest.

## Precedence

**These standards beat the Content Design System on any conflict.** Always.

Intuit's guidance is written for consumers of tax and accounting products. This product is
read by people whose public benefits may depend on an accurate record of their hours. Where
guidance about tone, warmth, or brevity collides with accuracy, a legal disclaimer, or a
consent disclosure, accuracy wins and the disclaimer stays. A style finding never outranks
a correctness or legal one.

Order: legal and consent requirements → accuracy about what this product does → these
standards → live CDS guidance → general copy judgement.

## Protected strings

Flag and propose, **never apply without a named human reviewer.** These carry legal,
certification, or consent weight, or are required by the project spec.

| Location | What it is |
|---|---|
| `frontend/src/lib/pdf/render.ts:120` (`drawVerwovoNotice`) | Notice stamped on every generated PDF: who prepared the draft, and that the receiving agency decides sufficiency. Reaches agencies outside the app. |
| `frontend/src/app/(app)/activity/[id]/page.tsx:244` | Spec-mandated confirmation language attested to by a checkbox. |
| `frontend/src/app/(app)/forms/requests/[id]/page.tsx:240,253,257` | Certification language, plus the statement that the signature is a demonstration placeholder and not legally binding. |
| `frontend/src/components/ShareLinkPanel.tsx` (`FIELD_DESCRIPTIONS`) | Discloses exactly which fields a share link exposes. Changing it changes what a person believes they consented to. |
| `frontend/src/components/AdvocacyPanel.tsx` | States that messages are not delivered to any congressional office. |
| `frontend/src/lib/notifications.ts:31,33` | One-time-code messages, including the "demonstration message" qualifier. |
| Every "not a government system / does not determine eligibility / data is fictional" disclaimer, wherever it appears | The claim the whole prototype rests on. Never soften, shorten, or relocate for tone. |
| `terms/terms_of_service.md`, `terms/privacy_policy.md`, `terms/cookie_policy.md` | Legal documents. *(Note: `cookie_policy.md` is known-defective un-scrubbed third-party boilerplate — fixing that is in scope; rewriting the other two for style is not.)* |

## Copy inventory

Where user-facing copy lives. A whole-repo review should work from this list rather than
globbing `frontend/src`.

**Marketing and unauthenticated**
- `frontend/src/components/LandingPage.tsx` — largest copy file; hero, steps, feature cards, footer disclaimer
- `frontend/src/components/DemoLanding.tsx`
- `frontend/src/app/layout.tsx` — route metadata (title, description)
- `frontend/src/app/landing/page.tsx`, `frontend/src/app/demo/page.tsx`, `frontend/src/app/page.tsx`

**Centralized labels** — the one place terminology is already centralized, and the best hook
point for consistency
- `frontend/src/lib/activityLabels.ts` — `STATUS_LABELS`, `FORM_CERT_STATUS_LABELS`,
  `CATEGORY_LABELS`. **The keys are Prisma enum values: code, not copy. Never change a key.**

**Notifications and messages**
- `frontend/src/lib/notify.ts` — `notifyUser({ title, body })`; callers in ~30 API routes supply the text
- `frontend/src/lib/notifications.ts` — one-time-code message templates

**Validation and errors**
- `frontend/src/lib/validation.ts` — Zod schemas; mostly default messages
- `frontend/src/lib/apiError.ts` — machine codes only; client components supply the human text

**Documents**
- `frontend/src/lib/pdf/render.ts`, `pa1938.ts`, `pa1895.ts`, `genericForm.ts`
- `frontend/src/lib/formTemplates.ts` — form library names and descriptions

**Copy-dense app screens** — `frontend/src/app/(app)/activity/`, `forms/`, `dashboard/`,
`organization/`, `qr/`, `settings/`; `frontend/src/components/ActivityFieldsForm.tsx`,
`LoginForm.tsx`, `ShareLinkPanel.tsx`, `AdvocacyPanel.tsx`

**Legal** — `terms/*.md` (not currently rendered by any route)

## Terminology drift

There is no curated glossary here, on purpose: one would go stale silently. Drift is caught
by comparison instead — check these four against each other and report the disagreement.
Deciding which term wins is a human call, not the review's.

1. `frontend/src/lib/activityLabels.ts` — the de facto canonical source
2. `frontend/prisma/schema.prisma` — enum values and model names
3. `frontend/src/components/LandingPage.tsx` — marketing vocabulary
4. `terms/*.md` — legal vocabulary

Known open drift: the participant role is called three different things across these sources.

## Rewording is not free

Before changing any visible string, run the blast-radius checklist in
`.claude/skills/copy-review/references/review-protocol.md`. Copy here is coupled to:

- `frontend/e2e/*.mjs` — story scripts assert literal display strings
- `frontend/e2e/screenshots/` — committed PNG baselines bake in wording; regenerating them
  requires running the app by hand
- `README.md` — the 16-step demo script quotes button labels verbatim
- persisted `Notification` rows — seeded and historical rows keep the old wording
