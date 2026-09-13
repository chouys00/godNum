import { validateLookupNumber } from "../../core/lookup.js";

export const NHENTAI_ORIGIN = "https://nhentai.net";
export const NHENTAI_API_ORIGIN = "https://nhentai.net";
const MAX_TEXT_LENGTH = 500;
const MAX_RESULTS = 25;

export function buildGalleryApiUrl(number) {
  const validation = validateLookupNumber(number);
  if (!validation.ok) throw new TypeError(validation.message);
  return `${NHENTAI_API_ORIGIN}/api/v2/galleries/${validation.value}`;
}

export function buildSearchApiUrl(query) {
  const normalized = cleanText(query);
  if (!normalized) throw new TypeError("搜尋標題不可為空。");
  const parameters = new URLSearchParams({ query: normalized, sort: "date", page: "1" });
  return `${NHENTAI_API_ORIGIN}/api/v2/search?${parameters.toString()}`;
}

export function parseGalleryResponse(value, expectedNumber) {
  const validation = validateLookupNumber(expectedNumber);
  if (!validation.ok || !isPlainObject(value) || value.id !== Number(validation.value)) {
    throw new TypeError("作品 API 回應與輸入號碼不一致。");
  }
  const title = isPlainObject(value.title) ? value.title : {};
  const japaneseTitle = cleanText(title.japanese);
  const englishTitle = cleanText(title.english);
  const displayTitle = cleanText(title.pretty);
  const rawTitle = japaneseTitle || displayTitle || englishTitle;
  if (!rawTitle) throw new TypeError("作品 API 回應缺少標題。");

  const tags = Array.isArray(value.tags) ? value.tags.slice(0, 200) : [];
  const searchTitle = stripTitleMetadata(rawTitle);
  if (!searchTitle) throw new TypeError("作品標題無法建立搜尋字串。");

  return {
    number: validation.value,
    sourceUrl: `${NHENTAI_ORIGIN}/g/${validation.value}/`,
    japaneseTitle,
    englishTitle,
    displayTitle,
    searchTitle,
    credit: leadingCredit(rawTitle),
    artists: tagNames(tags, "artist"),
    groups: tagNames(tags, "group"),
    pageCount: Number.isInteger(value.num_pages) && value.num_pages > 0 ? value.num_pages : null
  };
}

export function findChineseVersions(value, source) {
  if (!isPlainObject(value) || !Array.isArray(value.result) || !isPlainObject(source)) {
    throw new TypeError("搜尋 API 回應格式無效。");
  }
  const sourceKey = comparisonKey(source.searchTitle);
  const sourceCredit = comparisonKey(source.credit);
  if (!sourceKey) throw new TypeError("來源標題無法核對。");

  const accepted = [];
  for (const item of value.result.slice(0, MAX_RESULTS)) {
    if (!isPlainObject(item) || !Number.isInteger(item.id) || item.id === Number(source.number)) continue;
    const englishTitle = cleanText(item.english_title);
    const japaneseTitle = cleanText(item.japanese_title);
    if (!isChineseEdition(englishTitle, japaneseTitle)) continue;

    const candidateRaw = japaneseTitle || englishTitle;
    const candidateKey = comparisonKey(stripTitleMetadata(candidateRaw));
    const candidateCredit = comparisonKey(leadingCredit(candidateRaw));
    const authorCompatible = creditsCompatible(source.credit, leadingCredit(candidateRaw), sourceCredit, candidateCredit);
    const pagesCompatible = arePagesCompatible(source.pageCount, item.num_pages);
    if (candidateKey !== sourceKey || !authorCompatible || !pagesCompatible) continue;

    accepted.push({
      id: item.id,
      url: `${NHENTAI_ORIGIN}/g/${item.id}/`,
      title: englishTitle || japaneseTitle || `Gallery ${item.id}`,
      pageCount: Number.isInteger(item.num_pages) && item.num_pages > 0 ? item.num_pages : null
    });
  }
  return accepted;
}

export function stripTitleMetadata(value) {
  let text = cleanText(value) || "";
  text = text.replace(/^\s*\[[^\]]+\]\s*/u, "");
  let previous;
  do {
    previous = text;
    text = text.replace(/\s*\[[^\]]+\]\s*$/u, "").trim();
  } while (text !== previous);
  return text.slice(0, MAX_TEXT_LENGTH);
}

export function containsJapanese(value) {
  return typeof value === "string" && /[\u3040-\u30ff\u3400-\u9fff]/u.test(value);
}

function isChineseEdition(englishTitle, japaneseTitle) {
  return /\[Chinese\]/iu.test(englishTitle || "") || /中国翻訳/u.test(japaneseTitle || "");
}

function arePagesCompatible(sourcePages, candidatePages) {
  if (!Number.isInteger(sourcePages) || !Number.isInteger(candidatePages)) return true;
  return Math.abs(sourcePages - candidatePages) <= Math.max(5, Math.ceil(sourcePages * 0.2));
}

function creditsCompatible(sourceRaw, candidateRaw, sourceKey, candidateKey) {
  if (!sourceKey || !candidateKey || sourceKey === candidateKey) return true;
  const sourceJapanese = containsJapanese(sourceRaw || "");
  const candidateJapanese = containsJapanese(candidateRaw || "");
  return sourceJapanese !== candidateJapanese;
}

function leadingCredit(value) {
  const match = cleanText(value)?.match(/^\s*\[([^\]]+)\]/u);
  return match ? match[1].trim().slice(0, MAX_TEXT_LENGTH) : null;
}

function tagNames(tags, type) {
  return [...new Set(tags
    .filter((tag) => isPlainObject(tag) && tag.type === type)
    .map((tag) => cleanText(tag.name))
    .filter(Boolean))].slice(0, 20);
}

function comparisonKey(value) {
  return (cleanText(value) || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function cleanText(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim();
  return text ? text.slice(0, MAX_TEXT_LENGTH) : null;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
