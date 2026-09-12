import assert from "node:assert/strict";
import { MAX_RUNTIME_MESSAGE_LENGTH, validateRuntimeMessage } from "../../src/core/message-schema-v2.js";

assert.equal(validateRuntimeMessage({ type: "LOOKUP", number: "123456" }), "LOOKUP");
assert.equal(validateRuntimeMessage({ type: "LOOKUP", number: 123456 }), null);
assert.equal(validateRuntimeMessage({ type: "LOOKUP", number: "123456", extra: true }), null);
assert.equal(validateRuntimeMessage({ type: "UNKNOWN", number: "123456" }), null);
assert.equal(validateRuntimeMessage({ type: "LOOKUP", number: "x".repeat(MAX_RUNTIME_MESSAGE_LENGTH) }), null);
const circular = { type: "LOOKUP", number: "123456" };
circular.self = circular;
assert.equal(validateRuntimeMessage(circular), null);

console.log("message-schema-v2.test.mjs: all assertions passed");
