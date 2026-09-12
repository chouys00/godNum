import { validateLookupNumber } from "../core/lookup.js";
import { validateRuntimeMessage } from "../core/message-schema-v2.js";
import { isSidePanelSender } from "../core/message-context-v2.js";
import {
  buildGalleryApiUrl,
  buildSearchApiUrl,
  findChineseVersions,
  parseGalleryResponse
} from "../adapters/nhentai/nhentai-v2.js";

const REQUEST_TIMEOUT_MS = 20000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: safeErrorMessage(error) }));
  return true;
});

async function handleMessage(message, sender) {
  if (!isSidePanelSender(sender, chrome.runtime.id, chrome.runtime.getURL(""))) {
    return { ok: false, error: "訊息來源不可信。" };
  }
  if (validateRuntimeMessage(message) !== "LOOKUP") return { ok: false, error: "訊息格式無效。" };
  const validation = validateLookupNumber(message.number);
  if (!validation.ok) return { ok: false, error: validation.message };

  const galleryPayload = await fetchJson(buildGalleryApiUrl(validation.value));
  const source = parseGalleryResponse(galleryPayload, validation.value);
  let chineseVersions = [];
  let versionsError = null;
  try {
    const searchPayload = await fetchJson(buildSearchApiUrl(source.searchTitle));
    chineseVersions = findChineseVersions(searchPayload, source);
  } catch (error) {
    versionsError = safeErrorMessage(error);
  }
  return { ok: true, result: { source, chineseVersions, versionsError } };
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (response.status === 404) throw new Error("找不到這個作品。");
    if (response.status === 429) throw new Error("來源 API 已達速率限制，請稍後再試。");
    if (!response.ok) throw new Error(`來源 API 回傳 HTTP ${response.status}。`);
    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("來源 API 查詢逾時。");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function safeErrorMessage(error) {
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  return message && message.length <= 300 ? message : "查詢失敗，請稍後再試。";
}
