import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.minimum_chrome_version, "114");
assert.equal(manifest.background.type, "module");
assert.equal(manifest.host_permissions.includes("<all_urls>"), false);
assert.deepEqual(manifest.permissions, ["sidePanel", "storage", "tabs"]);
assert.deepEqual(manifest.host_permissions, ["https://nhentai.net/*", "https://www.dlsite.com/*"]);
assert.equal(JSON.stringify(manifest).includes("http://"), false);
assert.deepEqual(manifest.content_scripts[0].js, [
  "src/content/source-extractors.js",
  "src/content/source-capture.js"
]);
assert.deepEqual(manifest.content_scripts[1].js, ["src/content/dlsite-extractors.js", "src/content/dlsite-capture.js"]);
for (const path of [
  manifest.background.service_worker,
  manifest.side_panel.default_path,
  manifest.content_scripts[0].js[0]
  , manifest.content_scripts[1].js[0]
]) {
  await access(new URL(`../${path}`, import.meta.url));
}

const sidePanelScript = await readFile(new URL("../src/ui/side-panel.js", import.meta.url), "utf8");
const sourceCaptureScript = await readFile(new URL("../src/content/source-capture.js", import.meta.url), "utf8");
const sourceExtractorsScript = await readFile(new URL("../src/content/source-extractors.js", import.meta.url), "utf8");
const dlsiteExtractorsScript = await readFile(new URL("../src/content/dlsite-extractors.js", import.meta.url), "utf8");
const dlsiteCaptureScript = await readFile(new URL("../src/content/dlsite-capture.js", import.meta.url), "utf8");
const workerScript = await readFile(new URL("../src/background/service-worker.js", import.meta.url), "utf8");
for (const [name, script] of [
  ["side panel", sidePanelScript],
  ["source capture", sourceCaptureScript],
  ["source extractors", sourceExtractorsScript],
  ["DLsite extractors", dlsiteExtractorsScript],
  ["DLsite capture", dlsiteCaptureScript],
  ["service worker", workerScript]
]) {
  assert.equal(script.includes("innerHTML"), false, `${name} 不得使用 innerHTML`);
  assert.equal(/document\.cookie|Authorization/i.test(script), false, `${name} 不讀取 Cookie 或 Authorization`);
}
assert.equal(sidePanelScript.includes(".textContent ="), true);
assert.equal(workerScript.includes("validateRuntimeMessage"), true);
assert.equal(sourceCaptureScript.includes('chrome.runtime.getURL("src/background/service-worker.js")'), true);
assert.equal(sourceCaptureScript.includes("Object.keys(message).length !== 1"), true);
assert.equal(workerScript.includes("serializeDiagnosticSummary"), true);
console.log("manifest-check.mjs: all assertions passed");
