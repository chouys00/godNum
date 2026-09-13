import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../../src/ui/side-panel-v2.html", import.meta.url), "utf8");
const script = await readFile(new URL("../../src/ui/side-panel-v2.js", import.meta.url), "utf8");
const css = await readFile(new URL("../../src/ui/side-panel.css", import.meta.url), "utf8");

assert.match(html, /<label\s+for="lookup-numbers">[^<]+<\/label>/);
assert.match(html, /<textarea[^>]+id="lookup-numbers"[^>]+required/);
assert.match(html, /id="status"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/);
assert.match(html, /以換行、空白或逗號分隔 1 至 10 組號碼/);
assert.match(script, /kind === "error" \? "錯誤" : "狀態"/);
assert.match(script, /setAttribute\("aria-invalid", "true"\)/);
assert.match(script, /validateBatchLookupNumbers\(input\.value\)/);
assert.match(script, /type: "BATCH_LOOKUP"/);
assert.match(script, /作者／署名（原文）/);
assert.match(script, /addSearchField\(fields, "原始標題"/);
assert.match(script, /addSearchField\(fields, "社團"/);
assert.match(script, /chrome\.search\.query/);
assert.match(script, /addEventListener\("auxclick"/);
assert.match(script, /link\.rel = "noreferrer"/);
assert.match(css, /:focus-visible/);
assert.doesNotMatch(script, /\.innerHTML\s*=/);

console.log("accessibility-v2.test.mjs: all assertions passed");
