import { isSafeSourceRecord } from "../source/source-adapter.js";

export const DLSITE_ORIGIN = "https://www.dlsite.com";
export const DLSITE_SEARCH_PATH_PREFIX = "/maniax/fsr/=/keyword/";
export const DLSITE_RECORD_SCHEMA_VERSION = 1;
export const MAX_DLSITE_QUERIES = 4;
export const MAX_DLSITE_CANDIDATES = 20;
export const DLSITE_ERROR_CODES = Object.freeze({
  MANUAL_ACTION: "DLSITE_MANUAL_ACTION_REQUIRED",
  PARSER_OUTDATED: "DLSITE_PARSER_OUTDATED",
  NETWORK: "DLSITE_NETWORK_ERROR"
});

const MAX_TEXT_LENGTH = 500;
const MAX_LIST_ITEMS = 12;
const PRODUCT_PATH = /^\/maniax\/work\/=\/product_id\/([A-Z]{2}[0-9]{5,})\.html$/;
const SEARCH_STRATEGIES = Object.freeze([
  "japanese_full",
  "japanese_cleaned",
  "english_or_display",
  "title_with_creator"
]);

export function buildDlsiteSearchUrl(query) {
  const text = normalizeText(query);
  if (!text) throw new TypeError("DLsite 查詢字串無效。");
  return `${DLSITE_ORIGIN}${DLSITE_SEARCH_PATH_PREFIX}${encodeURIComponent(text)}`;
}

export function isApprovedDlsiteSearchUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === DLSITE_ORIGIN &&
      !url.username && !url.password &&
      url.pathname.startsWith(DLSITE_SEARCH_PATH_PREFIX) && url.search === "" && url.hash === "" &&
      decodeURIComponent(url.pathname.slice(DLSITE_SEARCH_PATH_PREFIX.length)).trim().length > 0;
  } catch {
    return false;
  }
}

export function isApprovedDlsiteProductUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === DLSITE_ORIGIN && !url.username && !url.password && PRODUCT_PATH.test(url.pathname) &&
      url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}

export function createDlsiteQueryPlan(source) {
  if (!isSafeSourceRecord(source) || source.status !== "success") return [];
  const japanese = normalizeText(source.data.titleJapanese);
  const cleanedJapanese = japanese ? cleanJapaneseTitle(japanese) : null;
  const alternative = normalizeText(source.data.titleEnglish) || normalizeText(source.data.titleDisplay);
  const primary = japanese || alternative;
  const creator = normalizeText(source.data.groups?.[0]) || normalizeText(source.data.authors?.[0]);
  const proposed = [
    ["japanese_full", japanese],
    ["japanese_cleaned", cleanedJapanese && cleanedJapanese !== japanese ? cleanedJapanese : null],
    ["english_or_display", alternative],
    ["title_with_creator", primary && creator ? `${primary} ${creator}` : null]
  ];
  const seen = new Set();
  return proposed.flatMap(([strategy, query]) => {
    if (!query || seen.has(query) || seen.size >= MAX_DLSITE_QUERIES) return [];
    seen.add(query);
    return [{ strategy, query, url: buildDlsiteSearchUrl(query) }];
  });
}

export function createDlsiteState(source) {
  const queries = createDlsiteQueryPlan(source).map((item) => ({ ...item, status: "pending", candidateCount: 0 }));
  return {
    schemaVersion: DLSITE_RECORD_SCHEMA_VERSION,
    status: queries.length ? "pending" : "unavailable",
    queries,
    candidates: [],
    activeQueryIndex: null,
    activeUrl: null,
    activeTabId: null,
    error: queries.length ? null : errorFor("PARSER_OUTDATED")
  };
}

export function isSafeDlsiteState(value) {
  if (!isPlainObject(value) || !hasExactKeys(value, ["schemaVersion", "status", "queries", "candidates", "activeQueryIndex", "activeUrl", "activeTabId", "error"])) return false;
  if (value.schemaVersion !== DLSITE_RECORD_SCHEMA_VERSION || !["pending", "searching", "completed", "no_results", "stopped", "manual_action", "error", "unavailable"].includes(value.status)) return false;
  if (!Array.isArray(value.queries) || value.queries.length > MAX_DLSITE_QUERIES || !value.queries.every(isSafeQuery)) return false;
  if (!Array.isArray(value.candidates) || value.candidates.length > MAX_DLSITE_CANDIDATES || !value.candidates.every(isSafeCandidate)) return false;
  if (value.activeQueryIndex !== null && (!Number.isInteger(value.activeQueryIndex) || value.activeQueryIndex < 0 || value.activeQueryIndex >= value.queries.length)) return false;
  if (value.activeUrl !== null && !isApprovedDlsiteSearchUrl(value.activeUrl)) return false;
  if (value.activeTabId !== null && !Number.isInteger(value.activeTabId)) return false;
  return value.error === null || isSafeError(value.error);
}

export function isValidDlsiteSnapshot(value) {
  if (!isPlainObject(value) || !hasExactKeys(value, ["status", "candidates", "outcome"])) return false;
  if (!["success", "no_results", "manual_action", "error"].includes(value.status) || !Array.isArray(value.candidates)) return false;
  if (value.candidates.length > MAX_DLSITE_CANDIDATES || !value.candidates.every(isSafeCandidate)) return false;
  return value.outcome === null || isSafeOutcome(value.outcome);
}

export function mergeDlsiteSnapshot(state, snapshot) {
  if (!isSafeDlsiteState(state) || !isValidDlsiteSnapshot(snapshot) || state.activeQueryIndex === null) {
    throw new TypeError("DLsite 搜尋資料無效。");
  }
  const queries = state.queries.map((item, index) => index === state.activeQueryIndex
    ? { ...item, status: snapshot.status, candidateCount: snapshot.candidates.length }
    : item);
  const candidates = dedupeCandidates([...state.candidates, ...snapshot.candidates]);
  const terminal = snapshot.status === "manual_action" || snapshot.status === "error";
  const hasCandidates = candidates.length > 0;
  const completedAll = state.activeQueryIndex >= queries.length - 1;
  return {
    ...state,
    queries,
    candidates,
    activeQueryIndex: null,
    activeUrl: null,
    activeTabId: null,
    status: terminal ? (snapshot.status === "manual_action" ? "manual_action" : "error") :
      hasCandidates ? "completed" : completedAll ? "no_results" : "pending",
    error: terminal ? errorFor(snapshot.status === "manual_action" ? "MANUAL_ACTION" : snapshot.outcome?.networkError ? "NETWORK" : "PARSER_OUTDATED") : null
  };
}

export function activateNextDlsiteQuery(state) {
  if (!isSafeDlsiteState(state) || state.status !== "pending") return null;
  const index = state.queries.findIndex((item) => item.status === "pending");
  if (index < 0) return null;
  const query = state.queries[index];
  return { ...state, status: "searching", activeQueryIndex: index, activeUrl: query.url, activeTabId: null };
}

export function attachDlsiteTab(state, tabId) {
  if (!isSafeDlsiteState(state) || state.status !== "searching" || !Number.isInteger(tabId)) throw new TypeError("DLsite 分頁無效。");
  return { ...state, activeTabId: tabId };
}

function cleanJapaneseTitle(value) {
  return value.replace(/[【\[（(][^】\]）)]{0,80}[】\]）)]/g, " ").replace(/\s+/g, " ").trim() || null;
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((item) => !seen.has(item.productId) && seen.add(item.productId)).slice(0, MAX_DLSITE_CANDIDATES);
}

function isSafeQuery(value) {
  return isPlainObject(value) && hasExactKeys(value, ["strategy", "query", "url", "status", "candidateCount"]) &&
    SEARCH_STRATEGIES.includes(value.strategy) && isBoundedText(value.query) && isApprovedDlsiteSearchUrl(value.url) &&
    ["pending", "success", "no_results", "manual_action", "error"].includes(value.status) &&
    Number.isInteger(value.candidateCount) && value.candidateCount >= 0 && value.candidateCount <= MAX_DLSITE_CANDIDATES;
}

function isSafeCandidate(value) {
  return isPlainObject(value) && hasExactKeys(value, ["productId", "title", "circles", "authors", "languageHints", "versionHints", "productUrl", "thumbnailUrl", "evidence"]) &&
    /^[A-Z]{2}[0-9]{5,}$/.test(value.productId) && isBoundedText(value.title) && isBoundedList(value.circles) && isBoundedList(value.authors) &&
    isBoundedList(value.languageHints) && isBoundedList(value.versionHints) && isApprovedDlsiteProductUrl(value.productUrl) &&
    (value.thumbnailUrl === null || isApprovedThumbnailUrl(value.thumbnailUrl)) && isBoundedText(value.evidence, 180);
}

function isSafeOutcome(value) {
  return isPlainObject(value) && hasOnlyKeys(value, ["manualAction", "networkError", "parserError"]) &&
    Object.values(value).every((item) => item === true);
}

function isApprovedThumbnailUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["img.dlsite.jp", "www.dlsite.com"].includes(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function errorFor(kind) {
  const values = {
    MANUAL_ACTION: { code: DLSITE_ERROR_CODES.MANUAL_ACTION, message: "DLsite 要求人工處理，已停止搜尋。", nextAction: "請在 DLsite 分頁完成網站要求後重新開始搜尋。", status: "manual_action" },
    NETWORK: { code: DLSITE_ERROR_CODES.NETWORK, message: "無法連線到 DLsite。", nextAction: "確認網路後重新搜尋。", status: "error" },
    PARSER_OUTDATED: { code: DLSITE_ERROR_CODES.PARSER_OUTDATED, message: "DLsite 搜尋頁沒有可辨識的候選資料。", nextAction: "確認搜尋頁正常顯示後重新搜尋，或保留未確認狀態。", status: "error" }
  };
  return values[kind];
}

function normalizeText(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, MAX_TEXT_LENGTH) : null;
}

function isBoundedText(value, maxLength = MAX_TEXT_LENGTH) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isBoundedList(value) {
  return Array.isArray(value) && value.length <= MAX_LIST_ITEMS && value.every((item) => isBoundedText(item));
}

function isSafeError(value) {
  return isPlainObject(value) && hasExactKeys(value, ["code", "message", "nextAction", "status"]) &&
    Object.values(DLSITE_ERROR_CODES).includes(value.code) && ["manual_action", "error"].includes(value.status) &&
    isBoundedText(value.message) && isBoundedText(value.nextAction);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, keys) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function hasExactKeys(value, keys) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
