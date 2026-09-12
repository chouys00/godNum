import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildSourceRecord } from "../../src/adapters/source/source-adapter.js";
import {
  DLSITE_ERROR_CODES,
  MAX_DLSITE_QUERIES,
  activateNextDlsiteQuery,
  attachDlsiteTab,
  buildDlsiteSearchUrl,
  createDlsiteQueryPlan,
  createDlsiteState,
  isApprovedDlsiteProductUrl,
  isApprovedDlsiteSearchUrl,
  isSafeDlsiteState,
  isValidDlsiteSnapshot,
  mergeDlsiteSnapshot
} from "../../src/adapters/dlsite/dlsite-adapter.js";

const sourceFixtures = JSON.parse(await readFile(new URL("../fixtures/source/deidentified-cases.json", import.meta.url), "utf8"));
const { candidate } = JSON.parse(await readFile(new URL("../fixtures/dlsite/deidentified-cases.json", import.meta.url), "utf8"));
const source = buildSourceRecord({
  ...sourceFixtures.complete,
  snapshots: [{
    ...sourceFixtures.complete.snapshots[0],
    values: { ...sourceFixtures.complete.snapshots[0].values, titleJapanese: "【DL版】 架空作品 日本語" }
  }]
});

const plan = createDlsiteQueryPlan(source);
assert.equal(plan.length, 4);
assert.deepEqual(plan.map((item) => item.strategy), ["japanese_full", "japanese_cleaned", "english_or_display", "title_with_creator"]);
assert.equal(plan[1].query, "架空作品 日本語");
assert.equal(plan[3].query, "【DL版】 架空作品 日本語 社團乙");
assert.equal(plan.every((item) => isApprovedDlsiteSearchUrl(item.url)), true);
assert.equal(buildDlsiteSearchUrl("A&B/ C?"), "https://www.dlsite.com/maniax/fsr/=/keyword/A%26B%2F%20C%3F");
assert.equal(isApprovedDlsiteSearchUrl("https://www.dlsite.com/maniax/fsr/=/keyword/%E6%97%A5%E6%9C%AC%E8%AA%9E"), true);
assert.equal(isApprovedDlsiteSearchUrl("https://www.dlsite.com/maniax/fsr/=/keyword/a?x=1"), false);
assert.equal(isApprovedDlsiteSearchUrl("https://user:secret@www.dlsite.com/maniax/fsr/=/keyword/a"), false);
assert.equal(isApprovedDlsiteProductUrl(candidate.productUrl), true);
assert.equal(isApprovedDlsiteProductUrl("https://www.dlsite.com/maniax/work/=/product_id/RJ01234567.html?x=1"), false);
assert.equal(isApprovedDlsiteProductUrl("https://user:secret@www.dlsite.com/maniax/work/=/product_id/RJ01234567.html"), false);

let state = createDlsiteState(source);
assert.equal(state.queries.length, MAX_DLSITE_QUERIES);
assert.equal(isSafeDlsiteState(state), true);
state = activateNextDlsiteQuery(state);
state = attachDlsiteTab(state, 42);
state = mergeDlsiteSnapshot(state, { status: "no_results", candidates: [], outcome: null });
assert.equal(state.status, "pending");
state = activateNextDlsiteQuery(state);
state = mergeDlsiteSnapshot(state, { status: "success", candidates: [candidate, candidate], outcome: null });
assert.equal(state.status, "completed");
assert.deepEqual(state.candidates, [candidate]);

const manualState = attachDlsiteTab(activateNextDlsiteQuery(createDlsiteState(source)), 99);
const manualResult = mergeDlsiteSnapshot(manualState, { status: "manual_action", candidates: [], outcome: { manualAction: true } });
assert.equal(manualResult.status, "manual_action");
assert.equal(manualResult.error.code, DLSITE_ERROR_CODES.MANUAL_ACTION);
assert.equal(isValidDlsiteSnapshot({ status: "success", candidates: [candidate], outcome: null }), true);
assert.equal(isValidDlsiteSnapshot({ status: "success", candidates: [{ ...candidate, productUrl: "https://example.test/work" }], outcome: null }), false);
assert.deepEqual(createDlsiteQueryPlan({ ...source, status: "error" }), []);

console.log("dlsite-adapter.test.mjs: all assertions passed");
