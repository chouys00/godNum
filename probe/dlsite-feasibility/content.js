chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "DLSITE_PROBE_CAPTURE") return;
  try {
    const snapshot = globalThis.DlsiteFeasibilityProbe.capturePage(document, location.href);
    if (!globalThis.DlsiteFeasibilityProbe.isSafeSnapshot(snapshot)) throw new TypeError("unsafe snapshot");
    sendResponse({ ok: true, snapshot });
  } catch {
    sendResponse({ ok: false, error: "擷取器發生未預期錯誤。" });
  }
});
