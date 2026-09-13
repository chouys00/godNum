export const SOURCE_ORIGIN = "https://nhentai.net";
export const SOURCE_PATH_PREFIX = "/g/";
export const MIN_BATCH_LOOKUP_COUNT = 1;
export const MAX_BATCH_LOOKUP_COUNT = 10;

export function validateLookupNumber(value) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (normalized.length === 0) {
    return { ok: false, message: "請輸入六位阿拉伯數字。" };
  }
  if (!/^[0-9]+$/.test(normalized)) {
    return { ok: false, message: "只能輸入半形阿拉伯數字。" };
  }
  if (normalized.length !== 6) {
    return { ok: false, message: "號碼必須剛好六位。" };
  }
  return { ok: true, value: normalized };
}

export function validateBatchLookupNumbers(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return { ok: false, message: `請輸入 ${MIN_BATCH_LOOKUP_COUNT} 至 ${MAX_BATCH_LOOKUP_COUNT} 組六位阿拉伯數字。` };
  }

  const numbers = normalized.split(/[\s,，]+/u).filter(Boolean);
  if (numbers.length < MIN_BATCH_LOOKUP_COUNT || numbers.length > MAX_BATCH_LOOKUP_COUNT) {
    return { ok: false, message: `每次請輸入 ${MIN_BATCH_LOOKUP_COUNT} 至 ${MAX_BATCH_LOOKUP_COUNT} 組號碼；目前為 ${numbers.length} 組。` };
  }

  const seen = new Set();
  for (const number of numbers) {
    const validation = validateLookupNumber(number);
    if (!validation.ok) return validation;
    if (seen.has(validation.value)) {
      return { ok: false, message: `號碼 ${validation.value} 重複，請只保留一組。` };
    }
    seen.add(validation.value);
  }
  return { ok: true, value: numbers };
}

export function buildSourceUrl(number) {
  const validation = validateLookupNumber(number);
  if (!validation.ok) {
    throw new TypeError(validation.message);
  }
  return `${SOURCE_ORIGIN}${SOURCE_PATH_PREFIX}${validation.value}/`;
}

export function isApprovedSourceUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.origin === SOURCE_ORIGIN &&
      !url.username &&
      !url.password &&
      /^\/g\/[0-9]{6}\/$/.test(url.pathname) &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}
