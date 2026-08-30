# Pivot summary — from two named archetypes to one generic one

> **Correction note, 2026-08-28 — the URLs and repository paths below are historical.**
> The repository has since moved to the `KokerSol` organisation, and the live site is now
> <https://kokersol.github.io/nfc-hubs/demo/>. Every `diegojs97.github.io` URL and every
> `repos/DiegoJS97/nfc-hubs` path in this document is **left as written on purpose**: the `gh api`
> calls in "Deployment" are a record of commands that were actually executed against that account
> at that time, and rewriting them would turn a true record into a false one. `PATH_PREFIX` is
> unaffected — it is tied to the repository *name*, which did not change.
>
> This applies to this document only. `docs/overview.md` and `docs/t039-device-checks.md` are
> living documents and were corrected in place on the same date.

**Date**: 2026-08-07 (documentation pass: 2026-08-08)
**Branch**: `master`
**Commits**: `c59e192`, `bd4aeae`, `a5e5a14`, `573b408`, `d567b22`, `7f1a42f`, `02527a6`, `aba4b2c`,
`5f7ccf6`, `4cd2737`, `14d6157`, `372b09c` — twelve, oldest first
**State**: working tree clean, `npm run build && npm run test` green (75 passed, 5 skipped), pushed
**Live**: <https://diegojs97.github.io/nfc-hubs/demo/> — deployed by Actions from `1991c39`

**All four originally-blocked items are approved, committed, and deployed.** Nothing is blocking.
See "Deployment" and "What remains" at the end for the two repo settings that had to change and
what is still worth doing.

---

## What changed, in one paragraph

`copas` and `tapas` turned out to be structurally near-identical, and mandating each of them by
name in `spec.md` is what made adding a business a *spec* change rather than a folder. They are
gone. In their place is one generic archetype: the engine supports a catalog of entry types, and
a business instance chooses which of them it uses and in what order. `demo` is the first instance
of it — a fictional venue meant to be shown to a prospect. The vCard is no longer a property of a
business category; it is an optional module a hub opts into by declaring a `vcard` entry. The
schema, the spec and the constitution have all been amended to match, so the repo and its
governing documents now agree.

---

## Commit by commit

### `c59e192` — the archetype and two new entry types

- New business at `src/businesses/demo/` (`business.json`, `index.njk`, `theme.css`).
  The slug is deliberately **absent** from `validate.js`'s `ENTRY_ORDER` table. That table's
  existing skip-for-unknown-slug behaviour *is* the flexible path, so no slug table was edited.
- `resolve.js` gained two entry types:
  - **`maps`** — a plain link to the Google Maps place page, derived from the existing `placeId`.
    Deliberately not an "add to favourites" action: no web API does that, so the hub does not
    pretend to. The customer saves the place themselves from the page it opens.
  - **`tel`** — a `tel:` URI built from `contact.phone`, normalised for RFC 3966 (which forbids
    spaces). Formatting stays in the data; only the href is normalised.
- New partials `entry-maps.njk` and `entry-tel.njk`, both structurally identical to
  `entry-link.njk` so they inherit the 44×44 CSS px target floor and focus treatment.
- `hub.njk` dispatch restructured: `wifi` → `vcard` → pending → `maps` / `tel` / `link`. Adding a
  type is now a partial, a branch, and a `resolve.js` case — never a per-business change.

### `bd4aeae` — tests stopped naming businesses

Every cross-cutting suite carried a hardcoded `["copas", "tapas"]`. New `tests/lib/hubs.ts`
enumerates `src/businesses/` the way the build does and **throws** rather than returning an empty
array, because a silent empty list would turn each of those suites into zero assertions reporting
as green.

### `a5e5a14` — `copas/` and `tapas/` removed

Their two e2e specs went with them; the claims survive in `demo.spec.ts`, `data-swap.spec.ts` and
`vcard-module.spec.ts`. `validate.js` **keeps** its `ENTRY_ORDER` rows for both slugs on purpose:
`tests/fixtures/wrong-order.json` and `renamed-entry-id.json` use slug `copas` to prove the order
check and the Phase 2 route-segment warning still fire.

### `573b408` — the demo's `placeId` is the sentinel

The demo briefly carried a real, well-known Google place ID so the review and maps entries would
resolve instead of 404. Wrong trade: "Reseña Google" would have filed a review against a real,
unrelated venue, and "Cómo llegar" would have navigated a prospect to another city. Constitution
VII exists for that failure and a demo is not an exemption.

The maps entry carried the same place ID a *second* time inside its interim `link` URL, so that
went to the sentinel too — reverting only `placeId` would have left the wrong destination live on
the button most likely to be tapped.

Result: four confirmed entries, two pending. That is honest, and it doubles as a working
demonstration of the pending state — a feature a prospect would otherwise take on trust.

### `d567b22` — GitHub Pages base path, and rebuild isolation

**Path prefix.** Every asset reference was absolute, correct only on a root-served host. A GitHub
*project* page is served from `https://<user>.github.io/<repo>/`, so the deployed hubs would have
loaded their HTML and then 404'd on `base.css`, `theme.css` and `pending.js` — unstyled, no
pending behaviour, and invisible in any local root-served run.

- `scripts/lib/path-prefix.mjs` holds `PATH_PREFIX = "/nfc-hubs/"`. One constant, two consumers:
  `eleventy.config.js` feeds it to the `url` filter; `scripts/serve-static.mjs` strips it, so the
  suite requests assets at their real production URLs. A disagreement between those two would let
  the suite pass against paths that do not exist in production.
- `hub.njk`'s four absolute references now go through `| url`. The skip-link `#entries` is left
  alone — an in-page fragment, not an asset.
- `pathPrefix` moves no files. Output is still `_site/<slug>/index.html`; it composes with the
  Pages mount point rather than duplicating it.
- `tests/validation/path-prefix.spec.ts` asserts **both** halves: that every first-party reference
  carries the prefix (catches a dropped `| url`), and that each maps to a file present in `_site/`
  (catches a prefix that is set but wrong).

**Rebuild isolation.** Verifying the above exposed a real race: `data-swap` and `phase2-seam` both
rewrite `business.json` and rebuild `_site/` while every other spec reads both. It surfaced as a
failure whose *expected* value was the sentinel — `demo.spec.ts` had read the data file
mid-mutation from another worker. The race predates this pivot (`data-swap` mutated `tapas` while
`tapas.spec.ts` ran) but the mutated field was never asserted, so it stayed invisible. It passed
twice before failing, which is worse than a hard failure.

Both mutating specs now live in `tests/rebuild/`, run **last** and with **`--workers=1`**.
`package.json` changed in the same commit deliberately: `playwright.config.ts` sets
`testDir: "tests"` but each script filters by path, so moving the files without wiring up
`test:rebuild` would have left the suite green while two of its strongest guards silently stopped
running.

### `7f1a42f` — corrected the skip rationale

Both rebuild specs justified their chromium-only guard as avoiding a race between browser
projects. `--workers=1` made that untrue. The skips remain correct for the stronger reason: a
rebuild's output and a scan of `src/` are browser-independent.

### `02527a6` — this document

Written when items 1–4 below were still blocked. Superseded by `372b09c` and the three governance
commits; revised in place afterwards rather than left describing a state that no longer exists.

### `aba4b2c` — the demo's phone is the sentinel too

Same reasoning as `placeId`. Spain reserves no fictional number range, so a plausible `+34` number
may belong to a real person, and once the `tel` type ships the failure mode is a customer dialling
a stranger from a demo page. `+34 600 000 000` looked obviously fake to a reader and like a phone
number to a dialler.

### `5f7ccf6` — schema: entry type enum opened

`entries[].type` gained `maps` and `tel`, which unblocked types that had been code-complete since
`c59e192`. The two slug-keyed `allOf` blocks were deleted — they forced `register` per business
name and made `contact` mandatory for one slug and forbidden for another.

They were replaced by a constraint about *data* rather than about names: if any entry derives its
destination from contact values (`tel`, `vcard`), then `contact` is required. `resolve.js`
deliberately degrades a missing contact to a pending entry so the worst runtime case is a notice
rather than `tel:undefined` — but pending is a legitimate state, so without this rule a typo'd
contact block would look like an ordinary unconfirmed value forever.

### `4cd2737` — spec: entry catalog replaces the two fixed sequences

FR-016 now defines the catalog of entry types and how each behaves; FR-018 says a business
instance selects from it in its own data, and that the selection is not spec-locked. FR-017 is
reframed from "the cocktail bar must not include save contact" to the rule the engine already
implemented. FR-019 generalises from the tapas newsletter to any entry that would otherwise need
a proprietary form. FR-015, FR-023, SC-001, SC-006, SC-010 and the key entities lost their "both
hubs" framing.

Two things recorded rather than smoothed over:

- **SC-005 genuinely weakens.** It asked a user to compare two hubs and see distinct venues; with
  one instance there is nothing to compare. It keeps its testable half — a hub must not look
  default-generated — and states explicitly that the rest is untestable until a second instance
  exists.
- **The 2026-07-21 clarification about the tapas vCard is left as written**, with a note that its
  answer now applies to any hub declaring the entry. Clarification sessions are a dated record of
  what was asked and answered; rewriting one to match a later decision destroys the reason to keep
  them.

A new 2026-08-07 clarification session records the pivot itself.

### `14d6157` — constitution 1.0.1 → 1.1.0

Principle III now states what future-phase measurement may and may not be: anonymous, aggregate,
single-site audience measurement, no client-side identifiers, no cross-site tracking, consistent
with the AEPD's audience-measurement cookie exemption; never personal data, never sharing or
combining one client's data with another's. Scope & Exclusions gained the matching permanent entry,
because the exclusion must survive independently of the phase that motivated it. The opening
description was generalised in the same pass, so the constitution stops contradicting the spec it
governs.

MINOR per the document's own versioning policy. The Principle III amendment was reviewed manually
before merging, per the governance requirement; formal OpenSpec pipeline adoption remains pending
the first real-client contextualization.

### `372b09c` — GitHub Pages deploy workflow

Builds with Eleventy, runs the suite as the release gate, uploads `_site/` via
`actions/upload-pages-artifact`, deploys with `actions/deploy-pages`.

Its one non-obvious step is a guard for a failure the local suite structurally cannot catch:
locally `PATH_PREFIX` is true by definition, because the builder and the test server read the same
constant. Only CI knows the repository's real name. The step compares the two and fails loudly, so
renaming the repo cannot silently ship an unstyled site.

`configure-pages` is used deliberately **without** `static_site_generator: eleventy` — that option
injects its own prefix via `ELEVENTY_PATH_PREFIX` and would compete with `eleventy.config.js`.

Verified before committing: the file parses (`js-yaml`, already present as a transitive
dependency), and the embedded `node -e` script was extracted *from the parsed YAML* and executed —
passing for the real repo name, failing usefully for a wrong one, failing for a reformatted
declaration. Parsing alone would not have shown that the block scalar preserved the shell quoting.

---

## Test topology after the pivot

| Suite | Contents | Notes |
|---|---|---|
| `test:validation` | business-data, resolve-types, path-prefix, source-hygiene | Node-level; 32 passed |
| `test:e2e` | demo, table-param, vcard-module | 26 passed |
| `test:a11y` | wcag | 6 passed |
| `test:budget` | payload, timing | 8 passed, 2 skipped (WebKit has no CDP throttling) |
| `test:rebuild` | data-swap, phase2-seam | 3 passed, 3 skipped (build-level, browser-independent) |

Instance counts are conserved across the move: 64 before, 64 after. Nothing silently stopped
running.

---

## The four gated items — all approved and committed

Each of these required a permission prompt. None was forced through; each was proposed as a diff,
reviewed, and then applied.

| # | Item | Commit | State |
|---|---|---|---|
| 1 | `.github/workflows/deploy.yml` | `372b09c` | Committed. Rejected on first proposal, re-proposed once `PATH_PREFIX` existed |
| 2 | `contracts/business-data.schema.json` | `5f7ccf6` | Committed. `maps` and `tel` are now bindable from data |
| 3 | `specs/001-nfc-hubs-fase1/spec.md` | `4cd2737` | Committed. Repo and spec agree again |
| 4 | `.specify/memory/constitution.md` | `14d6157` | Committed at version 1.1.0 |

**The repo no longer contradicts its own spec.** FR-016 and FR-018 described two hubs that had
been deleted in `a5e5a14`; that gap closed with `4cd2737`.

**`maps` and `tel` are reachable from data, but the demo has not been repopulated.** That is a
deliberate data decision, not an oversight: `placeId`, `contact.phone`, and the maps entry's
interim `url` are all still the sentinel, for the reasons in "Honest limits" below. Binding them is
a pure data edit, verified end to end against a temporary build:

```
<a class="entry entry--link entry--maps" href="https://www.google.com/maps/place/?q=place_id:…"
<a class="entry entry--link entry--tel"  href="tel:+34600000000"
```

That confirmed four things: the schema accepts both types; `maps` derives from `placeId` with no
`url` key, so it cannot drift from the review entry; `tel` strips the spaces RFC 3966 forbids while
the label keeps the owner's formatting; and both inherit `entry--link`, so they get the 44×44 px
target floor without a new CSS rule. The temporary data was reverted and never committed.

---

## Honest limits and open risks

- **The fictional name is unverified.** "Taberna Vela y Sal" was invented and is not intended to
  resemble any real venue, but that has not been checked against a registry or a search. Worth
  five minutes before showing it to anyone.
- **`contact.phone` is the sentinel**, for the same reason as `placeId`. Spain has no reserved
  fictional number range, so any plausible-looking `+34` number may belong to someone, and the
  failure mode once the `tel` type ships is a customer dialling a stranger. It stays unconfirmed
  until a real number exists; the entry will render as pending in the meantime, which is correct.
- **No business declares a `vcard` entry**, so the confirmed branch of `entry-vcard.njk` has
  nothing to render it. `vcard-module.spec.ts` covers the shipped generator by loading it onto the
  demo page with an injected trigger, and states this limit in the file. It says nothing about
  whether iOS Safari opens the contact importer — only T039 on real hardware settles that.
- **T039 still cannot be done by Claude.** Real hardware: iOS Safari vCard import, Android Chrome
  vCard, nocturnal contrast in a dark room, and a real NFC tap locked and unlocked.
- **The Pages URL becomes the NFC tag URL.** `contracts/hub-url.md` requires the host be final
  before any tag is written; re-tagging is manual work in both venues. `PATH_PREFIX` is tied to the
  repository name, and a custom domain or a user/org Pages repo would change it to `/`.
- **`resolve.js` now holds two external URL templates**, not one. `T038`'s documented exception
  was singular; the seam guard's allowlist is now an explicit two-entry list. Adding a third should
  remain a deliberate act visible in review.

---

## Stale docs — rewritten 2026-08-08

All five are done. None of them was merely dated: each stated a rule that the current repo
contradicts, which is worse than being out of date, because they read as authoritative.

| File | Commit | What was actually wrong |
|---|---|---|
| `CLAUDE.md` | `396fa09` | Mandated the copas/tapas entry sets and told a future session to refuse a business with no FR defining its entries — the exact behaviour the pivot removed. Also cited a deleted test file, named Cloudflare as the host, and claimed `audit-placeholders.mjs` was unwritten |
| `README.md` | `081cfeb` | "Never add, remove, or reorder entries" — the inverse of FR-018. A maintainer following it would have refused a change the build accepts. Deployment section said nothing was deployed |
| `docs/overview.md` | `96a7036` | Two-vertical narrative, plus a design principle that a venue owner cannot reorder entries. The save-contact section was rewritten rather than deleted: same argument, decision moved from spec to configuration |
| `docs/validation-report.md` | `30f390f` | Validated SC-001 against the OLD FR-016/FR-018. Re-run today: SC-003 closes (deployed), SC-005 and SC-006 are recorded as genuinely weaker |
| `docs/t039-device-checks.md` | `64d3fe4` | Written around the tapas vCard. `demo` declares no `vcard` entry at all, so the temporary swap needed a second part; and checks 1–2 cannot use the live URL, because invented data must not be pushed |

Two things the rewrite pass established rather than merely recorded:

- **The temporary-vcard swap was executed and reverted**, not just written down: it builds to 7
  entries with the entry confirmed, ships `_engine/vcard.js`, and `git checkout` restores the
  three placeholders and a clean tree.
- **Document language is now a written convention** (`CLAUDE.md` → Conventions). Every tracked doc
  is English-primary and permanently maintained that way; `docs/t039-device-checks.md` is the one
  exception and stays Spanish, because it is a checklist followed with hardware in hand rather than
  reference reading. Spanish reading copies of anything else are generated ad hoc outside the repo
  — twin `*.es.md` files are prohibited, since two tracked copies drift and the stale one still
  reads as authoritative. `[ES]` customer-facing strings are never translated in any of them.

---

## How to verify the current state

```bash
npm run build && npm run test    # 75 passed, 5 skipped
npm run audit:placeholders       # 3 remaining: placeId, contact.phone, the maps entry's interim url
```

The built demo hub is `_site/demo/index.html`; every first-party reference in it begins with
`/nfc-hubs/`.

---

## Deployment — done, and how it was actually enabled

**Live at <https://diegojs97.github.io/nfc-hubs/demo/>.** Pushed, built by Actions, and deployed
from commit `1991c39`; HTTPS enforced.

Two settings had to change before a deploy could succeed, and **neither is discoverable from a
failing build log alone**. Both were done through `gh`, not the web UI:

```bash
# 1. Enable Pages with Actions as the build source.
#    Without this, actions/configure-pages fails with a bare "Get Pages site failed ... Not Found",
#    which reads like a permissions problem and is not one.
gh api -X POST repos/DiegoJS97/nfc-hubs/pages -f build_type=workflow

# 2. Allow master to deploy to the github-pages environment.
#    Enabling Pages CREATES that environment with a custom deployment branch policy containing
#    only the repo's DEFAULT branch. This repo's default is `main`, so the policy permitted `main`
#    and nothing else - and every deploy from `master` would have been rejected after a fully
#    successful build.
gh api -X POST repos/DiegoJS97/nfc-hubs/environments/github-pages/deployment-branch-policies \
  -f name=master -f type=branch
```

The first deploy attempt failed at `configure-pages` because step 1 had not been done yet.
Everything upstream of it passed on that same run — `npm ci`, the base-path guard, the full suite,
and the build — so the workflow itself was validated before Pages even existed.

The run after both settings landed went green end to end: `build` 2m3s, `deploy` 1m8s. The suite
therefore passes on a clean Ubuntu checkout, not only on a Windows dev box, and the base-path guard
confirmed `PATH_PREFIX` against the real repository name — the one check that only CI can make.

Note for anyone reading the Pages API later: `status: null` on the site object and a **404** from
`pages/builds/latest` are expected under `build_type: workflow`. Those fields describe the legacy
Jekyll pipeline, which is not running. The `deployments` entry is the authoritative signal.

---

## What remains

Nothing blocking. Nothing in the repository.

### The `main` stub — worth fixing deliberately

| | |
|---|---|
| Default branch | `main` |
| Tip of `main` | `"Initial commit"` |
| Tip of `master` | all of this work, plus the project's prior history |

The real trunk is `master`, but GitHub's default is `main`, so clones, new PRs, and the Pages
branch policy all point at an empty branch. That is what made the branch-policy problem above
happen in the first place. Making `master` the default and deleting `main` would remove a trap
rather than tidy one.

### Action pins

`actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, and
`actions/upload-artifact@v4` all emit Node 20 deprecation warnings and are being forced onto Node
24. Warnings only today; the pins want bumping.

### Ordinary follow-up

- ~~The five stale docs above.~~ Done 2026-08-08 — see the table above.
- Verify "Taberna Vela y Sal" is not a real venue.
- T039 device checks on real hardware.
- Decide whether to populate `placeId`, `contact.phone`, and the `maps`/`tel` entries — a data
  edit, already proven to work.
- Confirm by eye that the live hub renders **styled**. Unstyled would mean `PATH_PREFIX` does not
  match the deployed base path, though `372b09c`'s guard should fail the build before that ships.
