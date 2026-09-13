import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.minimum_chrome_version, "114");
assert.equal(manifest.version, "0.4.1");
assert.equal(manifest.background.type, "module");
assert.deepEqual(manifest.permissions, ["sidePanel", "search", "storage"]);
assert.deepEqual(manifest.host_permissions, ["https://nhentai.net/*"]);
assert.equal(Object.hasOwn(manifest, "content_scripts"), false);
assert.equal(JSON.stringify(manifest).includes("<all_urls>"), false);
assert.equal(JSON.stringify(manifest).includes("dlsite.com"), false);
assert.equal(manifest.permissions.includes("storage"), true);

for (const path of [manifest.background.service_worker, manifest.side_panel.default_path]) {
  await access(new URL(`../${path}`, import.meta.url));
}

const sidePanel = await readFile(new URL("../src/ui/side-panel-v2.js", import.meta.url), "utf8");
const worker = await readFile(new URL("../src/background/service-worker-v2.js", import.meta.url), "utf8");
for (const [name, source] of [["side panel", sidePanel], ["service worker", worker]]) {
  assert.equal(source.includes("innerHTML"), false, `${name} 不得使用 innerHTML`);
  assert.equal(/document\.cookie|Authorization/iu.test(source), false, `${name} 不得讀取或保存敏感資料`);
}
assert.equal(sidePanel.includes("chrome.storage"), false, "panel must not persist inputs or results");
assert.match(sidePanel, /chrome\.search\.query\(\{ text: searchText, disposition: "NEW_TAB" \}\)/);
assert.match(sidePanel, /\.textContent\s*=/);
assert.match(worker, /validateRuntimeMessage/);
assert.match(worker, /credentials:\s*"omit"/);

console.log("manifest-check-v2.mjs: all assertions passed");
