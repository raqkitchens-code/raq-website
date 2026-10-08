import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const input = resolve(args.get("--input") ?? "dist/kitchen-planner.html");
const output = resolve(args.get("--output") ?? "plan/index.html");
const metadataPath = resolve(args.get("--metadata") ?? "plan/version.json");
const sha = args.get("--sha");

if (!/^[a-f0-9]{7,40}$/i.test(sha ?? "")) throw new Error("Provide the exact short planner commit with --sha.");
let html = await readFile(input, "utf8");
if (!/<html[^>]+lang="ar"[^>]+dir="rtl"/i.test(html)) throw new Error("Planner artifact must be Arabic RTL.");
if (!/<div id="app"><\/div>/i.test(html)) throw new Error("Planner application mount point is missing.");

html = html.replace("</head>", `<meta name="planner-mode" content="self"><meta name="planner-source-sha" content="${sha}"></head>`);
html = html.replace("</style>", `#raq-planner-version{display:block;margin:20px 12px 14px;padding:8px 0;border-top:1px solid #d8d6cf;color:#77766f;text-align:center;font:inherit;font-size:11px;line-height:1.6}#raq-planner-version small{font:inherit}</style>`);
html = html.replace("</body>", `<footer id="raq-planner-version" data-source-sha="${sha}" aria-label="نسخة المخطط"><small>نسخة المخطط · ${sha}</small></footer></body>`);
if (!html.includes(`id="raq-planner-version" data-source-sha="${sha}"`)) throw new Error("Could not insert planner version footer.");
if (!html.includes(`name="planner-source-sha" content="${sha}"`)) throw new Error("Could not insert planner SHA metadata.");

await mkdir(dirname(output), { recursive: true });
await mkdir(dirname(metadataPath), { recursive: true });
await writeFile(output, html);
await writeFile(metadataPath, `${JSON.stringify({ repository: "raqkitchens-code/KITCHEN-PLANNER", ref: "main", sourceSha: sha, mode: "self" }, null, 2)}\n`);
console.log(`Prepared Self-mode planner snapshot from ${sha}: ${output}`);
