import { createOfflineTranslator, translateWithPreparedTranslator } from "../core/offline-translation.js";
import { validateLookupNumber } from "../core/lookup.js";

const form = document.querySelector("#lookup-form");
const input = document.querySelector("#lookup-number");
const lookupButton = document.querySelector("#lookup-button");
const status = document.querySelector("#status");
const resultSection = document.querySelector("#result");
const sourceFields = document.querySelector("#source-fields");
const translationSection = document.querySelector("#translation-result");
const translationStatus = document.querySelector("#translation-status");
const translatedTitle = document.querySelector("#translated-title");
const retryTranslationButton = document.querySelector("#retry-translation");
const versionsSection = document.querySelector("#chinese-versions");
const versionsStatus = document.querySelector("#versions-status");
const versionLinks = document.querySelector("#version-links");
let currentSource = null;

function showStatus(message, kind = "info") {
  status.textContent = `${kind === "error" ? "錯誤" : "狀態"}：${message}`;
  status.dataset.kind = kind;
}

function prepareTranslator(language) {
  return createOfflineTranslator(language, (progress) => {
    translationStatus.textContent = Number.isInteger(progress)
      ? `第一次使用需下載免費語言包：${progress}%`
      : "正在準備本機語言包…";
  }).then((translator) => ({ translator }), (error) => ({ error }));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const validation = validateLookupNumber(input.value);
  if (!validation.ok) {
    input.setAttribute("aria-invalid", "true");
    showStatus(validation.message, "error");
    return;
  }
  input.setAttribute("aria-invalid", "false");
  clearResults();

  // Translator.create 必須由使用者操作觸發。兩個 Promise 都要在第一次 await 前建立。
  const translatorPromises = {
    ja: prepareTranslator("ja"),
    en: prepareTranslator("en")
  };

  lookupButton.disabled = true;
  showStatus("正在查詢來源 metadata 與中文版本…");
  translationSection.hidden = false;
  translationStatus.textContent = "正在準備本機離線翻譯…";
  try {
    const response = await chrome.runtime.sendMessage({ type: "LOOKUP", number: validation.value });
    if (!response?.ok) {
      input.setAttribute("aria-invalid", "true");
      showStatus(response?.error || "查詢失敗。", "error");
      return;
    }
    renderSource(response.result.source);
    currentSource = response.result.source;
    renderVersions(response.result.chineseVersions, response.result.versionsError);
    await renderTranslation(response.result.source, translatorPromises);
    showStatus("查詢與本機翻譯完成。產品未保存本次查詢。");
  } catch (error) {
    showStatus(error?.message || "查詢失敗。", "error");
  } finally {
    lookupButton.disabled = false;
    destroyPreparedTranslators(translatorPromises);
  }
});

function renderSource(source) {
  resultSection.hidden = false;
  addField("原始標題", source.translationTitle);
  addField("作者／署名（原文）", source.credit || source.artists?.join("、"));
  addField("社團", source.groups?.join("、"));
  addLinkField("來源頁", source.sourceUrl, source.sourceUrl);
}

async function renderTranslation(source, translatorPromises) {
  translationSection.hidden = false;
  translatedTitle.textContent = "";
  const prepared = await translatorPromises[source.translationLanguage];
  if (prepared?.error) {
    translationStatus.textContent = prepared.error.message || "無法準備本機翻譯器。";
    retryTranslationButton.hidden = false;
    return;
  }
  try {
    translatedTitle.textContent = await translateWithPreparedTranslator(prepared.translator, source.translationTitle);
    translationStatus.textContent = `由 ${source.translationLanguage === "ja" ? "日文" : "英文"} 離線翻譯為繁體中文。`;
    retryTranslationButton.hidden = true;
  } catch (error) {
    translationStatus.textContent = error?.message || "本機翻譯失敗。";
    retryTranslationButton.hidden = false;
  }
}

function renderVersions(versions, error) {
  versionsSection.hidden = false;
  versionLinks.replaceChildren();
  if (error) {
    versionsStatus.textContent = `中文版本搜尋失敗：${error}`;
    return;
  }
  if (!Array.isArray(versions) || versions.length === 0) {
    versionsStatus.textContent = "沒有找到通過同作核對的中文版本。";
    return;
  }
  versionsStatus.textContent = `找到 ${versions.length} 個通過同作核對的中文版本：`;
  for (const version of versions) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = version.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `${version.id}：${version.title}`;
    item.append(link);
    versionLinks.append(item);
  }
}

function addField(label, value) {
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = typeof value === "string" && value.trim() ? value : "未提供";
  sourceFields.append(term, description);
}

function addLinkField(label, url, text) {
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  const link = document.createElement("a");
  term.textContent = label;
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = text;
  description.append(link);
  sourceFields.append(term, description);
}

function clearResults() {
  sourceFields.replaceChildren();
  versionLinks.replaceChildren();
  translatedTitle.textContent = "";
  retryTranslationButton.hidden = true;
  currentSource = null;
  resultSection.hidden = true;
  translationSection.hidden = true;
  versionsSection.hidden = true;
}

retryTranslationButton.addEventListener("click", async () => {
  if (!currentSource) return;
  retryTranslationButton.disabled = true;
  translationStatus.textContent = "正在準備本機語言包…";
  let translator;
  try {
    translator = await createOfflineTranslator(currentSource.translationLanguage, (progress) => {
      translationStatus.textContent = Number.isInteger(progress)
        ? `第一次使用需下載免費語言包：${progress}%`
        : "正在準備本機語言包…";
    });
    translatedTitle.textContent = await translateWithPreparedTranslator(translator, currentSource.translationTitle);
    translationStatus.textContent = `由 ${currentSource.translationLanguage === "ja" ? "日文" : "英文"} 離線翻譯為繁體中文。`;
    retryTranslationButton.hidden = true;
  } catch (error) {
    translationStatus.textContent = error?.message || "本機翻譯失敗。";
  } finally {
    try { translator?.destroy?.(); } catch { /* Ignore cleanup failures. */ }
    retryTranslationButton.disabled = false;
  }
});

async function destroyPreparedTranslators(promises) {
  for (const promise of Object.values(promises)) {
    const prepared = await promise;
    try {
      prepared?.translator?.destroy?.();
    } catch {
      // Translator cleanup failure must not alter the completed lookup result.
    }
  }
}
