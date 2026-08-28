# NFC Hubs — Phase 1

NFC-activated hub pages for hospitality venues. Each table carries a physical tag; tapping it
opens a short list of useful links for that venue. Pure static output, no backend.

There is **one generic archetype**, not one per kind of business. The engine supports a catalog of
entry types, and each business instance chooses which of them it uses and in what order, in its
own data.

| Hub | Local URL | In production | Visual register |
|-----|-----------|---------------|-----------------|
| `demo` — [ES] "Taberna Vela y Sal" | `/demo/` | <https://kokersol.github.io/nfc-hubs/demo/> | nocturnal |

`demo` is a **fictional** venue, built so the product can be shown to a prospect. It is not a real
client and its data is invented on purpose.

Requirements live in [`specs/001-nfc-hubs-fase1/`](specs/001-nfc-hubs-fase1/) and in
[`.specify/memory/constitution.md`](.specify/memory/constitution.md). This file covers how to run
the project and, most importantly, how to replace placeholder data with real values.

## Getting started

Requires **Node 24 LTS** (pinned in `.nvmrc`).

```bash
npm install
npx playwright install chromium webkit   # only needed to run the tests
npm run dev                              # http://localhost:8080/demo/
```

## Replacing placeholder data with real data

**This is the whole maintenance workflow.** Going live with real values means editing one file per
business and nothing else:

```
src/businesses/demo/business.json
```

You never touch a template, a stylesheet, or any code to confirm real data.

### The sentinel

Every value the owner has not yet confirmed holds this exact string:

```
[PLACEHOLDER - replace]
```

Replacing the string with the real value is the entire operation:

```diff
- { "id": "menu", "label": "Carta", "type": "link", "url": "[PLACEHOLDER - replace]" }
+ { "id": "menu", "label": "Carta", "type": "link", "url": "https://ejemplo.es/carta" }
```

Rebuild, and that entry changes from a non-navigating button showing
[ES] *"Pendiente de confirmar"* into a real link. Anything still holding the sentinel keeps showing
the notice, so a customer is never sent to a dead or wrong destination.

**The sentinel must be exact.** A trailing space, or a friendly stand-in like
`"Taberna (nombre pendiente)"`, is read as a *confirmed value* — and would be shown to customers as
real. The build rejects near-misses, but it cannot detect an entirely different invented string.
This applies to `name` too.

### What is still outstanding

```bash
npm run audit:placeholders            # lists every unconfirmed value and where it is
npm run audit:placeholders -- --strict # exits non-zero if any remain (pre-go-live gate)
```

There are **3** right now, all in `demo`, and **all of them are deliberate**:

| Value | Why it is still the sentinel |
|---|---|
| `placeId` | A real place ID would make "Reseña Google" file a review against an unrelated venue, and "Cómo llegar" navigate a prospect to another city |
| `contact.phone` | Spain reserves no fictional number range: any plausible `+34` may belong to a real person |
| `entries[2].url` (the interim link on "Cómo llegar") | It carried the same place ID a second time |

Three pending entries on a demo is honest, and it doubles as a live demonstration of the pending
state — a feature a prospect would otherwise have to take on trust. They are not to be "finished".

### Rules that matter

- **Never rename an `id`.** Entry ids (`menu`, `reserve`, `review`, …) become the Phase 2
  `/r/<id>` analytics route segments. Renaming one is free today and silently breaks tap
  attribution once tags are in the field. See
  [`contracts/hub-url.md`](specs/001-nfc-hubs-fase1/contracts/hub-url.md).
- **Adding, removing, or reordering entries IS allowed.** It is a data change, not a spec change
  (FR-018). Array order *is* the customer-facing priority order. What *is* a spec change is adding
  a new **type** to the catalog (FR-016).
- **Never add a WiFi password.** Only the network *name* is displayed, as inert text. The actual
  connection is handled by the tag's own Wi-Fi Simple Config NDEF record, written when the tag is
  programmed — not by this site.
- **The contact card is all-or-nothing.** [ES] "Guardar contacto" produces a vCard only when
  `name`, `phone`, `address`, and `website` are *all* confirmed. Until then it shows the pending
  notice and generates nothing, rather than saving a half-complete contact to someone's phone.

### The entry-type catalog

A business picks from this list. Adding a new type is a spec change (FR-016).

| Type | Destination | Confirmed when |
|---|---|---|
| `link` | that entry's own `url` | `url` is not the sentinel |
| `review` | Google review (writereview), from `placeId` | `placeId` is not the sentinel |
| `maps` | the business's Google Maps place page, from the same `placeId` | `placeId` is not the sentinel |
| `tel` | `tel:` URI from `contact.phone` | `contact.phone` is not the sentinel |
| `wifi` | none — inert informational text | `wifiSsid` is not the sentinel |
| `vcard` | local browser action | all four contact values are confirmed |

`maps` is deliberately a plain link to the place page. No web API adds a place to anyone's Google
saved list, so the hub must not imply that it does.

The vCard module is **optional**: a hub has it exactly when its data declares a `vcard` entry, and
a hub without one downloads none of that code. `demo` does not declare one.

### What the build refuses to accept

`npm run build` fails, naming the offending field, on:

- a missing required key
- an empty string or `null` (use the sentinel instead)
- a near-miss sentinel, for example with a trailing space
- a `slug` that does not match its folder name
- a `tel` or `vcard` entry in a business with no `contact` block

This is deliberate: a typo that silently marked an entry "confirmed" would send customers to
`undefined`.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Eleventy dev server with live reload |
| `npm run build` | Build to `_site/` |
| `npm run serve` | Serve the built `_site/` (what the tests use) |
| `npm test` | Validation + E2E + accessibility + budget + rebuild |
| `npm run test:validation` | Data-contract rejection cases, entry types, base path |
| `npm run test:e2e` | Entry order, pending behaviour, inert WiFi, vCard, `?m=` |
| `npm run test:a11y` | WCAG 2.2 AA via axe |
| `npm run test:budget` | ≤100 KB payload, no third-party requests, timing |
| `npm run test:rebuild` | The two tests that rewrite `business.json` and rebuild |
| `npm run audit:placeholders` | List unconfirmed values |

Run a single file or test:

```bash
npx playwright test tests/e2e/demo.spec.ts
npx playwright test -g "SC-001"
```

Tests run on two mobile-emulated devices only (iPhone/WebKit, Pixel/Chromium). There is no desktop
viewport: after a tap, traffic is 100% mobile.

**`tests/rebuild/` is separate and runs with `--workers=1` on purpose.** Those two tests rewrite
`business.json` and rebuild `_site/` while the rest of the suite reads both. Run in parallel they
race, and the symptom is a failure whose *expected* value is the sentinel. If you move a test into
that folder, remember that each script filters by path: moving it without wiring it to
`test:rebuild` would leave the suite green while the test stops running.

## The table parameter

Tags encode `https://<host>/<slug>/?m=<table>`. Phase 1 **ignores** `m` completely: it is never
read, displayed, stored, or transmitted. It exists in the URL so Phase 2 can attribute a tap to its
table without anyone physically rewriting the tags.

## Deployment

**In production:** <https://kokersol.github.io/nfc-hubs/demo/> — HTTPS enforced.

`.github/workflows/deploy.yml` builds with Eleventy, runs the full suite as the release gate, and
deploys `_site/` to GitHub Pages on every push to `master`.

### The base path

A GitHub *project page* is served from `https://<user>.github.io/<repo>/`, not from the root of the
host. Because every asset reference in the layout is absolute, without a prefix the deployed site
would load its HTML and then 404 on `base.css`, `theme.css`, and `pending.js`: an unstyled page
with no pending behaviour, and invisible in any local run served from the root.

`scripts/lib/path-prefix.mjs` holds `PATH_PREFIX = "/nfc-hubs/"`. One constant, two consumers:
`eleventy.config.js` feeds it to the `url` filter, and `scripts/serve-static.mjs` strips it, so the
suite requests assets at their real production URLs.

> ⚠ **`PATH_PREFIX` is tied to the repository name.** Renaming it, moving to a user/org Pages repo,
> or attaching a custom domain all change that value (in the last two cases it becomes `/`). The
> workflow compares it against the repository's real name and fails loudly — it is the one check
> only CI can make, because locally the prefix is true by definition: the builder and the test
> server read the same constant.

### Before writing a single tag

> ⚠ **Settle the final production host before writing any NFC tag.** The tag encodes the full URL,
> and re-programming them is manual work, table by table, outside this project. Adding a custom
> domain after they are written invalidates every one of them. Deploying is reversible; tag writing
> is not — you can deploy to a temporary URL for device testing, provided no venue tags are written
> against it.

`wrangler.toml` stays in the tree untouched. Cloudflare Pages remains the candidate for the phase
that needs a server-side `/r/<entry-id>` redirector, which GitHub Pages cannot run. That is a Phase
2 decision, not this one.

## Verification that cannot be automated

Some checks require real hardware and are not covered by the suite (T039): iOS Safari vCard import,
Android Chrome import, reading the nocturnal hub in a dark room, and a real NFC tap with the phone
both locked and unlocked. Automated contrast checks only evaluate *declared* colours, and an
emulated WebKit says nothing about whether iOS opens the contact importer. The procedure is in
[`docs/t039-device-checks.md`](docs/t039-device-checks.md).
