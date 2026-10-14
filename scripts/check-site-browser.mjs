// Browser check of the home page at phone width: no horizontal scroll, the menu opens, and the visit form
// refuses an empty request and opens WhatsApp (DEC-43 number) with the visitor's answers and the QR source.
// Run: node scripts/check-site-browser.mjs  (PLAYWRIGHT_ENTRY can point to a playwright install, as in planner-check)
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = process.env.PLAYWRIGHT_ENTRY
  ? await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_ENTRY)).href)
  : await import("playwright");
const home = pathToFileURL(resolve("index.html")).href;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  let opened = null;
  await page.route("https://wa.me/**", (route) => { opened = route.request().url(); return route.fulfill({ status: 204, body: "" }); });
  await page.goto(`${home}?src=showroom`, { waitUntil: "load" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, "page must fit 390px");

  await page.click(".menu-toggle");
  assert.ok(await page.locator("#main-nav").isVisible(), "menu opens on a phone");
  await page.click('#main-nav a[href="#contact"]');

  await page.click('#visit-form button[type="submit"]');
  assert.ok(await page.locator("#visit-error").isVisible(), "an empty request is refused with a message");
  assert.equal(opened, null, "nothing opens for an empty request");

  await page.fill("#visit-name", "منى");
  await page.selectOption("#visit-service", "دريسينج");
  await page.fill("#visit-area", "بورفؤاد");
  await Promise.all([page.waitForRequest("https://wa.me/**"), page.click('#visit-form button[type="submit"]')]);
  const url = new URL(opened);
  assert.equal(url.pathname, "/201055585530", "the main number (DEC-43)");
  const text = url.searchParams.get("text");
  for (const part of ["منى", "دريسينج", "بورفؤاد", "شاشة المعرض"]) assert.ok(text.includes(part), `message has ${part}`);
  assert.deepEqual(errors, [], "no script errors");
  console.log("Site browser checks passed at 390px: layout, menu, visit form validation and WhatsApp message.");
} finally {
  await browser.close();
}
