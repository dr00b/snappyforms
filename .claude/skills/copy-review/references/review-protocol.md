# Review protocol

## Finding format

One block per finding:

```
[HIGH] terms/cookie_policy.md:8
  current:  "...does not apply to Mailchimp or SnappyForms web Services ... please click here."
  issue:    third-party boilerplate residue; non-descriptive link text; dead link
  suggest:  <your own rewrite>
  source:   CDS https://contentdesign.intuit.com/style-and-usage/formatting/#links (fetched 2026-09-12)
            + house rule docs/copy-standards.md#third-party-residue
  reword risk: low — file is not rendered by any route; no e2e or README reference
```

### The `source:` line has exactly two legal shapes

1. `CDS <url> (fetched <date>)` — permitted **only** if you fetched that URL successfully in
   this session and it is in the fetch log.
2. `house rule docs/copy-standards.md#<anchor>`

A finding with neither must be relabelled `general copy suggestion (not CDS-verified)`. Never
write "per the CDS" for a page you did not fetch this session. A citation to a page you did
not read is the single worst failure this skill can produce — it is both wrong and the thing
that breaks the legal story.

Add `confidence: low` when the fetched answer was vague or the rule is inferred rather than
stated.

## Severity

| Level | Meaning |
|---|---|
| **blocker** | Copy that misleads about benefit eligibility, weakens a "not a government system / does not determine eligibility / data is fictional" disclaimer, misstates what a record proves, or exposes PII-shaped data. Ranks above every style rule, always. |
| **high** | Brand-rename residue; un-scrubbed third-party boilerplate; non-descriptive link text; role-term drift; missing alt text; a domain acronym unexpanded on first use; a consent string that understates what is shared. |
| **medium** | A CDS style deviation *with a live citation*. |
| **low** | Polish: contractions, sentence length, markup used for layout inside body copy. |

A style finding never outranks a blocker. If you find yourself proposing to soften a legal
disclaimer for tone, stop — that is the failure mode this rubric exists to prevent.

## Blast-radius checklist

Run this for **every** proposed reword, before reporting it. Rewording is not free here.

1. Search the tests and docs for the string **two ways** — an exact-match grep alone is not
   enough, because the e2e scripts also assert via case-insensitive regex
   (`getByText(/awaiting organization/i)`), which `grep -F` will not find:

   ```
   grep -rn -F  "<exact current string>"  frontend/e2e/ README.md
   grep -rni    "<distinctive word pair>" frontend/e2e/ README.md
   ```

   The second form is the one that catches regex assertions and differently-cased quotes. Use
   a distinctive two- or three-word fragment, not the whole sentence.
2. `ls frontend/e2e/screenshots/` — committed PNG baselines bake in wording. A reworded
   visible label invalidates them, and a review **cannot** regenerate them; that needs a human
   running the app.
3. Centralized label maps (`frontend/src/lib/activityLabels.ts`): the **keys are schema enum
   values** and are code, not copy — never touch them. Only the map *values* are rewordable,
   and changing one value changes every screen and the generated PDF at once.
4. Notification copy is persisted: titles and bodies are written into database rows, so
   seeded and historical rows keep the old wording. A reword produces a mixed-vocabulary
   inbox in the demo.
5. Protected strings (see `docs/copy-standards.md`): flag and propose, never suggest applying
   without naming a human reviewer.

### Grades

| Grade | Condition | Action |
|---|---|---|
| **low** | Single occurrence, no test / README / screenshot hit | Safe to apply on request |
| **medium** | One e2e assertion or one README mention | Apply on request **and** list the `path:line` to update in the same commit |
| **high** | Screenshot baseline + README + e2e, or any protected / legal string | **Recommend, do not apply.** List every coupled file and the manual steps |

## Report tail

Always end the report with:

**Fetch log** — one row per fetch: URL, the question asked, timestamp. This is the auditable
record that the skill read live and stored nothing.

| URL | Question asked | Fetched |
|---|---|---|

**Not checked this run** — every routed URL the budget dropped, so the omission is visible
rather than silent.

**Adjacent, non-copy** — at most one note per run for design-token, markup, or layout defects
noticed in passing. Do not expand this into a second review.
