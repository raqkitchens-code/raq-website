import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const artifact = resolve(process.argv[2] ?? "plan/index.html");
const metadataPath = process.argv[3] ? resolve(process.argv[3]) : resolve("plan/version.json");
const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
const raw = await readFile(artifact, "utf8");
const sha = metadata.sourceSha;
assert.match(sha, /^[a-f0-9]{7,40}$/i, "recorded planner SHA is required");
assert.ok(raw.includes(`name="planner-mode" content="self"`), "snapshot must declare public Self mode");
assert.ok(raw.includes(`name="planner-source-sha" content="${sha}"`), "SHA metadata must match the snapshot record");
assert.ok(raw.includes(`id="raq-planner-version" data-source-sha="${sha}"`), "visible footer SHA must match the snapshot record");

const playwrightEntry = process.env.PLAYWRIGHT_ENTRY;
const { chromium } = playwrightEntry
  ? await import(pathToFileURL(resolve(playwrightEntry)).href)
  : await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(artifact).href, { waitUntil: "load" });
  await page.locator("#app .home").waitFor({ state: "visible" });
  const pricePattern = /[0-9٠-٩۰-۹][0-9٠-٩۰-۹\s,،٬.٫]*\s*(?:جنيه|ج\s*\.?\s*م\.?)/u;
  const assertNoVisiblePrice = async (state) => {
    const text = await page.locator("body").innerText();
    const match = text.match(pricePattern);
    assert.equal(match, null, `Visible price in ${state}: ${match?.[0]}`);
  };

  await assertNoVisiblePrice("Self-mode landing page");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, "landing page must fit 390px");
  const startGuided = page.locator('button[data-act="new"][data-u="guided"]');
  assert.ok(await startGuided.isVisible(), "customer-facing guided start must be visible");
  await startGuided.click();
  await page.locator(".gsteps").waitFor({ state: "visible" });
  await assertNoVisiblePrice("new guided Self-mode project");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, "planner controls must fit 390px");
  const controls = await page.locator(".gsteps button:visible, .gnav button:visible").count();
  assert.ok(controls > 0, "guided planner controls must remain visible at 390px");
  const footerSha = await page.locator("#raq-planner-version").getAttribute("data-source-sha");
  assert.equal(footerSha, sha, "footer SHA must match the committed source SHA");
  console.log(`Planner browser checks passed at 390px; Self mode, controls, and no visible price verified for ${sha}.`);
} finally {
  await browser.close();
}
