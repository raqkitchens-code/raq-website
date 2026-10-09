import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const css = await readFile(resolve(root, "styles.css"), "utf8");
const js = await readFile(resolve(root, "script.js"), "utf8");
const planner = await readFile(resolve(root, "plan/index.html"), "utf8");
const plannerVersion = JSON.parse(await readFile(resolve(root, "plan/version.json"), "utf8"));
const failures = [];

for (const [label, condition] of [
  ["Arabic RTL document", /<html lang="ar" dir="rtl">/.test(html)],
  ["Page title", /<title>[^<]+<\/title>/.test(html)],
  ["Description metadata", /name="description"/.test(html)],
  ["Content security policy", /Content-Security-Policy/.test(html)],
  ["Mobile navigation control", /aria-expanded="false"/.test(html) && /is-open/.test(js)],
  ["Reduced motion support", /prefers-reduced-motion/.test(css)],
  ["Main landmarks", /<main\b/.test(html) && /<footer\b/.test(html)],
  ["Responsive layout", /@media\(max-width:640px\)/.test(css)],
  ["Ten service photo slots", (html.match(/class="service-photo-slot(?: product-photo-placeholder)?"/g) ?? []).length === 10],
  ["All confirmed concept photos referenced", ["kitchen-corner.jpg", "kitchen-island.jpg", "kitchen-marble.jpg", "kitchen-wall.jpg", "dressing-glass.jpg", "dressing-island.jpg", "tv-unit.jpg"].every((name) => html.includes(name))],
  ["Planner snapshot declares Self mode", planner.includes('name="planner-mode" content="self"')],
  ["Planner footer SHA matches metadata", /^[a-f0-9]{7,40}$/i.test(plannerVersion.sourceSha) && planner.includes(`data-source-sha="${plannerVersion.sourceSha}"`)],
  ["No contact form storage or analytics", !/\b(localStorage|sessionStorage|analytics|gtag\s*\()/.test(`${html}\n${js}`)],
]) if (!condition) failures.push(label);

for (const [, rawPath] of html.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g)) {
  try { await access(resolve(root, rawPath)); }
  catch { failures.push(`Missing local asset: ${rawPath}`); }
}

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id));
for (const [, fragment] of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.has(fragment)) failures.push(`Broken page anchor: #${fragment}`);
}

for (const forbidden of [/احجز معاينتك المجانية/, /المعاينة المجانية/, /ضمان\s*\d+/, /تسليم خلال\s*\d+/]) {
  if (forbidden.test(html)) failures.push(`Forbidden legacy claim: ${forbidden}`);
}

for (const route of ["plan/index.html", "qr/showroom/index.html", "qr/flyer/index.html", "qr/card/index.html"]) {
  try { await access(resolve(root, route)); }
  catch { failures.push(`Missing route: ${route}`); }
}

if (failures.length) {
  console.error(`Site checks failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Site checks passed: metadata, RTL, CSP, responsive styles, links, claims and utility routes.");
}
