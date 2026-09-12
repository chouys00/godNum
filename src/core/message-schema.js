import { isValidSnapshotEnvelope } from "../adapters/source/source-adapter.js";
import { isValidDlsiteSnapshot } from "../adapters/dlsite/dlsite-adapter.js";

export const MAX_RUNTIME_MESSAGE_LENGTH = 18000;

const MESSAGE_KEYS = Object.freeze({
  GET_STATE: ["type"],
  GET_DIAGNOSTICS: ["type"],
  CLEAR_STATE: ["type"],
  START_LOOKUP: ["type", "number"],
  RETRY_SOURCE: ["type"],
  SOURCE_HANDSHAKE: ["type"],
  SOURCE_SNAPSHOT: ["type", "number", "sourceUrl", "snapshots"],
  DLSITE_SNAPSHOT: ["type", "queryUrl", "snapshot"],
  STOP_DLSITE_SEARCH: ["type"]
});

export function validateRuntimeMessage(message) {
  if (!isPlainObject(message) || typeof message.type !== "string" || !MESSAGE_KEYS[message.type]) return null;
  if (!hasExactKeys(message, MESSAGE_KEYS[message.type]) || !isMessageSizeSafe(message)) return null;
  if (message.type === "START_LOOKUP") {
    return typeof message.number === "string" && message.number.length <= 12 ? message.type : null;
  }
  if (message.type === "SOURCE_SNAPSHOT") {
    return typeof message.number === "string" &&
      typeof message.sourceUrl === "string" &&
      isValidSnapshotEnvelope(message.snapshots)
      ? message.type
      : null;
  }
  if (message.type === "DLSITE_SNAPSHOT") {
    return typeof message.queryUrl === "string" && isValidDlsiteSnapshot(message.snapshot) ? message.type : null;
  }
  return message.type;
}

function hasExactKeys(value, keys) {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isMessageSizeSafe(value) {
  try {
    return JSON.stringify(value).length <= MAX_RUNTIME_MESSAGE_LENGTH;
  } catch {
    return false;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
