import assert from "node:assert/strict";
import { buildSourceRecord } from "../../src/adapters/source/source-adapter.js";
import { createDlsiteState } from "../../src/adapters/dlsite/dlsite-adapter.js";
import {
  MAX_STORED_STATE_AGE_MS,
  STATE_SCHEMA_VERSION,
  createInitialState,
  createLookupState,
  isSafeStoredState,
  normalizeStoredState,
  prepareStateForStorage
} from "../../src/core/state.js";

const NOW = 2_000_000_000_000;
const initial = createInitialState(NOW);
assert.equal(initial.schemaVersion, STATE_SCHEMA_VERSION);
assert.equal(isSafeStoredState(initial, NOW), true);

const first = createLookupState(initial, "460733", 12, NOW);
const repeated = createLookupState(first, "460733", 12, NOW);
assert.deepEqual(repeated, first, "相同時間與輸入應產生相同狀態");
assert.equal(isSafeStoredState(first, NOW), true);

for (const invalid of [
  null,
  { ...initial, schemaVersion: 999 },
  { ...initial, unknown: true },
  { ...initial, recentQueries: ["460733", "460733"] },
  { ...initial, savedAt: NOW - MAX_STORED_STATE_AGE_MS - 1 },
  { ...initial, savedAt: NOW + 5 * 60 * 1000 + 1 },
  { ...first, currentLookup: { ...first.currentLookup, status: "unknown" } },
  { ...first, currentLookup: { ...first.currentLookup, sourceUrl: "https://example.test/g/460733/" } },
  { ...first, currentLookup: { ...first.currentLookup, source: { arbitrary: "page text" } } }
]) {
  assert.deepEqual(normalizeStoredState(invalid, NOW), initial);
}

const source = buildSourceRecord({
  number: "460733",
  sourceUrl: "https://nhentai.net/g/460733/",
  snapshots: [{
    sourceType: "dom",
    values: { titleDisplay: "安全測試" },
    locators: { titleDisplay: "#title" }
  }]
});
const text500 = "字".repeat(500);
const longList = Array.from({ length: 12 }, (_, index) => `${index}`.padStart(3, "0") + text500.slice(3));
const candidate = (index) => ({
  productId: `RJ${String(10000000 + index)}`,
  title: text500,
  circles: longList,
  authors: longList,
  languageHints: longList,
  versionHints: longList,
  productUrl: `https://www.dlsite.com/maniax/work/=/product_id/RJ${String(10000000 + index)}.html`,
  thumbnailUrl: null,
  evidence: "fixture"
});
const oversized = {
  ...first,
  currentLookup: {
    ...first.currentLookup,
    status: "source_captured",
    source,
    dlsite: { ...createDlsiteState(source), status: "completed", candidates: [candidate(1), candidate(2), candidate(3)] }
  }
};
assert.equal(isSafeStoredState(oversized, NOW), false, "超過總長度上限的有效巢狀資料仍須拒絕");
assert.throws(() => prepareStateForStorage(oversized, NOW), TypeError);

const cloned = normalizeStoredState(first, NOW);
cloned.recentQueries.push("299075");
assert.deepEqual(first.recentQueries, ["460733"], "正規化不得回傳可修改原始狀態的參照");

console.log("state.test.mjs: all assertions passed");
