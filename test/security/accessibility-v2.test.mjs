import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../../src/ui/side-panel-v2.html", import.meta.url), "utf8");
const script = await readFile(new URL("../../src/ui/side-panel-v2.js", import.meta.url), "utf8");
const css = await readFile(new URL("../../src/ui/side-panel.css", import.meta.url), "utf8");

assert.match(html, /<label\s+for="lookup-number">[^<]+<\/label>/);
assert.match(html, /<input[^>]+id="lookup-number"[^>]+required/);
assert.match(html, /id="status"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/);
assert.match(html, /id="translation-status"[^>]+role="status"[^>]+aria-live="polite"/);
assert.match(html, /機器直譯，不代表正式譯名/);
assert.match(html, /<button[^>]+id="retry-translation"[^>]*>重試本機翻譯<\/button>/);
assert.match(script, /kind === "error" \? "錯誤" : "狀態"/);
assert.match(script, /setAttribute\("aria-invalid", "true"\)/);
assert.match(script, /validateLookupNumber\(input\.value\)/);
assert.match(script, /作者／署名（原文）/);
assert.match(script, /retryTranslationButton\.addEventListener\("click"/);
assert.match(script, /link\.rel = "noreferrer"/);
assert.match(css, /:focus-visible/);
assert.doesNotMatch(script, /\.innerHTML\s*=/);

console.log("accessibility-v2.test.mjs: all assertions passed");
