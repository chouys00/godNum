import { validateBatchLookupNumbers } from "../core/lookup.js";

const form = document.querySelector("#lookup-form");
const input = document.querySelector("#lookup-numbers");
const lookupButton = document.querySelector("#lookup-button");
const status = document.querySelector("#status");
const resultList = document.querySelector("#batch-result-list");
const cards = new Map();

function showStatus(message, kind = "info") {
  status.textContent = `${kind === "error" ? "錯誤" : "狀態"}：${message}`;
  status.dataset.kind = kind;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (lookupButton.disabled) return;
  const validation = validateBatchLookupNumbers(input.value);
  if (!validation.ok) {
    input.setAttribute("aria-invalid", "true");
    showStatus(validation.message, "error");
    return;
  }
  input.setAttribute("aria-invalid", "false");
  clearResults();

  lookupButton.disabled = true;
  showStatus(`正在查詢 ${validation.value.length} 組；取得資料後會立即顯示，中文版本隨後補上。`);
  try {
    const completed = await streamResults(validation.value);
    showStatus(`查詢完成：${completed}/${validation.value.length} 組已取得資料。`);
  } catch (error) {
    showStatus(error?.message || "查詢失敗。", "error");
  } finally {
    lookupButton.disabled = false;
  }
});

function streamResults(numbers) {
  return new Promise((resolve, reject) => {
    const port = chrome.runtime.connect({ name: "lookup" });
    let finished = false;
    let completed = 0;
    let processed = 0;
    // Chrome 114 requires messages (an open port alone is insufficient) to
    // keep a long rate-limited batch alive. No network traffic is generated.
    const heartbeat = setInterval(() => {
      try { port.postMessage({ type: "PING" }); }
      catch { finish(new Error("查詢連線已中斷，請重新查詢。")); }
    }, 20000);
    function finish(error) {
      if (finished) return;
      finished = true;
      clearInterval(heartbeat);
      window.removeEventListener("pagehide", close);
      port.disconnect();
      for (const card of cards.values()) {
        const pending = card.querySelector(".versions-pending");
        if (pending) pending.textContent = "中文版本查詢已中斷，請重新查詢。";
      }
      if (error) reject(error); else resolve(completed);
    }
    const close = () => finish(new Error("查詢已取消。"));
    window.addEventListener("pagehide", close, { once: true });
    port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      finish(new Error(error?.message || "查詢連線已中斷，請重新查詢。"));
    });
    port.onMessage.addListener((message) => {
      if (finished) return;
      if (message.type === "SOURCE" && numbers.includes(message.number)) {
        renderBatchResults([{ number: message.number, ok: true, pending: true, result: { source: message.source } }]);
      } else if (message.type === "RESULT" && numbers.includes(message.entry?.number)) {
        renderBatchResults([message.entry]);
        processed += 1;
        if (message.entry.ok) completed += 1;
        showStatus(`已完成 ${processed}/${numbers.length} 組；其餘請求依來源速率限制排程。`);
      } else if (message.type === "DONE") finish();
      else if (message.type === "ERROR") finish(new Error(message.error || "查詢失敗。"));
    });
    try { port.postMessage({ type: "BATCH_LOOKUP", numbers }); }
    catch (error) { finish(error); }
  });
}

function renderBatchResults(entries) {
  resultList.hidden = false;
  for (const entry of entries) {
    let card = cards.get(entry.number);
    if (!card) {
      card = document.createElement("article");
      cards.set(entry.number, card);
      resultList.append(card);
    }
    // Once source fields are visible, keep their nodes and keyboard focus.
    const oldVersions = card.querySelector(".chinese-versions");
    if (oldVersions && entry.ok && !entry.pending) {
      oldVersions.remove();
      renderVersions(card, entry.result.chineseVersions, entry.result.versionsError);
      continue;
    }
    card.replaceChildren();
    card.className = "batch-result";
    const heading = document.createElement("h3");
    heading.textContent = `作品資料（${entry.number}）`;
    card.append(heading);
    if (!entry.ok) {
      addMessage(card, entry.error || "查詢失敗。", "error");
      continue;
    }
    renderSource(card, entry.result.source);
    renderVersions(card, entry.result.chineseVersions, entry.result.versionsError, entry.pending);
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

function renderVersions(card, versions, error, pending = false) {
  const section = document.createElement("section");
  const heading = document.createElement("h4");
  const message = document.createElement("p");
  const links = document.createElement("ul");
  section.className = "chinese-versions";
  heading.textContent = "中文版本";
  section.append(heading, message, links);
  if (pending) {
    message.className = "versions-pending";
    message.textContent = "正在查詢中文版本…";
  }
  else if (error) message.textContent = `中文版本搜尋失敗：${error}`;
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
  cards.clear();
  resultList.replaceChildren();
  resultList.hidden = true;
}
