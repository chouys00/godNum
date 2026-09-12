import assert from "node:assert/strict";
import { MAX_RUNTIME_MESSAGE_LENGTH, validateRuntimeMessage } from "../../src/core/message-schema.js";

assert.equal(validateRuntimeMessage({ type: "GET_STATE" }), "GET_STATE");
assert.equal(validateRuntimeMessage({ type: "GET_DIAGNOSTICS" }), "GET_DIAGNOSTICS");
assert.equal(validateRuntimeMessage({ type: "CLEAR_STATE" }), "CLEAR_STATE");
assert.equal(validateRuntimeMessage({ type: "RETRY_SOURCE" }), "RETRY_SOURCE");
assert.equal(validateRuntimeMessage({ type: "STOP_DLSITE_SEARCH" }), "STOP_DLSITE_SEARCH");
assert.equal(validateRuntimeMessage({ type: "START_LOOKUP", number: "460733" }), "START_LOOKUP");
assert.equal(validateRuntimeMessage({ type: "GET_STATE", extra: true }), null);
assert.equal(validateRuntimeMessage({ type: "UNKNOWN" }), null);
assert.equal(validateRuntimeMessage({ type: "GET_DIAGNOSTICS", fields: ["cookie"] }), null);
assert.equal(validateRuntimeMessage([]), null);
assert.equal(validateRuntimeMessage({ type: "START_LOOKUP", number: 460733 }), null);
assert.equal(validateRuntimeMessage({ type: "START_LOOKUP", number: "1".repeat(13) }), null);

const snapshotMessage = {
  type: "SOURCE_SNAPSHOT",
  number: "460733",
  sourceUrl: "https://nhentai.net/g/460733/",
  snapshots: [{ sourceType: "dom", values: {}, locators: {} }]
};
assert.equal(validateRuntimeMessage(snapshotMessage), "SOURCE_SNAPSHOT");
assert.equal(validateRuntimeMessage({ ...snapshotMessage, unexpected: true }), null);
const dlsiteMessage = {
  type: "DLSITE_SNAPSHOT",
  queryUrl: "https://www.dlsite.com/maniax/fsr/=/keyword/%E6%9E%B6%E7%A9%BA",
  snapshot: {
    status: "no_results",
    candidates: [],
    outcome: null
  }
};
assert.equal(validateRuntimeMessage(dlsiteMessage), "DLSITE_SNAPSHOT");
assert.equal(validateRuntimeMessage({ ...dlsiteMessage, extra: true }), null);
assert.equal(
  validateRuntimeMessage({
    ...snapshotMessage,
    snapshots: [{ sourceType: "dom", values: { unknown: "x" }, locators: {} }]
  }),
  null
);
assert.equal(
  validateRuntimeMessage({ type: "START_LOOKUP", number: "x".repeat(MAX_RUNTIME_MESSAGE_LENGTH) }),
  null
);

const circular = { type: "GET_STATE" };
circular.self = circular;
assert.equal(validateRuntimeMessage(circular), null);

console.log("message-schema.test.mjs: all assertions passed");
