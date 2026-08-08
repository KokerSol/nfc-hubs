import { readFileSync } from "node:fs";

import { test, expect } from "@playwright/test";

import { PATH_PREFIX } from "../../scripts/lib/path-prefix.mjs";
import { hubs, hasVcard } from "../lib/hubs";

/**
 * The save-contact vCard as an OPTIONAL module of the archetype.
 *
 * Two separate claims, because they fail independently:
 *
 *   1. The loading seam. A hub ships /_engine/vcard.js if and only if its data declares a
 *      `vcard` entry. This used to be asserted as "the copas hub has no vCard (FR-017)" -
 *      a statement about one named business. It is now derived from each business's data,
 *      which is what makes the feature opt-in per instance rather than per category.
 *
 *   2. The generator itself still produces a correct card from the SHIPPED src/_engine/
 *      file - escaping, CRLF, all four values, and no network request.
 *
 * ⚠ Honest limit (Constitution VIII): the confirmed branch of entry-vcard.njk still has no
 * business rendering it. `berrry-sin` declares a `vcard` entry, but its contact phone is the
 * sentinel, so it renders PENDING - which exercises the loading seam (claim 1) but not the
 * confirmed button. Claim 2 is therefore still driven by loading the shipped module onto a hub
 * page with an injected trigger. That covers the generator, and says nothing about whether iOS
 * Safari opens the contact importer - only T039 on real hardware settles that.
 *
 * ⚠ The request path MUST carry PATH_PREFIX. This assertion compares against what the BROWSER
 * requests, and a project page is served from /<repo>/, so the pathname is
 * "/nfc-hubs/_engine/vcard.js" and never the bare "/_engine/vcard.js". The bare literal was
 * hardcoded here before the prefix existed (d567b22) and survived unnoticed, because until a
 * business declared a `vcard` entry this assertion only ever ran its NEGATIVE branch: false
 * === false passes without the path ever being compared to anything real. Deriving it from the
 * one constant is what stops that recurring.
 */
const VCARD_SCRIPT = `${PATH_PREFIX}_engine/vcard.js`;

for (const hub of hubs()) {
  const expected = hasVcard(hub.data);

  test(`${hub.slug}: ships vCard code only when its data declares a vcard entry`, async ({
    page,
  }) => {
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(new URL(request.url()).pathname);
    });

    await page.goto(`/${hub.slug}/`);
    await page.waitForLoadState("networkidle");

    // Precondition: the page rendered. "The script was not requested" is true of a 404 too.
    await expect(page.locator(".entries__item").first()).toBeVisible();

    expect(scripts.includes(VCARD_SCRIPT)).toBe(expected);
  });
}

test("SC-006/FR-020: the shipped generator produces a valid vCard with all four values", async ({
  page,
}) => {
  // The values below deliberately contain the three characters RFC 2426 escaping exists for.
  const contact = {
    name: "Taberna, Vela; y Sal \\ SL",
    phone: "+34 600 000 000",
    address: "Calle del Ejemplo, 12; 2º izq",
    website: "https://example.com/a,b",
  };

  await page.goto("/demo/");
  await expect(page.locator(".entries__item").first()).toBeVisible();

  // The module as SHIPPED, served from _site/ - not a copy compiled into the test.
  await page.addScriptTag({ url: VCARD_SCRIPT });

  await page.evaluate((data) => {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "test-vcard-trigger";
    button.setAttribute("data-vcard", "");
    button.setAttribute("data-vcard-filename", "demo.vcf");
    button.setAttribute("data-vcard-name", data.name);
    button.setAttribute("data-vcard-phone", data.phone);
    button.setAttribute("data-vcard-address", data.address);
    button.setAttribute("data-vcard-website", data.website);
    document.body.appendChild(button);
  }, contact);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#test-vcard-trigger").click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("demo.vcf");

  const path = await download.path();
  const vcf = readFileSync(path!, "utf8");

  expect(vcf.startsWith("BEGIN:VCARD\r\n")).toBe(true);
  expect(vcf).toContain("VERSION:3.0");
  expect(vcf.trimEnd().endsWith("END:VCARD")).toBe(true);

  // CRLF throughout: a bare LF would be a line ending some importers reject.
  expect(vcf).not.toMatch(/(?<!\r)\n/);

  // RFC 2426 escaping. An unescaped comma in the street address silently splits the field.
  expect(vcf).toContain("FN:Taberna\\, Vela\\; y Sal \\\\ SL");
  expect(vcf).toContain("ORG:Taberna\\, Vela\\; y Sal \\\\ SL");
  expect(vcf).toContain("TEL;TYPE=WORK,VOICE:+34 600 000 000");
  expect(vcf).toContain("ADR;TYPE=WORK:;;Calle del Ejemplo\\, 12\\; 2º izq;;;;");
  expect(vcf).toContain("URL:https://example.com/a\\,b");

  // Nothing from the placeholder world may ever reach a contact card.
  expect(vcf).not.toContain("PLACEHOLDER");
});
