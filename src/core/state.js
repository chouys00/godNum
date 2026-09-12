import { isSafeDlsiteState } from "../adapters/dlsite/dlsite-adapter.js";
import { isSafeSourceRecord } from "../adapters/source/source-adapter.js";
import { buildSourceUrl, isApprovedSourceUrl, validateLookupNumber } from "./lookup.js";

export const STATE_KEY = "lookupState";
export const STATE_SCHEMA_VERSION = 4;
export const MAX_RECENT_QUERIES = 10;
export const MAX_STORED_STATE_LENGTH = 64000;
export const MAX_STORED_STATE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const LOOKUP_STATUSES = new Set([
  "source_opened",
  "source_connected",
  "source_captured",
  "manual_action",
  "not_found",
  "error"
]);

export function createInitialState(now = Date.now()) {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    savedAt: normalizeTimestamp(now),
    currentLookup: null,
    recentQueries: []
  };
}

export function isSafeStoredState(value, now = Date.now()) {
  if (!isPlainObject(value) || !hasExactKeys(value, ["schemaVersion", "savedAt", "currentLookup", "recentQueries"])) {
    return false;
  }
  if (value.schemaVersion !== STATE_SCHEMA_VERSION || !isSafeTimestamp(value.savedAt, now) || !isSerializedSizeSafe(value)) {
    return false;
  }
  if (!isSafeRecentQueries(value.recentQueries)) return false;
  return value.currentLookup === null || isSafeCurrentLookup(value.currentLookup);
}

export function normalizeStoredState(value, now = Date.now()) {
  if (isSafeStoredState(value, now)) return cloneState(value);
  return createInitialState(now);
}

export function prepareStateForStorage(value, now = Date.now()) {
  const candidate = {
    ...value,
    schemaVersion: STATE_SCHEMA_VERSION,
    savedAt: normalizeTimestamp(now)
  };
  if (!isSafeStoredState(candidate, now)) throw new TypeError("本機狀態 schema 無效。");
  return cloneState(candidate);
}

export function createLookupState(previousState, number, sourceTabId = null, now = Date.now()) {
  const validation = validateLookupNumber(number);
  if (!validation.ok) throw new TypeError(validation.message);
  const state = normalizeStoredState(previousState, now);
  const sourceUrl = buildSourceUrl(validation.value);
  return prepareStateForStorage({
    ...state,
    currentLookup: {
      number: validation.value,
      sourceUrl,
      sourceTabId: isSafeTabId(sourceTabId) ? sourceTabId : null,
      status: "source_opened",
      source: null,
      dlsite: null
    },
    recentQueries: [validation.value, ...state.recentQueries.filter((item) => item !== validation.value)].slice(
      0,
      MAX_RECENT_QUERIES
    )
  }, now);
}

function isSafeCurrentLookup(value) {
  if (!isPlainObject(value) || !hasExactKeys(value, ["number", "sourceUrl", "sourceTabId", "status", "source", "dlsite"])) {
    return false;
  }
  if (!validateLookupNumber(value.number).ok || !isApprovedSourceUrl(value.sourceUrl)) return false;
  if (buildSourceUrl(value.number) !== value.sourceUrl || (value.sourceTabId !== null && !isSafeTabId(value.sourceTabId))) return false;
  if (!LOOKUP_STATUSES.has(value.status)) return false;
  if (value.source !== null) {
    if (!isSafeSourceRecord(value.source) || value.source.number !== value.number || value.source.sourceUrl !== value.sourceUrl) return false;
  }
  if (value.dlsite !== null) {
    if (value.source?.status !== "success" || !isSafeDlsiteState(value.dlsite)) return false;
  }
  return true;
}

function isSafeRecentQueries(value) {
  return Array.isArray(value) && value.length <= MAX_RECENT_QUERIES &&
    new Set(value).size === value.length && value.every((item) => typeof item === "string" && /^[0-9]{6}$/.test(item));
}

function isSafeTimestamp(value, now) {
  return Number.isSafeInteger(value) && value >= 0 && value <= now + MAX_FUTURE_CLOCK_SKEW_MS &&
    now - value <= MAX_STORED_STATE_AGE_MS;
}

function normalizeTimestamp(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function isSafeTabId(value) {
  return Number.isInteger(value) && value >= 0;
}

function isSerializedSizeSafe(value) {
  try {
    return JSON.stringify(value).length <= MAX_STORED_STATE_LENGTH;
  } catch {
    return false;
  }
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
