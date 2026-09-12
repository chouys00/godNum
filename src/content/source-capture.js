(() => {
  const SOURCE_URL = /^https:\/\/nhentai\.net\/g\/([0-9]{6})\/$/;
  const MAX_SCRIPT_LENGTH = 24000;
  const {
    domSnapshot: extractDomSnapshot,
    fromGallery,
    isGalleryStructuredData,
    pageOutcome: readPageOutcome,
    structuredCandidates
  } = globalThis.GodNumberSourceExtractors;

  async function apiSnapshot(number) {
    const url = new URL(`/api/gallery/${number}`, location.origin);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(url, { credentials: "same-origin", signal: controller.signal });
    } catch {
      return { sourceType: "same_origin_api", values: {}, locators: {}, outcome: { networkError: true } };
    }
    try {
      if (!response.ok) {
        return { sourceType: "same_origin_api", values: {}, locators: {}, outcome: { httpStatus: response.status } };
      }
      const json = await response.json();
      return fromGallery(json, "same_origin_api", "api.gallery");
    } catch {
      return { sourceType: "same_origin_api", values: {}, locators: {}, outcome: { parserError: true } };
    } finally {
      clearTimeout(timeout);
    }
  }

  function embeddedSnapshot() {
    const outcome = pageOutcome();
    if (outcome.manualAction || outcome.notFound) {
      return { sourceType: "embedded_structured_data", values: {}, locators: {}, outcome };
    }
    for (const script of document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]')) {
      const raw = script.textContent || "";
      if (!raw || raw.length > MAX_SCRIPT_LENGTH) continue;
      try {
        const parsed = JSON.parse(raw);
        const candidate = structuredCandidates(parsed).find((item) =>
          isGalleryStructuredData(item, SOURCE_URL.exec(location.href)?.[1] || "", location.href)
        );
        if (candidate) {
          return fromGallery(candidate, "embedded_structured_data", `script[type=${script.type}]`);
        }
      } catch {
        // Invalid embedded JSON is ignored; the later strategies remain available.
      }
    }
    return { sourceType: "embedded_structured_data", values: {}, locators: {} };
  }

  function metadataSnapshot() {
    const outcome = pageOutcome();
    if (outcome.manualAction || outcome.notFound) {
      return { sourceType: "standard_metadata", values: {}, locators: {}, outcome };
    }
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content?.trim() || null;
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.content?.trim() || null;
    const display = hasPageIdentity() ? ogTitle || twitterTitle : null;
    return {
      sourceType: "standard_metadata",
      values: { titleDisplay: display },
      locators: display
        ? { titleDisplay: ogTitle ? 'meta[property="og:title"]@content' : 'meta[name="twitter:title"]@content' }
        : {},
      outcome
    };
  }

  function domSnapshot() {
    return extractDomSnapshot(document, pageOutcome());
  }

  function pageOutcome() {
    return readPageOutcome(document);
  }

  function hasPageIdentity() {
    if (document.querySelector("#info, [data-title-display]")) return true;
    for (const selector of ['link[rel="canonical"]', 'meta[property="og:url"]']) {
      const node = document.querySelector(selector);
      const value = node?.href || node?.content;
      if (value) {
        try {
          if (new URL(value, location.href).href === location.href) return true;
        } catch {
          // Invalid identity metadata is ignored.
        }
      }
    }
    return false;
  }

  async function capture() {
    const match = SOURCE_URL.exec(location.href);
    if (!match) return;
    const number = match[1];
    const handshake = await chrome.runtime.sendMessage({ type: "SOURCE_HANDSHAKE" });
    if (!handshake?.ok) return;
    const snapshots = [await apiSnapshot(number), embeddedSnapshot(), metadataSnapshot(), domSnapshot()];
    await chrome.runtime.sendMessage({ type: "SOURCE_SNAPSHOT", number, sourceUrl: location.href, snapshots });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const expectedSenderUrl = chrome.runtime.getURL("src/background/service-worker.js");
    if (
      sender.id !== chrome.runtime.id ||
      sender.url !== expectedSenderUrl ||
      !message ||
      Object.keys(message).length !== 1 ||
      message.type !== "SOURCE_RETRY"
    ) return;
    capture().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  });

  capture().catch(() => {
    // The worker records only a validated, minimal snapshot; no page text is persisted here.
  });
})();
