import { validateBatchLookupNumbers } from "../core/lookup.js";

const form = document.querySelector("#lookup-form");
const input = document.querySelector("#lookup-numbers");
const lookupButton = document.querySelector("#lookup-button");
const status = document.querySelector("#status");
const resultList = document.querySelector("#batch-result-list");

function showStatus(message, kind = "info") {
  status.textContent = `${kind === "error" ? "錯誤" : "狀態"}：${message}`;
  status.dataset.kind = kind;
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

  lookupButton.disabled = true;
  showStatus(`正在依序查詢 ${validation.value.length} 組來源資料與中文版本；10 組通常約需一分鐘，來源較慢時可能更久。`);
  try {
    const response = await chrome.runtime.sendMessage({ type: "BATCH_LOOKUP", numbers: validation.value });
    if (!response?.ok || !Array.isArray(response.results)) {
      input.setAttribute("aria-invalid", "true");
      showStatus(response?.error || "查詢失敗。", "error");
      return;
    }
    renderBatchResults(response.results);
    const completed = response.results.filter((entry) => entry.ok).length;
    showStatus(`查詢完成：${completed}/${response.results.length} 組已取得資料。`);
  } catch (error) {
    showStatus(error?.message || "查詢失敗。", "error");
  } finally {
    lookupButton.disabled = false;
  }
});

function renderBatchResults(entries) {
  resultList.hidden = false;
  for (const entry of entries) {
    const card = document.createElement("article");
    card.className = "batch-result";
    const heading = document.createElement("h3");
    heading.textContent = `作品資料（${entry.number}）`;
    card.append(heading);
    if (!entry.ok) {
      addMessage(card, entry.error || "查詢失敗。", "error");
      resultList.append(card);
      continue;
    }
    renderSource(card, entry.result.source);
    renderVersions(card, entry.result.chineseVersions, entry.result.versionsError);
    resultList.append(card);
  }
}

function renderSource(card, source) {
  const fields = document.createElement("dl");
  fields.className = "source-fields";
  addSearchField(fields, "原始標題", source.searchTitle);
  addSearchField(fields, "作者／署名（原文）", source.credit || source.artists?.join("、"));
  addSearchField(fields, "社團", source.groups?.join("、"));
  addLinkField(fields, "來源頁", source.sourceUrl, source.sourceUrl);
  card.append(fields);
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
    message.remove();
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
    const openSearch = (event) => {
      event.preventDefault();
      chrome.search.query({ text: searchText, disposition: "NEW_TAB" });
    };
    link.addEventListener("click", openSearch);
    link.addEventListener("auxclick", (event) => {
      if (event.button === 1) openSearch(event);
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
  resultList.hidden = true;
}
