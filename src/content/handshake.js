chrome.runtime.sendMessage({ type: "SOURCE_HANDSHAKE" }).catch(() => {
  // The extension may have reloaded while this page was open.
});
