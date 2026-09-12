import {
  buildSourceUrl,
  isApprovedSourceUrl,
  validateLookupNumber
} from "../core/lookup.js";
import {
  STATE_KEY,
  createInitialState,
  createLookupState,
  isSafeStoredState,
  normalizeStoredState,
  prepareStateForStorage
} from "../core/state.js";
import { buildSourceRecord, isSafeSourceRecord } from "../adapters/source/source-adapter.js";
import {
  activateNextDlsiteQuery,
  attachDlsiteTab,
  createDlsiteState,
  isApprovedDlsiteSearchUrl,
  isSafeDlsiteState,
  mergeDlsiteSnapshot
} from "../adapters/dlsite/dlsite-adapter.js";
import { validateRuntimeMessage } from "../core/message-schema.js";
import { isCurrentDlsiteMessageSender, isCurrentSourceMessageSender, isExtensionMessageSender } from "../core/message-context.js";
import { buildDiagnosticSummary, serializeDiagnosticSummary } from "../core/diagnostics.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false, error: "發生內部錯誤。" }));
  return true;
});

async function handleMessage(message, sender) {
  const messageType = validateRuntimeMessage(message);
  if (!messageType) return { ok: false, error: "訊息格式無效。" };
  if (messageType === "GET_STATE" && isExtensionSender(sender)) {
    return { ok: true, state: await getState() };
  }
  if (messageType === "GET_DIAGNOSTICS" && isExtensionSender(sender)) {
    const summary = buildDiagnosticSummary(await getState(), chrome.runtime.getManifest().version);
    return { ok: true, diagnosticText: serializeDiagnosticSummary(summary) };
  }
  if (messageType === "CLEAR_STATE" && isExtensionSender(sender)) {
    await chrome.storage.local.remove(STATE_KEY);
    return { ok: true, state: createInitialState() };
  }
  if (messageType === "START_LOOKUP" && isExtensionSender(sender)) {
    return startLookup(message.number);
  }
  if (messageType === "RETRY_SOURCE" && isExtensionSender(sender)) {
    return retrySourceCapture();
  }
  if (messageType === "SOURCE_HANDSHAKE") {
    return recordSourceHandshake(sender);
  }
  if (
    messageType === "SOURCE_SNAPSHOT"
  ) {
    return recordSourceSnapshot(message, sender);
  }
  if (messageType === "DLSITE_SNAPSHOT") return recordDlsiteSnapshot(message, sender);
  if (messageType === "STOP_DLSITE_SEARCH" && isExtensionSender(sender)) return stopDlsiteSearch();
  return { ok: false, error: "不支援或不可信的訊息。" };
}

async function getState() {
  const stored = await chrome.storage.local.get(STATE_KEY);
  const rawState = stored[STATE_KEY];
  const state = normalizeStoredState(rawState);
  if (!isSafeStoredState(rawState)) await chrome.storage.local.set({ [STATE_KEY]: state });
  return state;
}

async function persistState(state) {
  const safeState = prepareStateForStorage(state);
  await chrome.storage.local.set({ [STATE_KEY]: safeState });
  return safeState;
}

async function startLookup(rawNumber) {
  if (typeof rawNumber !== "string" || rawNumber.length > 12) return { ok: false, error: "訊息格式無效。" };
  const validation = validateLookupNumber(rawNumber);
  if (!validation.ok) return { ok: false, error: validation.message };
  const sourceUrl = buildSourceUrl(validation.value);
  const existingTabs = await chrome.tabs.query({ url: sourceUrl });
  const tab = existingTabs[0] || (await chrome.tabs.create({ url: sourceUrl, active: true }));
  if (existingTabs[0]) await chrome.tabs.update(tab.id, { active: true });
  const state = await persistState(createLookupState(await getState(), validation.value, tab.id));
  return { ok: true, state };
}

async function recordSourceHandshake(sender) {
  const state = await getState();
  if (!isCurrentSourceTab(sender, state)) return { ok: false, error: "來源分頁驗證失敗。" };
  let nextState = {
    ...state,
    currentLookup: { ...state.currentLookup, sourceTabId: sender.tab.id, status: "source_connected" },
  };
  nextState = await persistState(nextState);
  return { ok: true };
}

async function recordSourceSnapshot(message, sender) {
  const state = await getState();
  if (!isCurrentSourceTab(sender, state) || message.number !== state.currentLookup.number || message.sourceUrl !== state.currentLookup.sourceUrl) {
    return { ok: false, error: "來源分頁與目前查詢不一致。" };
  }
  let source;
  try {
    source = buildSourceRecord(message);
  } catch {
    return { ok: false, error: "來源擷取資料無效。" };
  }
  if (!isSafeSourceRecord(source)) return { ok: false, error: "來源擷取資料無效。" };
  const nextState = {
    ...state,
    currentLookup: {
      ...state.currentLookup,
      sourceTabId: sender.tab.id,
      status: source.status === "success" ? "source_captured" : source.status,
      source,
      dlsite: source.status === "success" ? createDlsiteState(source) : null,
    },
  };
  if (nextState.currentLookup.dlsite?.status === "pending") nextState = await openNextDlsiteQuery(nextState);
  nextState = await persistState(nextState);
  return { ok: true, state: nextState };
}

async function recordDlsiteSnapshot(message, sender) {
  const state = await getState();
  const dlsite = state.currentLookup?.dlsite;
  if (!isCurrentDlsiteMessageSender(sender, state, chrome.runtime.id) || !dlsite || message.queryUrl !== dlsite.activeUrl) {
    return { ok: false, error: "DLsite 分頁與目前查詢不一致。" };
  }
  let nextDlsite;
  try {
    nextDlsite = mergeDlsiteSnapshot(dlsite, message.snapshot);
  } catch {
    return { ok: false, error: "DLsite 候選資料無效。" };
  }
  let nextState = { ...state, currentLookup: { ...state.currentLookup, dlsite: nextDlsite } };
  if (nextDlsite.status === "pending") nextState = await openNextDlsiteQuery(nextState);
  nextState = await persistState(nextState);
  return { ok: true, state: nextState };
}

async function stopDlsiteSearch() {
  const state = await getState();
  const dlsite = state.currentLookup?.dlsite;
  if (!isSafeDlsiteState(dlsite) || !["pending", "searching"].includes(dlsite.status)) {
    return { ok: false, error: "沒有可停止的 DLsite 搜尋。" };
  }
  const nextState = {
    ...state,
    currentLookup: { ...state.currentLookup, dlsite: { ...dlsite, status: "stopped", activeQueryIndex: null, activeUrl: null, activeTabId: null } }
  };
  const savedState = await persistState(nextState);
  return { ok: true, state: savedState };
}

async function openNextDlsiteQuery(state) {
  const active = activateNextDlsiteQuery(state.currentLookup?.dlsite);
  if (!active) return state;
  const pendingState = { ...state, currentLookup: { ...state.currentLookup, dlsite: active } };
  const savedPendingState = await persistState(pendingState);
  let tab;
  try {
    tab = await chrome.tabs.create({ url: active.activeUrl, active: true });
  } catch {
    return {
      ...savedPendingState,
      currentLookup: { ...savedPendingState.currentLookup, dlsite: { ...active, status: "error", activeQueryIndex: null, activeUrl: null, error: { code: "DLSITE_NETWORK_ERROR", message: "無法開啟 DLsite 搜尋分頁。", nextAction: "確認網路後重新搜尋。", status: "error" } } }
    };
  }
  return { ...savedPendingState, currentLookup: { ...savedPendingState.currentLookup, dlsite: attachDlsiteTab(active, tab.id) } };
}

async function retrySourceCapture() {
  const state = await getState();
  const lookup = state.currentLookup;
  if (!lookup || !Number.isInteger(lookup.sourceTabId)) {
    return { ok: false, error: "沒有可重新擷取的來源分頁。" };
  }
  let tab;
  try {
    tab = await chrome.tabs.get(lookup.sourceTabId);
  } catch {
    return { ok: false, error: "來源分頁已關閉，請重新開啟查詢。" };
  }
  if (!isApprovedSourceUrl(tab.url) || tab.url !== lookup.sourceUrl) {
    return { ok: false, error: "來源分頁驗證失敗。" };
  }
  try {
    await chrome.tabs.sendMessage(lookup.sourceTabId, { type: "SOURCE_RETRY" });
  } catch {
    return { ok: false, error: "來源分頁尚未準備好，請重新整理後再試。" };
  }
  return { ok: true };
}

function isCurrentSourceTab(sender, state) {
  return isCurrentSourceMessageSender(sender, state, chrome.runtime.id);
}

function isExtensionSender(sender) {
  return isExtensionMessageSender(sender, chrome.runtime.id, chrome.runtime.getURL(""));
}
