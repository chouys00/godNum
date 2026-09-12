(() => {
  const PRODUCT_PATH = /^\/maniax\/work\/=\/product_id\/([A-Z]{2}[0-9]{5,})\.html$/;
  const MAX_CANDIDATES = 20;
  const RESULT_SELECTORS = ["#search_result_list", "#search_result", ".search_result", "[data-search-results]"];

  function extractSearchSnapshot(document, pageUrl) {
    const outcome = pageOutcome(document);
    if (outcome.manualAction) return { status: "manual_action", candidates: [], outcome };
    const roots = RESULT_SELECTORS.map((selector) => document.querySelector(selector)).filter(Boolean);
    if (!roots.length) return { status: "error", candidates: [], outcome: { parserError: true } };
    const candidates = uniqueCandidates(roots.flatMap((root) => extractFromRoot(root, pageUrl)));
    return { status: candidates.length ? "success" : "no_results", candidates, outcome: null };
  }

  function extractFromRoot(root, pageUrl) {
    return [...root.querySelectorAll('a[href*="/work/=/product_id/"]')]
      .map((anchor) => candidateFromAnchor(anchor, pageUrl))
      .filter(Boolean);
  }

  function candidateFromAnchor(anchor, pageUrl) {
    let url;
    try {
      url = new URL(anchor.href, pageUrl);
    } catch {
      return null;
    }
    const match = url.protocol === "https:" && url.origin === "https://www.dlsite.com" && PRODUCT_PATH.exec(url.pathname);
    if (!match || url.search || url.hash) return null;
    const card = anchor.closest?.("li, article, .work, .search_result_item") || anchor.parentElement || anchor;
    const title = textFrom(anchor.querySelector?.(".work_name, .title") || anchor);
    if (!title) return null;
    return {
      productId: match[1],
      title,
      circles: textsFrom(card, ".maker_name, .circle_name, [data-circle]"),
      authors: textsFrom(card, ".author_name, [data-author]"),
      languageHints: textsFrom(card, ".work_lang, .language, [data-language]"),
      versionHints: textsFrom(card, ".work_version, .version, [data-version]"),
      productUrl: url.href,
      thumbnailUrl: thumbnailFrom(card, pageUrl),
      evidence: "search-result product anchor"
    };
  }

  function thumbnailFrom(card, pageUrl) {
    const source = card.querySelector?.("img[src]")?.src;
    if (!source) return null;
    try {
      const url = new URL(source, pageUrl);
      return url.protocol === "https:" && ["img.dlsite.jp", "www.dlsite.com"].includes(url.hostname) ? url.href : null;
    } catch {
      return null;
    }
  }

  function textsFrom(root, selector) {
    const values = [...(root.querySelectorAll?.(selector) || [])].map(textFrom).filter(Boolean);
    return [...new Set(values)].slice(0, 12);
  }

  function textFrom(node) {
    const value = node?.textContent?.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
    return value ? value.slice(0, 500) : null;
  }

  function uniqueCandidates(values) {
    const seen = new Set();
    return values.filter((item) => !seen.has(item.productId) && seen.add(item.productId)).slice(0, MAX_CANDIDATES);
  }

  function pageOutcome(document) {
    const manualAction = Boolean(document.querySelector(
      "iframe[src*='challenges.cloudflare.com'], .cf-turnstile, [data-sitekey], form[action*='login'], form[action*='age'], [data-age-verification]"
    ));
    return manualAction ? { manualAction: true } : {};
  }

  globalThis.GodNumberDlsiteExtractors = Object.freeze({ extractSearchSnapshot });
})();
