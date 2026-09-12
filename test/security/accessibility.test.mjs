import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../../src/ui/side-panel.html", import.meta.url), "utf8");
const script = await readFile(new URL("../../src/ui/side-panel.js", import.meta.url), "utf8");
const css = await readFile(new URL("../../src/ui/side-panel.css", import.meta.url), "utf8");

assert.match(html, /<label\s+for="lookup-number">[^<]+<\/label>/);
assert.match(html, /<input[^>]+id="lookup-number"[^>]+required/);
assert.match(html, /id="status"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/);
for (const id of ["retry-source", "stop-dlsite", "copy-diagnostics", "clear-history"]) {
  assert.match(html, new RegExp(`<button[^>]+id="${id}"[^>]*>[^<]+<\\/button>`));
}
assert.match(script, /kind === "error" \? "錯誤" : "狀態"/, "狀態種類須有可見文字，不可只靠顏色");
assert.match(script, /navigator\.clipboard\.writeText/);
assert.match(script, /setAttribute\("aria-invalid", "true"\)/);
assert.match(script, /diagnosticText\.length > 2000/);
assert.doesNotMatch(script, /renderState\(changes\.lookupState\?\.newValue\)/, "儲存變更須經 service worker 正規化後再顯示");
assert.match(css, /:focus-visible/);
assert.doesNotMatch(script, /\.innerHTML\s*=/);

console.log("accessibility.test.mjs: all assertions passed");
