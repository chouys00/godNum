const form = document.querySelector("#lookup-form");
const input = document.querySelector("#lookup-number");
const status = document.querySelector("#status");
const clearButton = document.querySelector("#clear-history");
const diagnosticsButton = document.querySelector("#copy-diagnostics");
const sourceSection = document.querySelector("#source-result");
const sourceFields = document.querySelector("#source-fields");
const sourceDetail = document.querySelector("#source-detail");
const retryButton = document.querySelector("#retry-source");
const dlsiteSection = document.querySelector("#dlsite-result");
const dlsiteDetail = document.querySelector("#dlsite-detail");
const dlsiteCandidates = document.querySelector("#dlsite-candidates");
const stopDlsiteButton = document.querySelector("#stop-dlsite");

function showStatus(message, kind = "info") {
  const prefix = kind === "error" ? "錯誤" : "狀態";
  status.textContent = `${prefix}：${message}`;
  status.dataset.kind = kind;
}

async function send(message) {
  return chrome.runtime.sendMessage(message);
}

function renderState(state) {
  const lookup = state?.currentLookup;
  if (!lookup) {
    input.value = "";
    sourceSection.hidden = true;
    dlsiteSection.hidden = true;
    return;
  }
  input.value = lookup.number;
  if (!lookup.source) {
    showStatus(`已開啟 ${lookup.number} 的來源頁，等待資料擷取。`);
    sourceSection.hidden = true;
    dlsiteSection.hidden = true;
    return;
  }
  renderSource(lookup.source);
  renderDlsite(lookup.dlsite);
}

function renderDlsite(dlsite) {
  if (!dlsite) {
    dlsiteSection.hidden = true;
    return;
  }
  dlsiteSection.hidden = false;
  dlsiteCandidates.replaceChildren();
  const completed = dlsite.queries?.filter((item) => item.status !== "pending") || [];
  dlsiteDetail.textContent = dlsite.error?.message || `已處理 ${completed.length}／${dlsite.queries?.length || 0} 個固定查詢，候選 ${dlsite.candidates?.length || 0} 筆。`;
  for (const candidate of dlsite.candidates || []) {
    const item = document.createElement("li");
    item.textContent = `${candidate.productId}：${candidate.title}`;
    dlsiteCandidates.append(item);
  }
  stopDlsiteButton.hidden = !["pending", "searching"].includes(dlsite.status);
}

function renderSource(source) {
  sourceSection.hidden = false;
  sourceFields.replaceChildren();
  const data = source.data || {};
  addField("日文標題", data.titleJapanese);
  addField("英文標題", data.titleEnglish);
  addField("顯示標題", data.titleDisplay);
  addField("作者", Array.isArray(data.authors) ? data.authors.join("、") : null);
  addField("社團", Array.isArray(data.groups) ? data.groups.join("、") : null);
  addField("頁數", Number.isInteger(data.pageCount) ? String(data.pageCount) : null);
  addField("來源網址", source.sourceUrl);

  if (source.status === "success") {
    showStatus("來源資料擷取完成。");
    sourceDetail.textContent = `使用策略：${source.strategiesTried.join("、") || "無"}`;
    return;
  }
  showStatus(source.error?.message || "來源資料擷取失敗。", "error");
  sourceDetail.textContent = source.error?.nextAction || "請重新整理來源分頁後再試。";
}

function addField(label, value) {
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = typeof value === "string" && value.length > 0 ? value : "未提供";
  sourceFields.append(term, description);
}

async function restoreState() {
  const response = await send({ type: "GET_STATE" });
  if (!response.ok) {
    showStatus(response.error || "無法讀取本機狀態。", "error");
    return;
  }
  renderState(response.state);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const response = await send({ type: "START_LOOKUP", number: input.value });
  if (!response.ok) {
    input.setAttribute("aria-invalid", "true");
    showStatus(response.error, "error");
    return;
  }
  input.setAttribute("aria-invalid", "false");
  renderState(response.state);
});

retryButton.addEventListener("click", async () => {
  const response = await send({ type: "RETRY_SOURCE" });
  if (!response.ok) {
    showStatus(response.error, "error");
    return;
  }
  showStatus("已要求來源分頁重新擷取資料。");
});

clearButton.addEventListener("click", async () => {
  const response = await send({ type: "CLEAR_STATE" });
  if (!response.ok) {
    showStatus(response.error, "error");
    return;
  }
  input.value = "";
  input.setAttribute("aria-invalid", "false");
  sourceSection.hidden = true;
  dlsiteSection.hidden = true;
  showStatus("已清除本機紀錄。");
});

diagnosticsButton.addEventListener("click", async () => {
  const response = await send({ type: "GET_DIAGNOSTICS" });
  if (!response.ok) {
    showStatus(response.error || "無法建立診斷摘要。", "error");
    return;
  }
  if (typeof response.diagnosticText !== "string" || response.diagnosticText.length > 2000) {
    showStatus("診斷摘要格式無效。", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(response.diagnosticText);
    showStatus("已複製不含作品內容的診斷摘要。");
  } catch {
    showStatus("無法寫入剪貼簿，請確認瀏覽器權限後重試。", "error");
  }
});

stopDlsiteButton.addEventListener("click", async () => {
  const response = await send({ type: "STOP_DLSITE_SEARCH" });
  if (!response.ok) {
    showStatus(response.error, "error");
    return;
  }
  renderState(response.state);
  showStatus("已停止 DLsite 搜尋。");
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.lookupState) {
    restoreState().catch(() => showStatus("無法讀取本機狀態。", "error"));
  }
});

restoreState().catch(() => showStatus("無法讀取本機狀態。", "error"));
