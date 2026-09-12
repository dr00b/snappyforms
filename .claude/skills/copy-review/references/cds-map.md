# CDS URL index

A routing table of **URLs only**. Every label here is derived from the URL slug itself; every
trigger signal is our own. This file deliberately contains no Intuit sentences, no summaries,
and no one-line gists of their guidance — a reader learns *where to look*, never *what it
says*. That is what keeps this file ours to commit.

Base: `https://contentdesign.intuit.com`

**Index verified on 2026-09-12.** On a 404, fall back to the section root once, then emit
`URL index entry stale: <url>` as a finding against this file.

## How this site is shaped — read before fetching

Most topics are **anchor sections on one long parent page**, not separate pages. A leaf URL
like `/style-and-usage/punctuation/commas/` 307-redirects to
`/style-and-usage/punctuation/#commas`. The same holds for `formatting`, `numbers`,
`our-principles`, `writing-small`, `notifications`, `mobile`, `inclusive-content`, `help`, and
the whole word list.

Two consequences, both good:

1. **One fetch covers many signals.** All 20 punctuation topics, all 15 formatting topics, and
   all 12 number topics are three page fetches, not 47. Route to the parent, fetch it once,
   and ask about the specific sections you need in a single question.
2. **Cite the anchor, fetch the parent.** Fragments never reach the server, so fetching
   `…/punctuation/#commas` fetches the whole punctuation page anyway. Use the anchor form in
   the `source:` line — it deep-links a human reader straight to the section — and count it
   against the budget as one fetch of its parent.

Never fetch a bare leaf URL: it costs a redirect and returns the same parent page.

## Never fetch

| Path | Why |
|---|---|
| `/voice-tone/intuit-brand/`, `/voice-tone/mailchimp/`, `/voice-tone/quickbooks/`, `/voice-tone/turbotax/` | Other companies' brand voices. Method only, on explicit request — never as rules. |
| `/style-and-usage/product-names/` | Another company's product-naming conventions. |
| `/ai/using-ai/` and its sections | Intuit-internal tooling. |
| `/foundations/tools-and-apps/`, `/foundations/how-we-work/`, `/foundations/content-testing/` | Intuit-internal process and org material. |
| `/foundations/content-strategy-101/` | Mostly video embeds; not code-reviewable. |
| `/word-list/` in bulk, and any `/word-list/<letter>/` | Letter pages are anchors on one large page. Construct `/word-list/<letter>/<term>/` for a single term only. |
| `/lorem-ipsum-2022/` … `/lorem-ipsum-2025/`, `/test-space/` | Site scaffolding. |
| `/2020-writers-symposium/`, `/2021-content-design-symposium/`, `/give-feedback/`, `/inclusivitybot-faq/`, `/privacy-policy/` | Events and site furniture. |
| `/ai/ux-patterns/` | **Gated.** Only if the diff introduces a generative or assistant surface. This product has none today. |

---

## Standalone pages — one topic, one page

Fetch these directly.

| Signal in the code or copy | URL |
|---|---|
| catch-block strings, error-code consumers, failure toasts | `/product-and-ui/errors/` |
| "nothing here yet" renders, zero-length list branches | `/product-and-ui/empty-states/` |
| validation `.message`, field labels, helper and placeholder text | `/product-and-ui/fields/` |
| buttons, links-as-buttons, CTAs | `/product-and-ui/actions/` |
| success screens, confirm dialogs, are-you-sure prompts | `/product-and-ui/confirmations/` |
| tooltip and info-icon text | `/product-and-ui/tooltips/` |
| copy that names a UI element ("tap the Submit button") | `/product-and-ui/writing-about-ui/` |
| dense or jargon-heavy paragraphs, long legal prose | `/accessibility-and-inclusion/readability/` |
| `<img>` without alt, icon-only controls | `/accessibility-and-inclusion/alt-text/` |
| screen-reader-only text, aria labels, heading order | `/accessibility-and-inclusion/accessible-content/` |
| racially loaded metaphors, master/slave, blacklist/whitelist | `/accessibility-and-inclusion/anti-racist-language/` |
| decline, dispute, revoke, denial, rejection copy | `/talking-to-customers/bad-news/` |
| consent prompts, share-link disclosure, release-of-records copy | `/talking-to-customers/consent-and-permission/` |
| one-time codes, sessions, data handling, retention | `/talking-to-customers/security-data/` |
| success and milestone copy | `/talking-to-customers/celebrations/` |
| transactional email copy | `/talking-to-customers/emails/` |
| developer-facing strings, API error payloads | `/talking-to-customers/developers/` |
| emoji in copy | `/style-and-usage/emoji/` |
| general copy quality, unclear which topic applies | `/foundations/basics-of-good-content/` |

---

## Anchor pages — many topics, one fetch each

### `/style-and-usage/punctuation/`
Fetch once if **any** of these fire; name the sections you need in one question.

| Pattern in the copy | Anchor |
|---|---|
| `&` in prose | `#ampersands` |
| possessives, contractions | `#apostrophes` |
| `*`, footnote markers | `#asterisks` |
| `[`, `]` | `#brackets` |
| `:` introducing a list or value | `#colons` |
| serial lists, `, and` | `#commas` |
| `—`, `--`, spaced hyphen, compound modifiers | `#dashes-and-hyphens` |
| `...`, `…` | `#ellipses` |
| `!` | `#exclamation-points` |
| `#` tags | `#hashtags` |
| parenthetical asides | `#parentheses` |
| `%` | `#percent-symbol` |
| trailing periods on labels and fragments | `#periods` |
| `\|` separators | `#pipes` |
| `?` in labels and headings | `#question-marks` |
| quoted words inside a string | `#quotation-marks` |
| `;` | `#semicolons` |
| `/` between alternatives | `#slashes` |

### `/style-and-usage/formatting/`

| Pattern | Anchor |
|---|---|
| ALL-CAPS words; domain acronyms on first use (SNAP, TANF, OTP, DHS) | `#acronyms` |
| street and mailing addresses | `#addresses` |
| bold utility classes or `<strong>` on body copy | `#bold` |
| Title Case headings, labels, and buttons | `#capitalization` |
| italic utility classes on body copy | `#italics` |
| `click here`, `learn more`, bare `here` as link text | `#links` |
| bulleted or numbered strings | `#lists` |
| equations, mathematical symbols | `#mathematical-symbols-and-equations` |
| person names, job titles, organization names | `#names-and-titles` |
| tabular headers and cell copy | `#tables` |
| centered or justified body copy | `#text-alignment` |
| underline on non-link text | `#underlines` |
| raw URLs rendered as visible copy | `#urls` |

### `/style-and-usage/numbers/`

| Pattern | Anchor |
|---|---|
| `No.`, `#` before a numeral | `#abbreviating-the-word-number` |
| bold applied to a numeral | `#bold-numbers` |
| `$`, currency amounts | `#currency` |
| date literals, `\d{1,2}/\d{1,2}`, month names | `#dates` |
| decimals, rounded quantities | `#decimals` |
| footnote markers and their text | `#footnotes` |
| SSN, case-number, ID shapes; masked or partially revealed values | `#id-numbers-and-sensitive-data` |
| thousands separators, `\d{4,}` | `#numbers-with-commas` |
| phone-number shapes | `#phone-numbers` |
| clock times, `am`/`pm`, durations | `#time` |
| hours, units, quantities | `#units-of-measure` |

### `/style-and-usage/our-principles/`

| Pattern | Anchor |
|---|---|
| sentence > ~25 words, stacked subordinate clauses, hedging | `#be-clear-and-precise` |
| sentence-final preposition flagged as an error | `#end-sentences-with-prepositions` |
| "the user", third-person references to the reader, institutional role nouns | `#speak-to-customers-as-you` |
| US-only idiom, region-bound examples, untranslatable wordplay | `#think-globally` |
| `was`/`were`/`been` + past participle | `#use-active-voice` |
| absent contractions, stiff register | `#use-everyday-contraction` |
| future perfect, conditional pileups | `#use-simple-verb-tenses` |

### `/foundations/writing-small/`

| Pattern | Anchor |
|---|---|
| one paragraph carrying several ideas | `#break-it-up` |
| long body copy, multi-sentence explanations | `#keep-it-short` |
| everything shown at once, no hierarchy | `#prioritize-what-customers-need` |
| wind-up phrases before the point | `#take-a-little-off-the-top` |
| show-more, accordion, staged disclosure | `#use-progressive-disclosure` |

### `/product-and-ui/notifications/`

| Pattern | Anchor |
|---|---|
| notification call sites (`title:` / `body:` pairs), any channel | `#general-writing-tips` |
| in-product / inbox notifications | `#in-product-notifications-best-practices` |
| push notifications | `#push-notifications-best-practices` |
| tone of a notification, urgency framing | `#voice-and-tone` |

### `/accessibility-and-inclusion/inclusive-content/`

| Pattern | Anchor |
|---|---|
| homogeneous names and examples | `#include-diversity-in-your-content` |
| copy that assumes circumstances or blames the reader | `#lead-with-curiosity-and-empathy` |
| asking for personal details | `#only-ask-for-info-we-really-need` |
| assumed-default framing ("normal", "standard", "regular") | `#question-what-you-think-is-normal` |
| gendered pronouns, assumed family or household shape | `#use-gender-neutral-language` |
| dated or othering terms for people | `#watch-out-for-outdated-terms` |

### `/talking-to-customers/help/`

| Pattern | Anchor |
|---|---|
| what help copy should accomplish | `#goals-for-help` |
| inline help, hint text under a field | `#in-line-help-content` |
| standalone help or FAQ articles | `#help-articles` |
| structure of a help page | `#formatting` |
| register shifts within help copy | `#voice-flexes` |

### `/product-and-ui/mobile/`
Only when the diff touches mobile-specific or narrow-viewport copy.

| Pattern | Anchor |
|---|---|
| copy that must survive a small viewport | `#how-mobile-is-different` |
| a checklist pass over mobile strings | `#mobile-content-checklist` |
| tone on a mobile surface | `#voice-and-tone-on-mobile` |

---

## Targeted term lookup

Single term only, last resort, `≤ 5` per review:

`/word-list/<first-letter>/<hyphenated-term>/`

If that 404s, fetch `/word-list/` once, read the anchor list, and stop.
