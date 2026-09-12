---
name: copy-draft
description: Drafts new user-facing strings for this repo — error messages, empty states, confirmations, field labels and helper text, notification titles and bodies, button labels, disclaimers — by consulting the public Intuit Content Design System live by URL before writing, then self-checking the draft. Use when building a new screen, form, error path, or notification and the wording needs to be written rather than reviewed.
allowed-tools: Read, Grep, Glob, WebFetch, Edit, Write
---

# Drafting copy against the Intuit Content Design System

Writes copy that does not exist yet. To review copy already in the repo, use `copy-review`.

## Legal posture

Identical to `copy-review`, and it binds here too: the Intuit Content Design System
(<https://contentdesign.intuit.com/>) is "© Intuit Inc. All rights reserved" with no reuse
grant. **Read `../copy-review/SKILL.md` "Legal posture" and "Out of scope" before fetching.**
The short version:

- Never write Intuit's wording into a repo file. Their guidance shapes your draft; their
  sentences never land on disk.
- The strings you produce must be **your own original copy for this product**, not adapted
  examples from their pages.
- Fetch on demand, one narrow question per URL, never crawl.
- Say "per the CDS" only about a page you actually fetched this session, and cite its URL.
- `/voice-tone/*` is method only — never adopt Intuit, Mailchimp, QuickBooks or TurboTax brand
  voice for this product.

## Workflow

1. **Name the surface.** Which one is being built: error, empty state, confirmation, field,
   action/button, notification, tooltip, disclaimer, or marketing copy?
2. **Read the house rules** — `docs/copy-standards.md` (else `CLAUDE.md`, else none). These
   beat the CDS on conflict, always. Check the protected-strings list: if the new copy sits
   beside a legal disclaimer or a consent string, that constraint outranks any style rule.
3. **Read neighbouring copy** in the same flow so the draft matches what already ships, and
   check the centralized label maps in `frontend/src/lib/activityLabels.ts` so you reuse the
   terminology already in use rather than inventing a synonym.
4. **Route and fetch.** Read `../copy-review/references/cds-map.md` — it explains that most
   topics are anchor sections on one long parent page, so fetch the parent and ask about the
   sections you need. Fetch the surface's page plus at most one or two matches for what you
   are about to write (currency, dates, sensitive IDs, bad news, consent). **Budget: ≤ 4
   pages.** Never fetch a leaf URL; it redirects to an anchor on its parent. If `cds-map.md`
   is unreachable because this skill was copied out of the repo on its own, fetch
   `https://contentdesign.intuit.com/product-and-ui/<surface>/` directly and say you are
   working without the index.
5. **Draft 2–3 options** in your own words, shortest first. Say what each optimizes for.
6. **Self-check** each draft against: the house rules; the fetched guidance; readability for
   an audience with low trust and real consequences for getting it wrong; and whether it
   overpromises what this product can do.
7. **Cite.** Note which URLs you fetched and what you took from each, in your own words. If
   you could not fetch, say so and label the draft `not CDS-verified`.

## If the network is unavailable

Draft anyway from the house rules and the surrounding copy, and say plainly:
`not CDS-verified — could not reach contentdesign.intuit.com`. Never fill the gap from memory
and present it as CDS guidance.

## This product's constraints

Copy here is read by people whose benefits may depend on getting a record right. That outranks
tone and brevity:

- Never imply this is a government system, and never imply it decides eligibility.
- Never overstate what a confirmed record proves or who must accept it.
- Prefer plain, concrete, checkable statements over warmth.
- Keep the existing disclaimers intact when writing copy near them.
