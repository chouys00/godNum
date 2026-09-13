import { validateBatchLookupNumbers, validateLookupNumber } from "../core/lookup.js";
import { validateRuntimeMessage } from "../core/message-schema-v2.js";
import { isSidePanelSender } from "../core/message-context-v2.js";
import {
  buildGalleryApiUrl,
  buildSearchApiUrl,
  findChineseVersions,
  parseGalleryResponse
} from "../adapters/nhentai/nhentai-v2.js";

const REQUEST_TIMEOUT_MS = 20000;
const MIN_API_REQUEST_INTERVAL_MS = 3100;
let nextApiRequestAt = 0;

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
  const messageType = validateRuntimeMessage(message);
  if (!messageType) return { ok: false, error: "訊息格式無效。" };
  if (messageType === "BATCH_LOOKUP") return await handleBatchLookup(message.numbers);

  const validation = validateLookupNumber(message.number);
  if (!validation.ok) return { ok: false, error: validation.message };
  return { ok: true, result: await lookupNumber(validation.value) };
}

async function handleBatchLookup(numbers) {
  const validation = validateBatchLookupNumbers(numbers.join("\n"));
  if (!validation.ok) return { ok: false, error: validation.message };

  const results = [];
  for (const number of validation.value) {
    try {
      results.push({ number, ok: true, result: await lookupNumber(number) });
    } catch (error) {
      results.push({ number, ok: false, error: safeErrorMessage(error) });
    }
  }
  return { ok: true, results };
}

async function lookupNumber(number) {
  const galleryPayload = await fetchJson(buildGalleryApiUrl(number));
  const source = parseGalleryResponse(galleryPayload, number);
  let chineseVersions = [];
  let versionsError = null;
  try {
    const searchPayload = await fetchJson(buildSearchApiUrl(source.searchTitle));
    chineseVersions = findChineseVersions(searchPayload, source);
  } catch (error) {
    versionsError = safeErrorMessage(error);
  }
  return { source, chineseVersions, versionsError };
}

async function fetchJson(url) {
  await waitForApiRequestSlot();
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

async function waitForApiRequestSlot() {
  const now = Date.now();
  const requestAt = Math.max(now, nextApiRequestAt);
  nextApiRequestAt = requestAt + MIN_API_REQUEST_INTERVAL_MS;
  const waitMs = requestAt - now;
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
}

function safeErrorMessage(error) {
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  return message && message.length <= 300 ? message : "查詢失敗，請稍後再試。";
}
