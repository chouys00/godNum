export const SOURCE_ORIGIN = "https://nhentai.net";
export const SOURCE_PATH_PREFIX = "/g/";

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
