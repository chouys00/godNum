(() => {
  const SEARCH_PATH = "/maniax/fsr/=/keyword/";
  const { extractSearchSnapshot } = globalThis.GodNumberDlsiteExtractors;

  async function capture() {
    const url = new URL(location.href);
    if (url.origin !== "https://www.dlsite.com" || !url.pathname.startsWith(SEARCH_PATH) || url.search || url.hash) return;
    const snapshot = extractSearchSnapshot(document, location.href);
    await chrome.runtime.sendMessage({ type: "DLSITE_SNAPSHOT", queryUrl: location.href, snapshot });
  }

  capture().catch(() => {
    // Only a bounded candidate snapshot is sent to the background worker.
  });
})();
