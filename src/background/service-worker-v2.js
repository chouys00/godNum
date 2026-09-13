import { validateBatchLookupNumbers, validateLookupNumber } from "../core/lookup.js";
import { validateRuntimeMessage } from "../core/message-schema-v2.js";
import { isSidePanelSender } from "../core/message-context-v2.js";
import {
  buildGalleryApiUrl,
  buildSearchApiUrl,
  findChineseVersions,
  parseGalleryResponse
} from "../adapters/nhentai/nhentai-v2.js";

import { createApiScheduler, createRateStore } from "./api-scheduler.js";

const REQUEST_TIMEOUT_MS = 20000;
const schedule = createApiScheduler(createRateStore(chrome.storage.local));

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "lookup" || !isSidePanelSender(port.sender, chrome.runtime.id, chrome.runtime.getURL(""))) {
    port.disconnect(); return;
  }
  let started = false;
  let disconnected = false;
  const controller = new AbortController();
  port.onDisconnect.addListener(() => { disconnected = true; controller.abort(); });
  const emit = (message) => {
    if (disconnected) return;
    try { port.postMessage(message); }
    catch { disconnected = true; controller.abort(); }
  };
  port.onMessage.addListener((message) => {
    if (message?.type === "PING") { emit({ type: "PONG" }); return; }
    if (started) return;
    started = true;
    if (validateRuntimeMessage(message) !== "BATCH_LOOKUP") {
      emit({ type: "ERROR", error: "訊息格式無效。" }); return;
    }
    handleBatchLookup(message.numbers, emit, controller.signal)
      .then(() => emit({ type: "DONE" }))
      .catch((error) => emit({ type: "ERROR", error: safeErrorMessage(error) }));
  });
});

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

async function handleBatchLookup(numbers, emit = () => {}, signal) {
  const validation = validateBatchLookupNumbers(numbers.join("\n"));
  if (!validation.ok) return { ok: false, error: validation.message };

  const results = [];
  const searches = new Map();
  for (const number of validation.value) {
    if (signal?.aborted) break;
    try {
      results.push({ number, ok: true, result: await lookupNumber(number, searches, (source) => emit({ type: "SOURCE", number, source }), signal) });
    } catch (error) {
      results.push({ number, ok: false, error: safeErrorMessage(error) });
    }
    emit({ type: "RESULT", entry: results[results.length - 1] });
  }
  return { ok: true, results };
}

async function lookupNumber(number, searches = new Map(), onSource = () => {}, signal) {
  const galleryPayload = await fetchJson(buildGalleryApiUrl(number), "gallery", signal);
  const source = parseGalleryResponse(galleryPayload, number);
  onSource(source);
  let chineseVersions = [];
  let versionsError = null;
  try {
    const url = buildSearchApiUrl(source.searchTitle);
    const searchPayload = searches.has(url) ? searches.get(url) : await fetchJson(url, "search", signal);
    chineseVersions = findChineseVersions(searchPayload, source);
    searches.set(url, {
      result: searchPayload.result.slice(0, 25)
        .filter((item) => item && typeof item === "object")
        .map(({ id, english_title, japanese_title, num_pages }) => ({ id, english_title, japanese_title, num_pages }))
    });
  } catch (error) {
    versionsError = safeErrorMessage(error);
  }
  return { source, chineseVersions, versionsError };
}

async function fetchJson(url, kind, signal) {
  return schedule(kind, async (backoff) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = setTimeout(abort, REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      if (response.status === 429 || response.status === 503) backoff(response.headers.get("Retry-After"));
      if (response.status === 404) throw new Error("找不到這個作品。");
      if (response.status === 429) throw new Error("來源 API 已達速率限制，後續請求將等待冷卻後再送出。");
      if (!response.ok) throw new Error(`來源 API 回傳 HTTP ${response.status}。`);
      return await response.json();
    } catch (error) {
      if (error?.name === "AbortError") throw new Error(signal?.aborted ? "查詢已取消。" : "來源 API 查詢逾時。");
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }, () => signal?.aborted === true);
}

function safeErrorMessage(error) {
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  return message && message.length <= 300 ? message : "查詢失敗，請稍後再試。";
}
