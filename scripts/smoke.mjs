import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const preview = process.argv.includes("--preview");
for (const path of ["/", "/privacy", "/credits"]) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.match(html, /lang="ar"/);
  assert.match(html, /dir="rtl"/);
  assert.doesNotMatch(html, /To get started, edit/);
}
const response = await fetch(new URL("/manifest.webmanifest", base));
assert.equal(response.status, 200);
const manifest = await response.json();
assert.equal(manifest.dir, "rtl");
assert.equal(manifest.display, "standalone");
for (const icon of manifest.icons) {
  assert.equal((await fetch(new URL(icon.src, base))).status, 200, icon.src);
}
for (const path of ["manifest.json", "../content/source/book.pdf", "audio/../../package.json"]) {
  assert.equal((await fetch(new URL(`/api/assets/${path}`, base))).status, 404, path);
}
const assets = JSON.parse(
  readFileSync(new URL("../assets/manifest.json", import.meta.url), "utf8"),
);
const draft = assets.assets.find(
  (asset) => !asset.publishable || asset.reviewStatus !== "approved",
);
if (draft) {
  assert.equal(
    (await fetch(new URL(`/api/assets/${draft.path}`, base))).status,
    preview ? 200 : 404,
    "draft assets must not be published",
  );
}
for (const path of ["/qa/activities", "/qa/recorder"]) {
  assert.equal((await fetch(new URL(path, base))).status, preview ? 200 : 404, path);
}
process.stdout.write(
  `PASS: Arabic pages, manifest, icons, asset allowlist (${preview ? "preview" : "production"}).\n`,
);
