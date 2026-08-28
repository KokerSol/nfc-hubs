# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NFC hub pages for hospitality venues. Each table has a physical NFC tag encoding
`https://<host>/<slug>/?m=<table>`; tapping it opens a short list of links. Phase 1 is pure
static output — no backend, no analytics, no client framework.

There is **one generic archetype**, not a per-business one. The engine supports a catalog of
entry types; each business instance chooses which types it uses and in what order, in its own
data. `demo` ([ES] "Taberna Vela y Sal") is the only instance today — a fictional venue built to
be shown to a prospect, deployed at <https://kokersol.github.io/nfc-hubs/demo/>.

Requirements live in `specs/001-nfc-hubs-fase1/` (spec.md FR-001–FR-024 / SC-001–SC-010,
plan.md, tasks.md T001–T040) and `.specify/memory/constitution.md` (v1.1.0). When behaviour is
in question, those files are the authority — not this one. `docs/pivot-summary.md` records why
the two named archetypes (`copas`, `tapas`) were removed, commit by commit.

## Commands

```bash
npm run build            # -> _site/
npm run dev              # Eleventy dev server, live reload, :8080
npm run serve            # plain static server over _site/ — what the tests use
npm test                 # validation + e2e + a11y + budget + rebuild
npm run audit:placeholders           # lists every unconfirmed value
npm run audit:placeholders -- --strict   # exits non-zero if any remain

npx playwright test tests/e2e/demo.spec.ts         # one file
npx playwright test --project=pixel-chromium       # one device
npx playwright test -g "SC-001"                    # one test by name
```

Playwright's `webServer` runs `npm run build && npm run serve`, **not** `npm run dev`, on
purpose: the dev server injects a live-reload client and opens a WebSocket, which would
corrupt the payload and third-party-request assertions in `tests/budget/`.

There are exactly two test projects, both mobile-emulated (`iphone-webkit`,
`pixel-chromium`). Do not add a desktop viewport — traffic is 100% phones after a tap
(FR-009), so a passing desktop run would be evidence about a case the product does not target.

### Suites, and why `tests/rebuild/` is separate

| Script | Directory | Contents |
|---|---|---|
| `test:validation` | `tests/validation/` | business-data, resolve-types, path-prefix, source-hygiene |
| `test:e2e` | `tests/e2e/` | demo, table-param, vcard-module |
| `test:a11y` | `tests/a11y/` | wcag |
| `test:budget` | `tests/budget/` | payload, timing |
| `test:rebuild` | `tests/rebuild/` | data-swap, phase2-seam — **runs last, `--workers=1`** |

`data-swap` and `phase2-seam` rewrite `business.json` and rebuild `_site/` while every other
spec reads both. Run in parallel, they race, and the symptom is a failure whose *expected*
value is the sentinel. `playwright.config.ts` sets `testDir: "tests"`, so each script filters
by path: moving a spec into `tests/rebuild/` without wiring up `test:rebuild` would leave the
suite green while two of its strongest guards silently stopped running.

Full run today: **75 passed, 5 skipped, 0 failing.** The skips are structural — WebKit exposes
no CDP throttling, and the rebuild specs are browser-independent.

## Architecture

One shared engine, one content folder per business. Nothing in the engine names a business.

```
src/_data/businesses.js         scans src/businesses/*/business.json, validates, keys by slug
src/_data/validate.js           ajv schema check (+ a legacy entry-order table, see below)
src/_data/resolve.js            THE definition of confirmed vs pending, and every URL template
src/_includes/layouts/hub.njk   dispatches on entry.type -> partials/entry-*.njk
src/_includes/partials/         entry-link, entry-maps, entry-tel, entry-wifi, entry-vcard, entry-pending
src/_engine/                    base.css, pending.js, vcard.js (passthrough-copied)
src/businesses/<slug>/          business.json + theme.css + index.njk (binding only)
scripts/lib/path-prefix.mjs     PATH_PREFIX — one constant, two consumers
```

`index.njk` files contain front matter and nothing else. Every label, URL, and contact value
reaches the page through the data cascade, which is what makes confirming real data a data
edit and never a code edit (FR-014, SC-004).

`resolve.js` is the single source of truth for entry state. Do not re-implement the
confirmed/pending rule anywhere else — two copies can disagree, and the failure mode is a
customer sent to a dead link or a bad contact saved to their phone.

`vcard.js` loads only on a hub whose data contains a `vcard` entry (`resolve.hasVcard()`),
so the demo hub — which declares none — ships none of that code.

## The entry catalog: types are fixed, selection is not

`business-data.schema.json` enumerates six entry types, and `hub.njk` dispatches on
`entry.type` alone:

| type | Destination | Confirmed when |
|---|---|---|
| `link` | that entry's own `url` | `url` is not the sentinel |
| `review` | Google writereview, from `placeId` | `placeId` is not the sentinel |
| `maps` | Google Maps place page, from the same `placeId` | `placeId` is not the sentinel |
| `tel` | `tel:` URI from `contact.phone` | `contact.phone` is not the sentinel |
| `wifi` | none — inert text | `wifiSsid` is not the sentinel |
| `vcard` | local browser action | all four of name/phone/address/website confirmed |

**Adding a type to the catalog is a spec change** (FR-016) — a new partial, a branch in
`hub.njk`, a case in `resolve.js`, and an enum value in the schema. **Choosing which types a
business uses, and in what order, is a data edit** (FR-018) and needs no spec change at all.
Array order in `entries` *is* the customer-facing priority order.

`maps` is deliberately a plain link to the place page. No web API adds a place to someone's
Google saved list, so the hub must not imply it does.

Entry ids are the **Phase 2 `/r/<entry-id>` route segments** (`contracts/hub-url.md`).
Renaming one is free today and breaks analytics continuity once tags are in the field.

**A new business is a folder, not a spec change.** Add `src/businesses/<slug>/` with a
`business.json`, a `theme.css`, and an `index.njk` that binds the layout. No FR mandates any
particular entry list. What you must not do is invent *values*: an unconfirmed URL, phone, or
place ID is the sentinel, never a plausible-looking stand-in.

### The legacy `ENTRY_ORDER` table

`validate.js` still holds mandated-order rows for `copas` and `tapas`, two slugs that no longer
exist in `src/businesses/`. They are kept on purpose: `tests/fixtures/wrong-order.json` and
`renamed-entry-id.json` use slug `copas` to prove the order check and the Phase 2 route-segment
warning still fire. A slug absent from the table gets no order check, which is why `demo` — and
any future business — is free to choose its own sequence. Do not delete those rows without
replacing the fixtures, and do not add a row for a real business unless the spec mandates its
sequence.

## The placeholder sentinel

Any unconfirmed value is the exact literal string:

```
[PLACEHOLDER - replace]
```

**Including `name`.** This is not cosmetic. `resolveEntry()` treats "not the sentinel" as
confirmed, so a friendly stand-in like `"Taberna (nombre pendiente)"` reads as *real data* — and
on a hub that declares a `vcard` entry, once the other three contact fields are filled in, that
fake name is written into a customer's address book. Never invent a value to make a page look
finished.

A missing key, an empty string, or `null` is a **data error**, not a placeholder. The build
fails on those by design (`validate.js`), so a typo can never silently mark an entry confirmed.

The demo's `placeId` and `contact.phone` are the sentinel **deliberately**, and so is the
interim `url` on its maps entry. A real place ID would file reviews against an unrelated venue
and navigate a prospect to another city; Spain reserves no fictional phone range, so a plausible
`+34` number may belong to a real person. Three pending entries on a demo is honest, and it
doubles as a live demonstration of the pending state. Do not "finish" them.

## Governance: spec artifacts are gated

Do not edit `spec.md`, `plan.md`, `tasks.md`, or `constitution.md` without explicit
confirmation from the user. If an inconsistency turns up between them, report it and propose
a concrete edit — these documents are the contract every automated check validates against,
so a silent edit invalidates the checks rather than fixing the problem.

Constitution v1.1.0 bounds what future-phase measurement may be: anonymous, aggregate,
single-site audience measurement, no client-side identifiers, no cross-site tracking. Personal
data and cross-client data sharing are permanently out of scope, in every phase.

## Conventions

- **Document language.** Every tracked document is **English**, with exactly one permanent
  exception: `docs/t039-device-checks.md` stays in **Spanish**. It is an operational checklist
  followed step by step with hardware in hand, not reference reading, so its language is part of
  how it is used. Everything else — `CLAUDE.md`, `.specify/memory/constitution.md`, `README.md`,
  the rest of `docs/` — is English-primary and permanently maintained that way.
- **No twin translation files.** Do not create `*.es.md` twins, and do not maintain a second
  language copy of any tracked doc. When Diego wants a Spanish reading copy, it is generated ad
  hoc in chat, outside the repo. Two tracked copies drift, and the stale one still reads as
  authoritative.
- **`[ES]` strings are exempt from all of the above.** Customer-facing values — entry labels,
  business names, the pending notice — are Spanish because the customer is Spanish. Quote them
  verbatim and **never translate them**, in any document or test, whatever language surrounds
  them.

## Release gates

- **T038** — no destination may be hardcoded outside `business.json`. `resolve.js` now holds
  **two** deliberate exceptions, both URL *templates*: the Google writereview base and the
  Google Maps place base. Both exist because the schema forbids a `url` key on `review` and
  `maps` entries; the business-identifying part (`placeId`) is still data. The seam guard in
  `tests/rebuild/phase2-seam.spec.ts` allowlists exactly those two. Adding a third must be a
  deliberate act visible in review.
- **T039 — cannot be completed by Claude.** Requires real hardware: iOS Safari vCard import
  (historically fragile, research.md D5), Android Chrome vCard, nocturnal contrast in a dark
  room, and a real NFC tap with the phone locked and unlocked. Emulated WebKit passing proves
  the Blob and `download` attribute work; it proves nothing about whether iOS opens the
  contact importer. **If iOS Safari fails, the static-`.vcf` fallback contradicts FR-020 and
  requires a spec amendment — not a silent substitution.** Procedure:
  `docs/t039-device-checks.md`.

No business currently declares a `vcard` entry, so the confirmed branch of `entry-vcard.njk`
has nothing to render it. `tests/e2e/vcard-module.spec.ts` covers the shipped generator by
loading it onto the demo page with an injected trigger, and states that limit in the file.

WiFi is display-only. `business.json` has no password field and must never gain one: the real
connection is the tag's own Wi-Fi Simple Config NDEF record (Principle IV). The WiFi entry
renders as a `<div>` with no `<a>`, `<button>`, `role`, or `tabindex`.

## Deployment and the base path

GitHub Actions (`.github/workflows/deploy.yml`) builds with Eleventy, runs the full suite as
the release gate, and publishes `_site/` to GitHub Pages on every push to `master`.

A GitHub **project** page is served from `https://<user>.github.io/<repo>/`, so every absolute
first-party reference needs a prefix. `scripts/lib/path-prefix.mjs` holds
`PATH_PREFIX = "/nfc-hubs/"`. One constant, two consumers:

- `eleventy.config.js` feeds it to the `url` filter — every asset href in `hub.njk` goes
  through `| url` (the skip-link `#entries` is an in-page fragment and correctly does not).
- `scripts/serve-static.mjs` strips it, so the suite requests assets at their real production
  URLs.

If those two ever disagreed, the suite would pass against paths that do not exist in
production. `tests/validation/path-prefix.spec.ts` asserts both halves: that every first-party
reference carries the prefix, and that each one maps to a file present in `_site/`.

`PATH_PREFIX` is tied to the **repository name**. The workflow has a step that compares it
against `github.event.repository.name` and fails loudly — the one check only CI can make,
because locally the prefix is true by definition. A custom domain or a user/org Pages repo
would make the correct value `/`. `configure-pages` is used deliberately **without**
`static_site_generator: eleventy`, which would inject a competing prefix.

The Pages URL becomes the NFC tag URL. `contracts/hub-url.md` requires the host be final
before any tag is written.

## Traps that have already bitten

**UTF-8 BOM.** Files created by Windows editors get a BOM, and `JSON.parse` rejects it with a
useless "Unexpected token" and no filename. `businesses.js` strips it. Write the escape
`/^\uFEFF/` — never paste the literal character, which is invisible in review and gets
silently normalised away by editors and formatters.

**`oneOf` with a placeholder branch.** `business-data.schema.json` originally used
`oneOf: [nonEmpty, placeholder]`. The sentinel is a non-empty string, so it matched *both*
branches and `oneOf` — which requires exactly one — rejected every placeholder. Use `anyOf`
for any `real-value | sentinel` pair.

**Tests that pass against a 404.** Assertions of the form "X is absent" pass trivially on a
missing page. Every spec here opens with a render precondition
(`expect(page.locator(".entries__item")).toHaveCount(N)`) before asserting anything absent.
Keep that pattern; four tests once went green against a blank page.

**Suites that enumerate nothing.** `tests/lib/hubs.ts` scans `src/businesses/` the way the
build does, and **throws** rather than returning an empty array. A silent empty list would turn
every cross-cutting suite into zero assertions reporting as green.

**Rebuilds racing readers.** See `tests/rebuild/` above. This one passed twice before failing,
which is worse than a hard failure.

**Windows path separators.** `new URL(...).pathname` yields `C:/a/b`; `path.join` yields
`C:\a\b`. Comparing the two forms made `scripts/serve-static.mjs` return 403 for every
request. Use `fileURLToPath` + `resolve`.

## Permission model

`.claude/settings.json` allows Read, edits under `src/`, `tests/`, `scripts/`, and the
routine build/test/git commands. It routes to a confirmation prompt: any edit to `specs/**`,
the constitution, or `.claude/**`; `git push`/`reset`/`clean`; all `rm`/`rmdir`/`del`; and
`curl`/`wget`/`WebFetch`/`WebSearch`. The two lists share no patterns, so the gates do not
depend on ask-vs-allow precedence. `defaultMode` is intentionally unset.

Three limits worth knowing rather than trusting:

1. **Network is not sealed.** The prompts cover Claude's own tools; `npm install` and
   `npx playwright*` are allowed and are themselves network egress. Real enforcement needs
   `sandbox.network.strictAllowlist`, which is ignored in project settings.
2. **Deletion scoping is not expressible.** Rules match command prefixes, not resolved paths,
   so "anywhere except `_site/`" cannot be written. All deletions prompt.
3. **Bash prefix matching is evadable** via compound commands and aliases — and
   `npm run build`/`test` execute whatever `package.json` defines.
