const titleInput = document.querySelector("#title");
const sectionInput = document.querySelector("#section");
const openSearchButton = document.querySelector("#open-search");
const captureButton = document.querySelector("#capture");
const status = document.querySelector("#status");
const output = document.querySelector("#output");

openSearchButton.addEventListener("click", async () => {
  try {
    const url = globalThis.DlsiteFeasibilityProbe.buildSearchUrl(titleInput.value, sectionInput.value);
    await chrome.tabs.create({ url, active: true });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "無法建立搜尋網址。";
  }
});

captureButton.addEventListener("click", async () => {
  status.textContent = "正在擷取目前分頁⋯⋯";
  output.value = "";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://www.dlsite.com/")) {
    status.textContent = "請先切換到 DLsite 搜尋頁或商品頁。";
    return;
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "DLSITE_PROBE_CAPTURE" });
    if (!response?.ok) throw new Error(response?.error || "未取得擷取結果。");
    if (!globalThis.DlsiteFeasibilityProbe.isSafeSnapshot(response.snapshot)) throw new Error("擷取結果格式無效。");
    output.value = JSON.stringify(response.snapshot, null, 2);
    status.textContent = `完成：${response.snapshot.pageType}／${response.snapshot.status}`;
  } catch {
    status.textContent = "無法連線到內容腳本。重新整理 DLsite 分頁後再試。";
  }
});
