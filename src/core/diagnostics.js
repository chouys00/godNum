import { normalizeStoredState } from "./state.js";

export const DIAGNOSTIC_SCHEMA_VERSION = 1;
export const MAX_DIAGNOSTIC_LENGTH = 2000;
const ALLOWED_KEYS = Object.freeze([
  "schemaVersion",
  "extensionVersion",
  "lookupNumber",
  "stage",
  "errorCode",
  "sourceStrategies",
  "dlsiteStatus",
  "completedQueryCount",
  "totalQueryCount",
  "candidateCount"
]);
const ALLOWED_STAGES = new Set(["idle", "source", "source_manual_action", "source_error", "dlsite", "complete"]);
const SAFE_STRATEGIES = new Set(["same_origin_api", "embedded_structured_data", "standard_metadata", "dom"]);

export function buildDiagnosticSummary(state, extensionVersion) {
  const safeState = normalizeStoredState(state);
  const lookup = safeState.currentLookup;
  const source = lookup?.source || null;
  const dlsite = lookup?.dlsite || null;
  const completedQueries = dlsite?.queries?.filter((item) => item.status !== "pending").length || 0;
  const summary = {
    schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
    extensionVersion: normalizeVersion(extensionVersion),
    lookupNumber: lookup?.number || null,
    stage: deriveStage(lookup, source, dlsite),
    errorCode: source?.error?.code || dlsite?.error?.code || null,
    sourceStrategies: source?.strategiesTried?.filter((item) => SAFE_STRATEGIES.has(item)) || [],
    dlsiteStatus: dlsite?.status || null,
    completedQueryCount: completedQueries,
    totalQueryCount: dlsite?.queries?.length || 0,
    candidateCount: dlsite?.candidates?.length || 0
  };
  if (!isSafeDiagnosticSummary(summary)) throw new TypeError("診斷摘要 schema 無效。");
  return summary;
}

export function serializeDiagnosticSummary(summary) {
  if (!isSafeDiagnosticSummary(summary)) throw new TypeError("診斷摘要 schema 無效。");
  const output = JSON.stringify(summary, null, 2);
  if (output.length > MAX_DIAGNOSTIC_LENGTH) throw new TypeError("診斷摘要超出上限。");
  return output;
}

export function isSafeDiagnosticSummary(value) {
  if (!isPlainObject(value) || !hasExactKeys(value, ALLOWED_KEYS)) return false;
  if (value.schemaVersion !== DIAGNOSTIC_SCHEMA_VERSION || !isBoundedText(value.extensionVersion, 32)) return false;
  if (value.lookupNumber !== null && !/^[0-9]{6}$/.test(value.lookupNumber)) return false;
  if (!ALLOWED_STAGES.has(value.stage) || (value.errorCode !== null && !isBoundedText(value.errorCode, 80))) return false;
  if (!Array.isArray(value.sourceStrategies) || value.sourceStrategies.length > SAFE_STRATEGIES.size ||
      !value.sourceStrategies.every((item) => SAFE_STRATEGIES.has(item))) return false;
  if (value.dlsiteStatus !== null && !isBoundedText(value.dlsiteStatus, 40)) return false;
  return [value.completedQueryCount, value.totalQueryCount, value.candidateCount].every(
    (item) => Number.isInteger(item) && item >= 0 && item <= 100
  );
}

function deriveStage(lookup, source, dlsite) {
  if (!lookup) return "idle";
  if (!source) return "source";
  if (source.status === "manual_action") return "source_manual_action";
  if (source.status !== "success") return "source_error";
  if (!dlsite || ["pending", "searching"].includes(dlsite.status)) return "dlsite";
  return "complete";
}

function normalizeVersion(value) {
  return typeof value === "string" && /^[0-9A-Za-z.+-]{1,32}$/.test(value) ? value : "unknown";
}

function isBoundedText(value, maximum) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
