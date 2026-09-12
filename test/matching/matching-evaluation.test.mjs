import assert from "node:assert/strict";
import { calculateMatchingMetrics } from "../../src/core/matching-evaluation.js";

assert.deepEqual(calculateMatchingMetrics([]), {
  counts: {
    total: 0,
    truthPositive: 0,
    automaticMatches: 0,
    truePositive: 0,
    falsePositive: 0,
    falseNegative: 0,
    trueNegative: 0,
    abstained: 0
  },
  precision: null,
  recall: null,
  coverage: null,
  abstentionRate: null
});

const cases = [
  { truthId: "RJ1", decision: "matched", selectedId: "RJ1" },
  { truthId: "RJ2", decision: "matched", selectedId: "RJ9" },
  { truthId: "RJ3", decision: "review", selectedId: null },
  { truthId: null, decision: "matched", selectedId: "RJ4" },
  { truthId: null, decision: "not_found", selectedId: null }
];
const metrics = calculateMatchingMetrics(cases);
assert.deepEqual(metrics.counts, {
  total: 5,
  truthPositive: 3,
  automaticMatches: 3,
  truePositive: 1,
  falsePositive: 2,
  falseNegative: 2,
  trueNegative: 1,
  abstained: 2
});
assert.equal(metrics.precision, 1 / 3);
assert.equal(metrics.recall, 1 / 3);
assert.equal(metrics.coverage, 3 / 5);
assert.equal(metrics.abstentionRate, 2 / 5);

assert.throws(() => calculateMatchingMetrics([{ truthId: "RJ1", decision: "matched", selectedId: null }]), /selectedId/);
assert.throws(() => calculateMatchingMetrics([{ truthId: null, decision: "review", selectedId: "RJ1" }]), /必須為 null/);
assert.throws(() => calculateMatchingMetrics([{ truthId: null, decision: "guess", selectedId: null }]), /decision/);
assert.throws(() => calculateMatchingMetrics([{ truthId: null, decision: "not_found", selectedId: null, extra: true }]), /欄位/);

console.log("matching-evaluation.test.mjs: all assertions passed");
