export const MAX_COMPARABLE_TEXT_LENGTH = 1000;
export const MAX_TITLE_VARIANTS = 24;

const BRACKETED_ANNOTATION = /【[^】]{0,80}】|\[[^\]]{0,80}\]|（[^）]{0,80}）|\([^)]{0,80}\)/gu;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/gu;
const PUNCTUATION_AND_SYMBOLS = /[\p{P}\p{S}]+/gu;
const WHITESPACE = /\s+/gu;

export function normalizeComparableText(value) {
  if (typeof value !== "string") return null;
  const bounded = [...value.normalize("NFKC")].slice(0, MAX_COMPARABLE_TEXT_LENGTH).join("");
  const normalized = bounded
    .replace(CONTROL_CHARACTERS, " ")
    .toLowerCase()
    .replace(PUNCTUATION_AND_SYMBOLS, " ")
    .replace(WHITESPACE, " ")
    .trim();
  return normalized || null;
}

export function normalizeCoreTitle(value) {
  if (typeof value !== "string") return null;
  return normalizeComparableText(value.normalize("NFKC").replace(BRACKETED_ANNOTATION, " "));
}

export function buildTitleVariants(values) {
  if (!Array.isArray(values)) return [];
  const result = [];
  const seen = new Set();
  for (const raw of values.slice(0, 12)) {
    const variants = [
      ["full", normalizeComparableText(raw)],
      ["core", normalizeCoreTitle(raw)]
    ];
    for (const [kind, value] of variants) {
      if (!value || seen.has(value) || result.length >= MAX_TITLE_VARIANTS) continue;
      seen.add(value);
      result.push({ kind, value });
    }
  }
  return result;
}

export function characterNgramSimilarity(left, right, size = 2) {
  if (!Number.isInteger(size) || size < 1 || size > 4) throw new TypeError("n-gram 大小必須為 1 至 4 的整數。");
  const a = normalizeComparableText(left);
  const b = normalizeComparableText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aGrams = ngrams(a, size);
  const bGrams = ngrams(b, size);
  if (!aGrams.length || !bGrams.length) return 0;
  const counts = new Map();
  for (const gram of aGrams) counts.set(gram, (counts.get(gram) || 0) + 1);
  let overlap = 0;
  for (const gram of bGrams) {
    const count = counts.get(gram) || 0;
    if (!count) continue;
    overlap += 1;
    counts.set(gram, count - 1);
  }
  return (2 * overlap) / (aGrams.length + bGrams.length);
}

export function stableRankByScore(items) {
  if (!Array.isArray(items)) throw new TypeError("排序輸入必須是陣列。");
  const prepared = items.map((item) => {
    if (!item || typeof item.id !== "string" || !item.id || !Number.isFinite(item.score)) {
      throw new TypeError("每筆排序資料都必須有非空 id 與有限 score。");
    }
    return {
      item,
      sortKey: normalizeComparableText(item.sortKey) || "",
      idKey: item.id.normalize("NFKC").toLowerCase()
    };
  });
  return prepared.sort((a, b) =>
    b.item.score - a.item.score || compareStrings(a.sortKey, b.sortKey) || compareStrings(a.idKey, b.idKey)
  ).map(({ item }) => item);
}

function compareStrings(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function ngrams(value, size) {
  const characters = [...value];
  if (characters.length < size) return [];
  return Array.from({ length: characters.length - size + 1 }, (_, index) => characters.slice(index, index + size).join(""));
}
