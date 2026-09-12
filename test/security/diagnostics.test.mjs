import assert from "node:assert/strict";
import { buildSourceRecord } from "../../src/adapters/source/source-adapter.js";
import { createDlsiteState } from "../../src/adapters/dlsite/dlsite-adapter.js";
import {
  buildDiagnosticSummary,
  isSafeDiagnosticSummary,
  serializeDiagnosticSummary
} from "../../src/core/diagnostics.js";
import { createInitialState, createLookupState, prepareStateForStorage } from "../../src/core/state.js";

const now = Date.now();
const source = buildSourceRecord({
  number: "460733",
  sourceUrl: "https://nhentai.net/g/460733/",
  snapshots: [{
    sourceType: "dom",
    values: {
      titleDisplay: "Cookie=secret Authorization=Bearer-secret 完整頁面文字",
      authors: ["作者隱私值"]
    },
    locators: { titleDisplay: "#title", authors: ".author" }
  }]
});
let state = createLookupState(createInitialState(now), "460733", 17, now);
state = prepareStateForStorage({
  ...state,
  currentLookup: {
    ...state.currentLookup,
    status: "source_captured",
    source,
    dlsite: createDlsiteState(source)
  }
}, now);

const summary = buildDiagnosticSummary(state, "0.2.0");
assert.equal(isSafeDiagnosticSummary(summary), true);
assert.deepEqual(Object.keys(summary), [
  "schemaVersion", "extensionVersion", "lookupNumber", "stage", "errorCode", "sourceStrategies",
  "dlsiteStatus", "completedQueryCount", "totalQueryCount", "candidateCount"
]);
assert.equal(summary.lookupNumber, "460733");
assert.deepEqual(summary.sourceStrategies, ["dom"]);
const output = serializeDiagnosticSummary(summary);
for (const forbidden of ["Cookie", "Authorization", "Bearer-secret", "完整頁面文字", "作者隱私值", "sourceUrl", "titleDisplay"]) {
  assert.equal(output.includes(forbidden), false, `診斷輸出不得包含 ${forbidden}`);
}
assert.equal(isSafeDiagnosticSummary({ ...summary, cookie: "secret" }), false);
assert.equal(buildDiagnosticSummary(createInitialState(now), "invalid version value!").extensionVersion, "unknown");

console.log("diagnostics.test.mjs: all assertions passed");
