# Phase 1 Validation Report (T040)

> **Correction note, 2026-08-28.** This report records a validation run as it stood on its own
> date, so its body is left unedited. Two things in it are now stale: the repository moved to the
> `KokerSol` organisation, so the live site is <https://kokersol.github.io/nfc-hubs/demo/> and the
> `diegojs97.github.io` addresses below no longer resolve; and the run itself has not been repeated
> since. Treat the pass/fail counts as valid **as of 2026-08-08**, not as a current statement.

**Date:** 2026-08-08
**Suite:** 80 automated checks defined — **75 pass, 5 deliberately skipped**, 0 failing
**Build:** `_site/demo/index.html`
**Live:** <https://diegojs97.github.io/nfc-hubs/demo/>
**Outstanding placeholders:** 3, all in `demo` and all deliberate

This is the `quickstart.md` validation run. It records the state of every success criterion
SC-001…SC-010, including the ones that **cannot pass yet** and why.

> **What this validates against.** This report was rewritten after the archetype pivot
> (`docs/pivot-summary.md`). The previous version validated against the old FR-016 and FR-018,
> which mandated two named entry sequences; commit `4cd2737` replaced them with a catalog of types
> and "each instance chooses". A report still citing the old requirements is not validating the
> product, it is validating a contract that no longer exists.

> **T040 is still not complete.** Seven of ten criteria pass outright — SC-003 and SC-006 both
> closed after the previous revision, the first by the deployment and the second by the T039 device
> checks. The other three cannot be closed from this machine: they depend on hardware still to be
> tested or on a second configured instance. They are listed as PARTIAL with the specific
> dependency, rather than being marked green on partial evidence.

## Summary

| Criterion | Status | Blocked on |
|-----------|--------|------------|
| SC-001 entry order | ✅ PASS | — |
| SC-002 pending behaviour | ✅ PASS | — |
| SC-003 static over HTTPS | ✅ PASS | — *(closed by the deployment)* |
| SC-004 data-only replacement | ✅ PASS | — |
| SC-005 own visual identity | ⚠️ PARTIAL | a real client's theme + a second instance |
| SC-006 vCard in both states | ✅ PASS | — *(mechanism verified; see the scope note)* |
| SC-007 no WiFi/counters/app links | ✅ PASS | — |
| SC-008 payload and timing | ⚠️ PARTIAL | iOS timing unmeasurable (see below) |
| SC-009 identical render with `?m=` | ✅ PASS | — |
| SC-010 WCAG 2.2 AA | ⚠️ PARTIAL | low-light perception (T039) |

## Detail

### ✅ SC-001 — The hub shows every entry in the order its data defines

`tests/e2e/demo.spec.ts` checks the rendered label sequence against the list `business.json`
declares, on both emulated devices, and separately verifies that the array's id order is the order
that reaches the page — nothing sorts or filters.

**What changed since the previous report.** This used to be asserted against a spec-mandated
sequence (7 entries on `copas`, 8 on `tapas`), enforced at build time by `validate.js`. The
sequence is now business data (FR-018), so the test asserts what a customer of *this* venue sees
and deliberately does **not** assert a sequence any other business must copy. `validate.js`'s order
check is still live and still tested, but against `tests/fixtures/`, not against a real business.

### ✅ SC-002 — Every unconfirmed entry shows the notice and never navigates

`tests/e2e/demo.spec.ts` taps every `[data-pending]` control, checks that the URL does not change
and that the notice becomes visible. The count is asserted explicitly (2 entries: [ES] "Cómo
llegar" and [ES] "Reseña Google"), so the check cannot pass against an empty set.

It also asserts that the string `PLACEHOLDER` appears nowhere in the rendered text, and that no
`href` on the page resolves to a Google Maps or review destination while `placeId` remains
unconfirmed. That second test is the direct guard against the failure Constitution VII is about: a
demo pointing at somebody else's business.

### ✅ SC-003 — Deployable as static content over HTTPS with no server component

**Closed. This was the only ⛔ in the previous report.**

The site is live at <https://diegojs97.github.io/nfc-hubs/demo/>, with HTTPS enforced, deployed by
`.github/workflows/deploy.yml` from `master`. There is no application process: GitHub Pages serves
files.

What the suite verifies: `npm run build` emits plain files, and the tests run against those files
served by a static server with no application process.

What the deployment verified and the local suite could not: that the build passes in full on a
clean Ubuntu and not only on the development machine, and that the **base path** matches the real
repository name. That second point deserves its own paragraph.

#### The base path, and why it needed a separate check

A GitHub *project page* is served from `https://<user>.github.io/<repo>/`. The layout's asset
references were absolute, so the deployed hubs would have loaded their HTML and then 404'd on
`base.css`, `theme.css`, and `pending.js` — unstyled, with no pending behaviour, and **invisible in
any local run served from the root**.

`tests/validation/path-prefix.spec.ts` asserts both halves: that every first-party reference
carries the prefix (catches a dropped `| url`), and that each one maps to a file present in
`_site/` (catches a prefix that is set but wrong).

What that test **cannot** know is whether the prefix matches the real repository name: locally it
is true by definition, because the builder and the test server read the same constant. That is
checked by a workflow step against `github.event.repository.name`, and it is the one check only CI
can make.

### ✅ SC-004 — Replacing placeholder data touches no structure or layout file

`tests/rebuild/data-swap.spec.ts` substitutes one confirmed value, rebuilds, and checks that the
entry becomes a real link with its notice gone — then restores the sentinel and checks that the
pending state returns exactly. No template, stylesheet, or engine file is touched in either
direction.

`tests/rebuild/phase2-seam.spec.ts` additionally proves that no destination is hardcoded, by trace
rather than by inspection: every `url` in the built output must trace back to `business.json`.

> **Note on T038.** `resolve.js` now holds **two** external URL templates, not one: the Google
> writereview base and the Google Maps place base. Both exist because the schema forbids a `url`
> key on `review` and `maps` entries; the business-identifying part (`placeId`) is still data. The
> test's exception list is explicit and has exactly two members. Adding a third must remain a
> deliberate act visible in review.

> **Note on isolation.** These two tests live in `tests/rebuild/` and run last, with
> `--workers=1`. They rewrite `business.json` and rebuild `_site/` while the rest of the suite
> reads both; in parallel they race. The race predates the archetype pivot, but the mutated field
> was never asserted, so it was invisible. It passed twice before failing, which is worse than
> failing outright.

### ⚠️ SC-005 — A hub reads as that venue's own page rather than a default-generated result

**Partial, and this criterion genuinely weakened with the archetype pivot.**

The criterion had two halves. The second — that a user comparing two hubs identifies them as
distinct businesses rather than the same template recoloured — is **not testable today**: there is
only one configured instance, so there is nothing to compare. The specification now says so
explicitly, rather than leaving the criterion looking intact.

For the first half — that the hub does not look default-generated — there is automated evidence
that it loads its own theme and its own visual register, but *whether a person perceives it that
way* is not something any test can settle.

**That half is no longer in T039 either.** It was removed when the checks were reordered by
priority: the demo's theme is one example instance of the theming system (`base.css` provides
structure and the accessibility floor; `theme.css` only colour and typography), so judging "own
identity" on a fictional venue's palette says nothing useful about the product. The whole criterion
is deferred until a real client's theme exists — which is also the moment its comparative half
becomes meaningful again.

### ✅ SC-006 — The vCard is produced only when all four values are confirmed

**Passes. The last outstanding half — real-device import — was closed on 2026-08-08.**

Verified automatically: the generator as shipped in `src/_engine/vcard.js` produces a vCard 3.0
with all four values, with CRLF line endings and RFC 2426 escaping of `,` `;` `\`, with no network
request, on both emulated engines. The **loading seam** is verified too: a hub downloads
`/_engine/vcard.js` if and only if its data declares a `vcard` entry, derived from each business's
data rather than from a particular business name. With any value still a placeholder, tapping
produces the notice and **no download** — asserted by waiting for a download event that must not
fire.

Verified on real hardware (T039, checks 1 and 2): **iOS Safari opens the contact importer** with a
browser-generated vCard, and Android Chrome imports it. Both platforms show all four values with
the address intact as a single field, so the RFC 2426 escaping holds outside the automated test as
well. This closes research.md **D5**, the project's one architecture-level assumption, and means
**FR-020 stands as written** — the static-`.vcf` fallback, which would have contradicted it and
required a spec amendment, is not needed.

> **Scope of this PASS.** What is verified is the **mechanism**, not the live page as it ships.
> No business in the repository declares a `vcard` entry, so the confirmed branch of
> `entry-vcard.njk` has no business rendering it in production. Both the automated coverage and
> the device checks reach it the same documented way: `tests/e2e/vcard-module.spec.ts` loads the
> shipped module onto the demo page with an injected trigger, and T039 uses the temporary swap in
> [`t039-device-checks.md`](./t039-device-checks.md) — confirm the phone, add the entry, revert
> before committing.
>
> So this criterion is **verified for the mechanism, not demonstrated on the live production page
> as-is**. The first real client that declares a `vcard` entry demonstrates it end to end without
> any swap, and the device checks are worth repeating then against that client's own values —
> what was proven here is the machinery, not any particular contact card.

### ✅ SC-007 — No WiFi connection mechanism, visit counters, or app links

WiFi renders as a `<div>` with no `<a>`, no `<button>`, no `role`, and no `tabindex`.
`localStorage`, `sessionStorage`, and `document.cookie` are asserted empty after load. Every
request is asserted first-party, so no beacon or counter can be reaching anything.

### ⚠️ SC-008 — ≤100 KB payload; essential content ≤1.5 s on 4G and ≤3 s degraded

**Partial — comfortably met on Chromium; unmeasurable on WebKit.**

| | payload | typical 4G | degraded |
|---|---|---|---|
| demo | 10,389 B (10.1 KB) | 286 ms | 577 ms |
| budget | 100 KB | 1500 ms | 3000 ms |

Payload breakdown: `/demo/` 2509 B, `base.css` 4507 B, `theme.css` 2057 B, `pending.js` 1316 B.
`vcard.js` is not downloaded, because the demo does not declare that entry — the loading seam is
directly visible in the measurement.

Payload and first-party assertions run on both engines. **Timing runs on Chromium only**: network
throttling requires CDP, which WebKit does not expose. iOS load timing on a venue's degraded
connection therefore remains unverified — a real coverage gap, folded into T039.

### ✅ SC-009 — Identical render with `?m=`, without it, empty, and with an unknown value

`tests/e2e/table-param.spec.ts` compares `<main>`'s `innerHTML` across all four variants and
asserts byte equality, plus that an improbable token passed as `?m=` never appears in the rendered
text and that nothing is persisted client-side.

### ⚠️ SC-010 — WCAG 2.2 AA with zero contrast or target-size failures

**Partial — automated checks clean; the perceptual check outstanding.**

Verified: axe reports zero violations across `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and
`wcag22aa` on the hub in its nocturnal register. `color-contrast` and `target-size` are
additionally asserted to have actually been *evaluated*, since an unknown rule id would yield zero
violations and pass having checked nothing. The pending state is also asserted to survive without
colour.

Not verified: axe evaluates **declared** colours. It cannot say whether the nocturnal register is
comfortable to read on a real phone in a dark room, which is exactly the scenario FR-015 pushes
toward (research.md D8). T039.

## What must happen to close T040

1. **Finish T039** on real hardware — see [`t039-device-checks.md`](./t039-device-checks.md). All
   four checks now have recorded results and the three that could have found a problem passed:
   checks 1 and 2 (iOS and Android vCard import) closed SC-006, and check 4 closed on both
   ecosystems — iPhone reads with the lock screen lit, per Apple's documented Background Tag
   Reading behaviour; Android requires unlocking. Different thresholds, neither a defect, both
   satisfying FR-010. Still open: **check 3** (nocturnal contrast), which closes the outstanding
   half of SC-010 and is deferred on purpose until a real client's theme exists. T039 stays
   unticked in `tasks.md` until it is done.
2. **Get a real client's theme and configure a second instance.** That is what gives SC-005 both
   halves back, and what makes T039's check 3 evaluate a palette somebody will actually use. Until
   then SC-005 is declared untestable, not passed.
3. **Get a real venue** and its data. Not a criterion in itself, but until then all that exists is
   a fictional demo, and the three remaining sentinel values will — correctly — stay unconfirmed.

Only after that does a full `quickstart.md` pass mean what it claims.

## How to reproduce these numbers

```bash
npm run build && npm test        # 75 pass, 5 skipped
npm run audit:placeholders       # 3 outstanding: placeId, contact.phone, the interim maps url
```

The weight and timing figures are printed to the console by `npm run test:budget` on every run;
those in this report come from the 2026-08-08 run against the clean tree.
