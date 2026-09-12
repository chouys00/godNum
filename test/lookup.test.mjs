import assert from "node:assert/strict";
import {
  SOURCE_ORIGIN,
  buildSourceUrl,
  isApprovedSourceUrl,
  validateLookupNumber
} from "../src/core/lookup.js";

const cases = [
  ["有效值", "460733", true, "460733"],
  ["前後空白", " 460733 ", true, "460733"],
  ["少於六位", "46073", false],
  ["多於六位", "4607330", false],
  ["字母", "46a733", false],
  ["全形數字", "４６０７３３", false],
  ["空值", "   ", false]
];

for (const [name, input, expectedOk, expectedValue] of cases) {
  const result = validateLookupNumber(input);
  assert.equal(result.ok, expectedOk, name);
  if (expectedOk) assert.equal(result.value, expectedValue, name);
}

assert.equal(buildSourceUrl("460733"), `${SOURCE_ORIGIN}/g/460733/`);
assert.throws(() => buildSourceUrl("46073"), TypeError);
assert.equal(isApprovedSourceUrl("https://nhentai.net/g/460733/"), true);
assert.equal(isApprovedSourceUrl("http://nhentai.net/g/460733/"), false);
assert.equal(isApprovedSourceUrl("https://nhentai.net/g/460733/?x=1"), false);
assert.equal(isApprovedSourceUrl("https://example.test/g/460733/"), false);
assert.equal(isApprovedSourceUrl("https://user:secret@nhentai.net/g/460733/"), false);
console.log("lookup.test.mjs: all assertions passed");
