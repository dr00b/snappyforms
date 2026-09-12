---
name: copy-review
description: Reviews this repo's user-facing copy — UI labels, button text, error and empty-state strings, notification titles and bodies, SEO metadata, legal disclaimers, terms/*.md — against the public Intuit Content Design System, fetched live by URL at review time, plus the repo's own standards file. Use when asked to review copy, check wording, microcopy, tone, terminology consistency, or copy readability/accessibility on a diff, PR, file, or the whole repo. Reports findings with file:line, severity, and suggested rewrites; edits nothing unless the user names findings to apply.
allowed-tools: Read, Grep, Glob, WebFetch, Edit, Write, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(grep:*)
---

# Copy review against the Intuit Content Design System

Reviews copy that already exists. To write copy that does not exist yet, use `copy-draft`.

The Intuit Content Design System (CDS, <https://contentdesign.intuit.com/>) is public
guidance published by Intuit Inc. for people writing for Intuit. We are readers of a public
website, nothing more. **Read the "Legal posture" section below before the first fetch — it
constrains how this skill may work, not just what it may say.**

## Legal posture — non-negotiable

The CDS carries "© Intuit Inc. All rights reserved" with no license or reuse grant, and
Intuit's website terms limit use to internal, lawful, non-commercial purposes while
prohibiting reproduction and "scraping, accessing, or downloading content that doesn't belong
to you". Its `robots.txt` permits ordinary reading of a page. So:

1. **Never write Intuit's wording into any file in this repo.** Not `docs/`, not code
   comments, not commit messages, not a saved report file. No mirror, no cache, no local
   summary of their rules, no derived lint ruleset. `references/cds-map.md` holds URLs only.
2. **Fetch on demand, never crawl.** Fetch only URLs named in `references/cds-map.md`, or one
   constructed for a single specific term. Do not enumerate, crawl, walk the sitemap, or fetch
   a section to "see what's there".
3. **Respect the fetch budget** in "Fetch budget" below. It is a number, not a suggestion.
4. **Unfetched means unattributed.** A finding may say "per the CDS" *only* if you
   successfully fetched a page in this session that actually says so, and only with that URL
   in the `source:` line and the fetch log. You already know generic style-guide rules; those
   are labelled `general copy suggestion (not CDS-verified)` and never attributed to Intuit.
5. **In chat, state conclusions in your own words plus the URL.** Quote at most a short phrase,
   and only when the exact wording is what's under discussion.
6. Never imply Intuit endorses, sponsors, or reviewed this project. Do not publish this skill
   to a public skill marketplace — that is a different legal posture than internal use.

## Out of scope — do not apply

Read this before selecting any URL. Reasons are attached because reasons survive paraphrase
and bare lists get rationalized around.

- **`/voice-tone/*` (intuit-brand, mailchimp, quickbooks, turbotax) — method only, never
  rules.** These are *other companies' brand voices*. You may read them to learn how a voice
  definition is structured, then offer to help the maintainer define this product's own voice
  in `docs/copy-standards.md`. Never cite their voice attributes as a rule, never let them
  drive a tone finding, never give this product a tax-software personality.
- **`/style-and-usage/product-names/` and Intuit product names generally.** Do not import
  another company's product-naming conventions or names. Corollary: finding "Mailchimp" in
  this repo's `terms/` files is a **defect to remove**, not a convention to follow.
- **`/ai/using-ai/*`, `/foundations/tools-and-apps/`, `/foundations/how-we-work/`,
  `/foundations/content-testing/*`, `/foundations/content-strategy-101/`** — Intuit-internal
  process, org, and tooling material. Nothing in it is code-reviewable.
  (`content-strategy-101` is also mostly video embeds.)
- **`/ai/ux-patterns/*`** — inactive unless the diff introduces a generative or assistant
  surface. This product has none.
- **`/talking-to-customers/money-terms/`** — tax and consumer-finance framing. Apply only
  where our domain genuinely matches (hour counts, reimbursements). Never import tax-refund
  framing into benefits copy.
- **Scaffolding and events** — the lorem-ipsum pages, `/test-space/`, the symposium pages,
  `/give-feedback/`, `/inclusivitybot-faq/`, `/privacy-policy/`. Never fetch.
- **Normative mismatch, generally.** CDS guidance is tuned for consumers of tax and accounting
  products. Where this repo's audience or legal obligations differ, the repo wins — see
  precedence below.

## House rules and precedence

Locate this repo's own standards, in order: `docs/copy-standards.md`, else `CLAUDE.md`, else
none. If none exists, say so in the report and run in CDS-only mode.

**House rules beat the CDS on conflict.** Always. A style rule never overrides a legal
disclaimer, a required consent string, or an accuracy constraint.

## Workflow

**0 — Scope.** Explicit paths if given; else `git diff --name-only <base>`; else a declared
whole-repo review using the copy inventory in `docs/copy-standards.md` rather than a blind
glob.

**1 — Extract candidate strings** with `path:line`. Look for JSX text nodes, `title:`/`body:`
at notification call sites, validation `.message` values, route metadata, centralized label
maps, and markdown in `terms/`.

**2 — Local pass, no network.** House rules; terminology drift (compare the centralized label
map, the schema enums, marketing copy, and `terms/*.md` against each other and report the
disagreement — deciding which term wins is a human call); brand-rename residue; integrity of
protected strings. This pass must produce findings even if every later fetch fails.

**3 — Route.** Read `references/cds-map.md` and map the signals you found to a URL set. Rank
by (matching strings × severity ceiling) and truncate to budget.

**4 — Fetch.** `WebFetch` each selected page with **one narrow question** naming the sections
you need, e.g. "What does this page say about commas in serial lists and about ampersands?
Answer in your own words." Never ask for the page's full text. Log every fetch. If an answer
comes back vague, mark the finding **low confidence** rather than inventing a rule. On a 404
or a redirect loop, emit `URL index entry stale: <url>` as a finding against `cds-map.md`
itself.

**5 — Judge.** Apply the fetched answers to the candidate strings. Assign severity and a
`source:` line per `references/review-protocol.md`.

**6 — Blast radius.** For every proposed reword, run the checklist in
`references/review-protocol.md` before reporting it. Rewording here breaks tests, screenshots,
and the README demo script.

**7 — Report.** Findings, then the fetch log, then `not checked this run: <urls>` for anything
the budget dropped. **Change nothing.**

## Fetch budget

Most CDS topics are anchor sections on one long parent page, so a handful of fetches covers a
lot of ground — all 18 punctuation topics are a single page. `references/cds-map.md` explains
the shape; obey it and the budget is generous rather than tight.

- **≤ 6 pages** per review; **≤ 10** for a declared whole-repo review.
- **≤ 5** targeted single-term word-list lookups.
- Zero fetches is a correct outcome for a diff with no copy in it. Nothing is mandatory.
- Dedupe within the session: a page already fetched this conversation is reused from context.
  Anchors on a page you already fetched cost nothing.
- **Never fetch a leaf URL** like `/style-and-usage/punctuation/commas/` — it redirects to an
  anchor on the parent and returns the same page. Fetch the parent, cite the anchor.
- Word-list lookups are last resort — only for a term that is genuinely contested (two in-repo
  sources disagree, or it is domain-loaded) *and* appears in user-facing copy. Never to confirm
  ordinary usage. Never fetch `/word-list/` in bulk or a bare `/word-list/<letter>/`.

## When the network is unavailable

If `WebFetch` is missing, blocked, or every fetch fails, continue in **local-only mode**: emit
the house-rule, terminology-drift, brand-residue and blast-radius findings, and stamp the
report header exactly:

> `CDS-unverified run — could not reach contentdesign.intuit.com (<reason>). Findings below
> come only from docs/copy-standards.md and this repo. No finding in this report is attributed
> to Intuit.`

Partial failure is handled per finding, not all-or-nothing. Never fill the gap from memory and
call it CDS guidance.

## Applying fixes

Phase 1 is the default and **edits nothing**. Only after the user names which findings to
apply:

- Apply **low and medium** reword-risk findings only.
- Update every coupled file in the same change — test assertions, README demo steps.
- Report **high**-risk findings as deferred, with their manual steps (regenerate screenshots,
  re-walk the README demo, get a human to review legal wording).
- Never touch a protected string without the user explicitly naming it.

## Stay in your lane

This is a copy review. Design-token misuse, markup problems, and layout hacks are real defects
but not copy — cap them at **one "adjacent, non-copy" note per run** and do not drift into
design-system or markup review.
