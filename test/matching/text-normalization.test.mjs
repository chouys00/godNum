import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  MAX_COMPARABLE_TEXT_LENGTH,
  buildTitleVariants,
  characterNgramSimilarity,
  normalizeComparableText,
  normalizeCoreTitle,
  stableRankByScore
} from "../../src/core/text-normalization.js";

assert.equal(normalizeComparableText("  ＡＢＣ　１２３  "), "abc 123");
assert.equal(normalizeComparableText("作品：Test／測試！"), "作品 test 測試");
assert.equal(normalizeComparableText("A\u0000\nB\tC"), "a b c");
assert.equal(normalizeComparableText("   "), null);
assert.equal(normalizeComparableText(null), null);
assert.equal(normalizeComparableText("字".repeat(1200)).length, MAX_COMPARABLE_TEXT_LENGTH);
assert.equal(normalizeComparableText("😀".repeat(1200)), null, "只有符號的超長輸入應安全正規化為空值");

assert.equal(normalizeCoreTitle("作品名【繁體中文版】（DL 版）"), "作品名");
assert.equal(normalizeCoreTitle("作品（這段超過八十字" + "長".repeat(81) + "）"), normalizeComparableText("作品（這段超過八十字" + "長".repeat(81) + "）"));

const inputTitles = ["作品名【中文】", "作品名", "作品名【中文】"];
const inputCopy = [...inputTitles];
assert.deepEqual(buildTitleVariants(inputTitles), [
  { kind: "full", value: "作品名 中文" },
  { kind: "core", value: "作品名" }
]);
assert.deepEqual(inputTitles, inputCopy, "不得修改原始輸入");

assert.equal(characterNgramSimilarity("同一作品", "同一作品"), 1);
assert.equal(characterNgramSimilarity("完全不同", "另一部書"), 0);
assert.equal(characterNgramSimilarity("", "作品"), 0);
assert.ok(characterNgramSimilarity("架空作品 上卷", "架空作品 下卷") > 0.5);
assert.throws(() => characterNgramSimilarity("a", "a", 0), /1 至 4/);

const rankedInput = [
  { id: "B", score: 10, sortKey: "beta" },
  { id: "C", score: 20, sortKey: "charlie" },
  { id: "A", score: 10, sortKey: "alpha" }
];
const rankedCopy = [...rankedInput];
assert.deepEqual(stableRankByScore(rankedInput).map((item) => item.id), ["C", "A", "B"]);
assert.deepEqual(rankedInput, rankedCopy, "排序不得修改輸入陣列");
assert.throws(() => stableRankByScore([{ id: "x", score: Number.NaN }]), /有限 score/);

const started = performance.now();
for (let index = 0; index < 2000; index += 1) {
  const left = `作品 ＡＢＣ ${index}【繁體中文版】`;
  normalizeCoreTitle(left);
  characterNgramSimilarity(left, `作品 ABC ${index}`);
}
assert.ok(performance.now() - started < 500, "代表性純文字批次應在 500 毫秒內完成");

console.log("text-normalization.test.mjs: all assertions passed");
