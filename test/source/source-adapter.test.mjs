import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  SOURCE_ERROR_CODES,
  buildSourceRecord,
  isSafeSourceRecord,
  isValidSnapshotEnvelope
} from "../../src/adapters/source/source-adapter.js";

const fixtures = JSON.parse(
  await readFile(new URL("../fixtures/source/deidentified-cases.json", import.meta.url), "utf8")
);

const complete = buildSourceRecord(fixtures.complete);
assert.equal(complete.status, "success");
assert.equal(complete.data.titleJapanese, "架空作品 日本語");
assert.equal(complete.data.titleEnglish, "Fictional Work English");
assert.equal(complete.data.titleDisplay, "Fictional Work");
assert.deepEqual(complete.data.authors, ["作者甲"]);
assert.deepEqual(complete.data.groups, ["社團乙"]);
assert.equal(complete.data.pageCount, 24);
assert.deepEqual(complete.strategiesTried, ["same_origin_api"]);
assert.equal(complete.evidence.titleJapanese.sourceType, "same_origin_api");
assert.equal(isSafeSourceRecord(complete), true);
const evidenceMissing = { ...complete, evidence: { ...complete.evidence } };
delete evidenceMissing.evidence.titleJapanese;
assert.equal(isSafeSourceRecord(evidenceMissing), false, "每個非空欄位都必須有 evidence");
assert.equal(isSafeSourceRecord({ ...complete, unexpected: true }), false);
assert.equal(
  isSafeSourceRecord({ ...complete, data: { ...complete.data, titleDisplay: "x".repeat(501) } }),
  false
);

const fallback = buildSourceRecord(fixtures.fallback);
assert.equal(fallback.data.titleEnglish, "API English", "較高優先序資料不可被 fallback 覆蓋");
assert.equal(fallback.data.titleJapanese, "內嵌日文");
assert.equal(fallback.data.titleDisplay, "中繼資料標題");
assert.deepEqual(fallback.data.groups, ["DOM 社團"]);
assert.deepEqual(fallback.strategiesTried, [
  "same_origin_api",
  "embedded_structured_data",
  "standard_metadata",
  "dom"
]);

const maliciousText = "<img src=x onerror=alert(1)>";
const untrusted = buildSourceRecord({
  number: "637940",
  sourceUrl: "https://nhentai.net/g/637940/",
  snapshots: [{
    sourceType: "dom",
    values: { titleDisplay: maliciousText, authors: ["A\u0000B"], groups: [], pageCount: 99999 },
    locators: { titleDisplay: "#info h1", authors: "#tags .artist" }
  }]
});
assert.equal(untrusted.data.titleDisplay, maliciousText, "不可信文字保持純文字，交由 textContent 顯示");
assert.deepEqual(untrusted.data.authors, ["A B"]);
assert.equal(untrusted.data.pageCount, null, "超出上限的頁數不可採用");

const longTitle = "字".repeat(700);
const bounded = buildSourceRecord({
  number: "678718",
  sourceUrl: "https://nhentai.net/g/678718/",
  snapshots: [{
    sourceType: "standard_metadata",
    values: { titleDisplay: longTitle },
    locators: { titleDisplay: "meta[property=og:title]@content" }
  }]
});
assert.equal(bounded.data.titleDisplay.length, 500, "超長文字須截斷到固定上限");

for (const [outcome, status, code] of [
  [{ httpStatus: 404 }, "not_found", SOURCE_ERROR_CODES.NOT_FOUND],
  [{ manualAction: true }, "manual_action", SOURCE_ERROR_CODES.MANUAL_ACTION],
  [{ httpStatus: 403 }, "manual_action", SOURCE_ERROR_CODES.MANUAL_ACTION],
  [{ networkError: true }, "error", SOURCE_ERROR_CODES.NETWORK],
  [{ parserError: true }, "error", SOURCE_ERROR_CODES.PARSER_OUTDATED],
  [{}, "error", SOURCE_ERROR_CODES.PARSER_OUTDATED]
]) {
  const record = buildSourceRecord({
    number: "405606",
    sourceUrl: "https://nhentai.net/g/405606/",
    snapshots: [{ sourceType: "same_origin_api", values: {}, locators: {}, outcome }]
  });
  assert.equal(record.status, status);
  assert.equal(record.error.code, code);
}

for (const [outcome, status, code] of [
  [{ manualAction: true }, "manual_action", SOURCE_ERROR_CODES.MANUAL_ACTION],
  [{ httpStatus: 403 }, "manual_action", SOURCE_ERROR_CODES.MANUAL_ACTION],
  [{ httpStatus: 404 }, "not_found", SOURCE_ERROR_CODES.NOT_FOUND]
]) {
  const record = buildSourceRecord({
    number: "609219",
    sourceUrl: "https://nhentai.net/g/609219/",
    snapshots: [
      { sourceType: "same_origin_api", values: {}, locators: {}, outcome },
      {
        sourceType: "standard_metadata",
        values: { titleDisplay: "阻擋頁的中繼資料標題" },
        locators: { titleDisplay: "meta[property=og:title]@content" }
      }
    ]
  });
  assert.equal(record.status, status, "終止結果不可被中繼資料標題蓋過");
  assert.equal(record.error.code, code);
  assert.equal(record.data.titleDisplay, null);
  assert.deepEqual(record.evidence, {});
}

const missingEvidence = buildSourceRecord({
  number: "604456",
  sourceUrl: "https://nhentai.net/g/604456/",
  snapshots: [{ sourceType: "dom", values: { titleDisplay: "沒有證據的標題" }, locators: {} }]
});
assert.equal(missingEvidence.status, "error");
assert.equal(missingEvidence.error.code, SOURCE_ERROR_CODES.PARSER_OUTDATED);

assert.equal(isValidSnapshotEnvelope({}), false);
assert.equal(
  isValidSnapshotEnvelope([{ sourceType: "dom", values: {}, locators: {}, unexpected: true }]),
  false,
  "未知欄位必須被 schema allowlist 拒絕"
);
assert.throws(
  () => buildSourceRecord({ number: "460733", sourceUrl: "https://example.test/g/460733/", snapshots: [] }),
  TypeError
);
assert.throws(
  () => buildSourceRecord({ number: "460733", sourceUrl: "https://nhentai.net/g/460733/", snapshots: {} }),
  TypeError
);

console.log("source-adapter.test.mjs: all assertions passed");
