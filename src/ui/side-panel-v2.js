import { createOfflineTranslator, translateWithPreparedTranslator } from "../core/offline-translation.js";
import { validateBatchLookupNumbers } from "../core/lookup.js";

const form = document.querySelector("#lookup-form");
const input = document.querySelector("#lookup-numbers");
const lookupButton = document.querySelector("#lookup-button");
const status = document.querySelector("#status");
const resultsSection = document.querySelector("#batch-results");
const resultList = document.querySelector("#batch-result-list");

function showStatus(message, kind = "info") {
  status.textContent = `${kind === "error" ? "錯誤" : "狀態"}：${message}`;
  status.dataset.kind = kind;
}

function prepareTranslator(language) {
  return createOfflineTranslator(language).then((translator) => ({ translator }), (error) => ({ error }));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const validation = validateBatchLookupNumbers(input.value);
  if (!validation.ok) {
    input.setAttribute("aria-invalid", "true");
    showStatus(validation.message, "error");
    return;
  }
  input.setAttribute("aria-invalid", "false");
  clearResults();

  // Translator.create 必須由使用者操作觸發；兩個語言組合都要在第一次 await 前建立。
  const translatorPromises = { ja: prepareTranslator("ja"), en: prepareTranslator("en") };
  lookupButton.disabled = true;
  showStatus(`正在依序查詢 ${validation.value.length} 組來源資料與中文版本；10 組通常約需一分鐘，來源較慢時可能更久。`);
  try {
    const response = await chrome.runtime.sendMessage({ type: "BATCH_LOOKUP", numbers: validation.value });
    if (!response?.ok || !Array.isArray(response.results)) {
      input.setAttribute("aria-invalid", "true");
      showStatus(response?.error || "批次查詢失敗。", "error");
      return;
    }
    await renderBatchResults(response.results, translatorPromises);
    const completed = response.results.filter((entry) => entry.ok).length;
    showStatus(`批次完成：${completed}/${response.results.length} 組已取得資料。產品未保存本次查詢。`);
  } catch (error) {
    showStatus(error?.message || "批次查詢失敗。", "error");
  } finally {
    lookupButton.disabled = false;
    destroyPreparedTranslators(translatorPromises);
  }
});

async function renderBatchResults(entries, translatorPromises) {
  resultsSection.hidden = false;
  const translationTasks = [];
  for (const entry of entries) {
    const card = document.createElement("article");
    card.className = "batch-result";
    const heading = document.createElement("h3");
    heading.textContent = `號碼 ${entry.number}`;
    card.append(heading);
    if (!entry.ok) {
      addMessage(card, entry.error || "查詢失敗。", "error");
      resultList.append(card);
      continue;
    }
    renderSource(card, entry.result.source);
    renderVersions(card, entry.result.chineseVersions, entry.result.versionsError);
    const translation = renderTranslationArea(card);
    resultList.append(card);
    translationTasks.push({ source: entry.result.source, ...translation });
  }
  for (let index = 0; index < translationTasks.length; index += 1) {
    showStatus(`正在翻譯 ${index + 1}/${translationTasks.length} 組原始標題…`);
    await renderTranslation(translationTasks[index], translatorPromises);
  }
}

function renderSource(card, source) {
  const heading = document.createElement("h4");
  const fields = document.createElement("dl");
  heading.textContent = "作品資料";
  fields.className = "source-fields";
  addSearchField(fields, "原始標題", source.translationTitle);
  addSearchField(fields, "作者／署名（原文）", source.credit || source.artists?.join("、"));
  addSearchField(fields, "社團", source.groups?.join("、"));
  addLinkField(fields, "來源頁", source.sourceUrl, source.sourceUrl);
  card.append(heading, fields);
}

function renderTranslationArea(card) {
  const section = document.createElement("section");
  const heading = document.createElement("h4");
  const translationStatus = document.createElement("p");
  const translatedTitle = document.createElement("p");
  const note = document.createElement("p");
  const retryButton = document.createElement("button");
  section.className = "translation-result";
  heading.textContent = "本機離線翻譯";
  translationStatus.setAttribute("role", "status");
  translationStatus.setAttribute("aria-live", "polite");
  translationStatus.textContent = "正在準備本機語言包…";
  note.className = "note";
  note.textContent = "此名稱是機器直譯，不代表正式譯名或既有中文別名。";
  retryButton.type = "button";
  retryButton.textContent = "重試本機翻譯";
  retryButton.hidden = true;
  section.append(heading, translationStatus, translatedTitle, note, retryButton);
  card.append(section);
  return { translationStatus, translatedTitle, retryButton };
}

async function renderTranslation(task, translatorPromises) {
  const { source, translationStatus, translatedTitle, retryButton } = task;
  const prepared = await translatorPromises[source.translationLanguage];
  if (prepared?.error) {
    translationStatus.textContent = prepared.error.message || "無法準備本機翻譯器。";
    attachRetryTranslation(task);
    return;
  }
  try {
    translatedTitle.textContent = await translateWithPreparedTranslator(prepared.translator, source.translationTitle);
    translationStatus.textContent = `由 ${source.translationLanguage === "ja" ? "日文" : "英文"} 離線翻譯為繁體中文。`;
    retryButton.hidden = true;
  } catch (error) {
    translationStatus.textContent = error?.message || "本機翻譯失敗。";
    attachRetryTranslation(task);
  }
}

function renderVersions(card, versions, error) {
  const section = document.createElement("section");
  const heading = document.createElement("h4");
  const message = document.createElement("p");
  const links = document.createElement("ul");
  section.className = "chinese-versions";
  heading.textContent = "中文版本";
  section.append(heading, message, links);
  if (error) message.textContent = `中文版本搜尋失敗：${error}`;
  else if (!Array.isArray(versions) || versions.length === 0) message.textContent = "沒有找到通過同作核對的中文版本。";
  else {
    message.textContent = `找到 ${versions.length} 個通過同作核對的中文版本：`;
    for (const version of versions) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = version.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = `${version.id}：${version.title}`;
      item.append(link);
      links.append(item);
    }
  }
  card.append(section);
}

function addSearchField(fields, label, value) {
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  const searchText = typeof value === "string" ? value.trim() : "";
  term.textContent = label;
  if (!searchText) {
    description.textContent = "未提供";
  } else {
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = searchText;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      chrome.search.query({ text: searchText, disposition: "NEW_TAB" });
    });
    description.append(link);
  }
  fields.append(term, description);
}

function addLinkField(fields, label, url, text) {
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  const link = document.createElement("a");
  term.textContent = label;
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = text;
  description.append(link);
  fields.append(term, description);
}

function addMessage(parent, message, kind) {
  const paragraph = document.createElement("p");
  paragraph.textContent = `${kind === "error" ? "錯誤" : "狀態"}：${message}`;
  parent.append(paragraph);
}

function clearResults() {
  resultList.replaceChildren();
  resultsSection.hidden = true;
}

function attachRetryTranslation(task) {
  const { source, translationStatus, translatedTitle, retryButton } = task;
  retryButton.hidden = false;
  retryButton.onclick = async () => {
    retryButton.disabled = true;
    translationStatus.textContent = "正在準備本機語言包…";
    let translator;
    try {
      translator = await createOfflineTranslator(source.translationLanguage, (progress) => {
        translationStatus.textContent = Number.isInteger(progress)
          ? `第一次使用需下載免費語言包：${progress}%`
          : "正在準備本機語言包…";
      });
      translatedTitle.textContent = await translateWithPreparedTranslator(translator, source.translationTitle);
      translationStatus.textContent = `由 ${source.translationLanguage === "ja" ? "日文" : "英文"} 離線翻譯為繁體中文。`;
      retryButton.hidden = true;
    } catch (error) {
      translationStatus.textContent = error?.message || "本機翻譯失敗。";
    } finally {
      try { translator?.destroy?.(); } catch { /* Ignore cleanup failures. */ }
      retryButton.disabled = false;
    }
  };
}

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
