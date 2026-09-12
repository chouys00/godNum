import { buildSourceUrl, isApprovedSourceUrl, validateLookupNumber } from "../../core/lookup.js";

export const SOURCE_RECORD_SCHEMA_VERSION = 1;
export const SOURCE_STRATEGIES = ["same_origin_api", "embedded_structured_data", "standard_metadata", "dom"];
export const SOURCE_ERROR_CODES = Object.freeze({
  NOT_FOUND: "SOURCE_NOT_FOUND",
  MANUAL_ACTION: "SOURCE_MANUAL_ACTION_REQUIRED",
  PARSER_OUTDATED: "SOURCE_PARSER_OUTDATED",
  NETWORK: "SOURCE_NETWORK_ERROR"
});

const TEXT_FIELDS = ["titleJapanese", "titleEnglish", "titleDisplay"];
const LIST_FIELDS = ["authors", "groups"];
const ALL_FIELDS = [...TEXT_FIELDS, ...LIST_FIELDS, "pageCount"];
const MAX_TEXT_LENGTH = 500;
const MAX_LIST_ITEMS = 20;
const MAX_EVIDENCE_LENGTH = 160;

export function createEmptySourceData() {
  return {
    titleJapanese: null,
    titleEnglish: null,
    titleDisplay: null,
    authors: [],
    groups: [],
    pageCount: null
  };
}

export function buildSourceRecord(input) {
  const number = typeof input?.number === "string" ? input.number : "";
  const sourceUrl = typeof input?.sourceUrl === "string" ? input.sourceUrl : "";
  if (!validateLookupNumber(number).ok || !isApprovedSourceUrl(sourceUrl) || buildSourceUrl(number) !== sourceUrl) {
    throw new TypeError("來源擷取資料的號碼或網址無效。");
  }

  if (!isValidSnapshotEnvelope(input?.snapshots)) {
    throw new TypeError("來源擷取 snapshot schema 無效。");
  }
  const snapshots = normalizeSnapshots(input.snapshots);
  const data = createEmptySourceData();
  const evidence = {};
  const strategiesTried = [];

  for (const strategy of SOURCE_STRATEGIES) {
    for (const snapshot of snapshots.filter((item) => item.sourceType === strategy)) {
      if (!strategiesTried.includes(strategy)) strategiesTried.push(strategy);
      mergeSnapshot(data, evidence, snapshot);
    }
  }

  const terminalError = classifyTerminalFailure(snapshots);
  if (terminalError) {
    return errorRecord(number, sourceUrl, strategiesTried, terminalError);
  }
  if (hasTitle(data)) {
    return {
      schemaVersion: SOURCE_RECORD_SCHEMA_VERSION,
      status: "success",
      number,
      sourceUrl,
      data,
      evidence,
      strategiesTried,
      error: null
    };
  }

  return errorRecord(number, sourceUrl, strategiesTried, classifyFailure(snapshots));
}

function errorRecord(number, sourceUrl, strategiesTried, error) {
  return {
    schemaVersion: SOURCE_RECORD_SCHEMA_VERSION,
    status: error.status,
    number,
    sourceUrl,
    data: createEmptySourceData(),
    evidence: {},
    strategiesTried,
    error
  };
}

export function isSafeSourceRecord(value) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, ["schemaVersion", "status", "number", "sourceUrl", "data", "evidence", "strategiesTried", "error"]) ||
    value.schemaVersion !== SOURCE_RECORD_SCHEMA_VERSION
  ) return false;
  if (!validateLookupNumber(value.number).ok || !isApprovedSourceUrl(value.sourceUrl)) return false;
  if (buildSourceUrl(value.number) !== value.sourceUrl) return false;
  if (!new Set(["success", "manual_action", "not_found", "error"]).has(value.status)) return false;
  if (!isPlainObject(value.data) || !hasExactKeys(value.data, ALL_FIELDS)) return false;
  if (!TEXT_FIELDS.every((field) => value.data[field] === null || isBoundedText(value.data[field], MAX_TEXT_LENGTH))) return false;
  if (!LIST_FIELDS.every((field) => isBoundedTextList(value.data[field]))) return false;
  if (value.data.pageCount !== null && (!Number.isInteger(value.data.pageCount) || value.data.pageCount < 1 || value.data.pageCount > 10000)) return false;
  if (!isPlainObject(value.evidence) || !hasOnlyKeys(value.evidence, ALL_FIELDS)) return false;
  for (const field of ALL_FIELDS) {
    const hasData = TEXT_FIELDS.includes(field)
      ? value.data[field] !== null
      : LIST_FIELDS.includes(field)
        ? value.data[field].length > 0
        : value.data.pageCount !== null;
    if (hasData && !Object.prototype.hasOwnProperty.call(value.evidence, field)) return false;
  }
  for (const [field, item] of Object.entries(value.evidence)) {
    if (!isPlainObject(item) || !hasExactKeys(item, ["sourceType", "locator"])) return false;
    if (!SOURCE_STRATEGIES.includes(item.sourceType) || !isBoundedText(item.locator, MAX_EVIDENCE_LENGTH)) return false;
    if (TEXT_FIELDS.includes(field) && value.data[field] === null) return false;
    if (LIST_FIELDS.includes(field) && value.data[field].length === 0) return false;
    if (field === "pageCount" && value.data.pageCount === null) return false;
  }
  if (!Array.isArray(value.strategiesTried) || !value.strategiesTried.every((item) => SOURCE_STRATEGIES.includes(item))) {
    return false;
  }
  if (value.status === "success" ? value.error !== null || !hasTitle(value.data) : !isSafeError(value.error)) return false;
  return true;
}

export function isValidSnapshotEnvelope(value) {
  if (!Array.isArray(value) || value.length > SOURCE_STRATEGIES.length * 2) return false;
  return value.every((snapshot) => {
    if (!isPlainObject(snapshot) || !hasOnlyKeys(snapshot, ["sourceType", "values", "locators", "outcome"])) return false;
    if (!SOURCE_STRATEGIES.includes(snapshot.sourceType) || !isPlainObject(snapshot.values) || !isPlainObject(snapshot.locators)) return false;
    if (!hasOnlyKeys(snapshot.values, ALL_FIELDS) || !hasOnlyKeys(snapshot.locators, ALL_FIELDS)) return false;
    if (snapshot.outcome !== undefined) {
      if (!isPlainObject(snapshot.outcome) || !hasOnlyKeys(snapshot.outcome, ["httpStatus", "manualAction", "notFound", "networkError", "parserError"])) return false;
    }
    return true;
  });
}

function normalizeSnapshots(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, SOURCE_STRATEGIES.length * 2).map(normalizeSnapshot).filter(Boolean);
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || !SOURCE_STRATEGIES.includes(snapshot.sourceType)) return null;
  const values = snapshot.values && typeof snapshot.values === "object" ? snapshot.values : {};
  const locators = snapshot.locators && typeof snapshot.locators === "object" ? snapshot.locators : {};
  const normalizedValues = {};
  const normalizedLocators = {};

  for (const field of ALL_FIELDS) {
    const locator = normalizeLocator(locators[field]);
    if (locator) normalizedLocators[field] = locator;
  }
  for (const field of TEXT_FIELDS) {
    const text = normalizeText(values[field]);
    if (text && normalizedLocators[field]) normalizedValues[field] = text;
  }
  for (const field of LIST_FIELDS) {
    const list = normalizeList(values[field]);
    if (list.length && normalizedLocators[field]) normalizedValues[field] = list;
  }
  if (
    Number.isInteger(values.pageCount) &&
    values.pageCount > 0 &&
    values.pageCount <= 10000 &&
    normalizedLocators.pageCount
  ) {
    normalizedValues.pageCount = values.pageCount;
  }
  return {
    sourceType: snapshot.sourceType,
    values: normalizedValues,
    locators: normalizedLocators,
    outcome: normalizeOutcome(snapshot.outcome)
  };
}

function mergeSnapshot(data, evidence, snapshot) {
  for (const field of TEXT_FIELDS) {
    if (data[field] === null && snapshot.values[field]) {
      data[field] = snapshot.values[field];
      evidence[field] = evidenceFor(field, snapshot);
    }
  }
  for (const field of LIST_FIELDS) {
    if (data[field].length === 0 && snapshot.values[field]?.length) {
      data[field] = snapshot.values[field];
      evidence[field] = evidenceFor(field, snapshot);
    }
  }
  if (data.pageCount === null && snapshot.values.pageCount) {
    data.pageCount = snapshot.values.pageCount;
    evidence.pageCount = evidenceFor("pageCount", snapshot);
  }
}

function evidenceFor(field, snapshot) {
  return { sourceType: snapshot.sourceType, locator: snapshot.locators[field] || "unspecified" };
}

function classifyFailure(snapshots) {
  const outcomes = snapshots.map((item) => item.outcome).filter(Boolean);
  if (outcomes.some((item) => item.networkError)) {
    return { code: SOURCE_ERROR_CODES.NETWORK, message: "無法連線到來源網站。", nextAction: "確認網路後重試。", status: "error" };
  }
  return {
    code: SOURCE_ERROR_CODES.PARSER_OUTDATED,
    message: "來源頁面沒有可辨識的作品資料。",
    nextAction: "確認來源頁正常顯示後重新擷取，或回報診斷資訊。",
    status: "error"
  };
}

function classifyTerminalFailure(snapshots) {
  const outcomes = snapshots.map((item) => item.outcome).filter(Boolean);
  if (outcomes.some((item) => item.manualAction || [401, 403, 429].includes(item.httpStatus))) {
    return {
      code: SOURCE_ERROR_CODES.MANUAL_ACTION,
      message: "來源網站要求人工處理，已停止自動擷取。",
      nextAction: "請在來源分頁完成網站要求後按重新擷取。",
      status: "manual_action"
    };
  }
  if (outcomes.some((item) => item.httpStatus === 404 || item.notFound)) {
    return {
      code: SOURCE_ERROR_CODES.NOT_FOUND,
      message: "找不到這個來源作品。",
      nextAction: "確認六位數後重試。",
      status: "not_found"
    };
  }
  return null;
}

function normalizeText(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text.slice(0, MAX_TEXT_LENGTH) : null;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeText).filter(Boolean))].slice(0, MAX_LIST_ITEMS);
}

function normalizeLocator(value) {
  if (typeof value !== "string") return null;
  const locator = value.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  return locator.length > 0 ? locator.slice(0, MAX_EVIDENCE_LENGTH) : null;
}

function normalizeOutcome(value) {
  if (!value || typeof value !== "object") return null;
  const outcome = {};
  if (Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599) outcome.httpStatus = value.httpStatus;
  for (const key of ["manualAction", "notFound", "networkError", "parserError"]) {
    if (value[key] === true) outcome[key] = true;
  }
  return Object.keys(outcome).length ? outcome : null;
}

function hasTitle(data) {
  return TEXT_FIELDS.some((field) => data[field] !== null);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function hasExactKeys(value, keys) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isBoundedText(value, maxLength) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isBoundedTextList(value) {
  return Array.isArray(value) && value.length <= MAX_LIST_ITEMS &&
    value.every((item) => isBoundedText(item, MAX_TEXT_LENGTH));
}

function isSafeError(value) {
  return isPlainObject(value) &&
    hasExactKeys(value, ["code", "message", "nextAction", "status"]) &&
    Object.values(SOURCE_ERROR_CODES).includes(value.code) &&
    ["manual_action", "not_found", "error"].includes(value.status) &&
    isBoundedText(value.message, MAX_TEXT_LENGTH) &&
    isBoundedText(value.nextAction, MAX_TEXT_LENGTH);
}
