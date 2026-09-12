(() => {
  const ORIGIN = "https://www.dlsite.com";
  const DEFAULT_SECTION = "books";
  const ALLOWED_SECTIONS = new Set(["books", "maniax", "home"]);
  const SEARCH_PATH = /^\/(books|maniax|home)\/fsr\/=\/keyword\//;
  const PRODUCT_PATH = /^\/[a-z0-9_-]+\/work\/=\/product_id\/([A-Z]{2}[0-9]{5,})\.html$/i;
  const MAX_CANDIDATES = 20;
  const MAX_FIELDS = 30;
  const MAX_TEXT = 300;
  const MANUAL_SELECTOR = [
    "iframe[src*='challenges.cloudflare.com']",
    ".cf-turnstile",
    "[data-sitekey]",
    "[data-age-verification]",
    "#age_check",
    ".age_check",
    "main form[action*='login']",
    "main form[action*='age']"
  ].join(", ");
  const RESULT_ROOTS = ["#search_result_list", "#search_result", ".search_result", "[data-search-results]"];
  const TITLE_SELECTORS = ["#work_name", "h1.work_name", ".work_name", "main h1", "h1"];
  const FIELD_ROW_SELECTORS = [
    "#work_outline tr",
    ".work_spec_table tr",
    ".work_spec_list tr",
    "table.work_outline tr",
    "main table tr"
  ];
  const FIELD_PAIR_SELECTORS = ["#work_outline dl", ".work_spec_container dl", ".work_spec_list dl", "main dl"];
  const RELEVANT_LABEL = /(言語|語言|language|繁體|繁体|中文|翻訳|翻譯|translation|原作|原題|original|作者|author|サークル|circle|ブランド|brand|メーカー|maker|シリーズ|series|作品形式|version|版本)/i;
  const TRADITIONAL_CHINESE = /(繁體中文|繁体中文|traditional\s+chinese|中文\s*[（(]?繁體|中国語\s*[（(]?繁体字)/i;
  const RELATION_LABEL = /(翻訳|翻譯|translation|原作|原題|original)/i;
  const COMPARISON_LABEL = /(原作|原題|original|作者|author|サークル|circle|社團|品牌|ブランド|brand|メーカー|maker|系列|シリーズ|series)/i;
  const PROTECTION_TITLE = /^(403\s*)?forbidden$|access\s+denied|request\s+blocked|captcha|cloudflare/i;
  const SEMANTIC_FIELDS = [
    { label: "作者", selectors: ["#work_author a", "#work_author", ".author_name", "[data-author]", "[itemprop='author']"] },
    { label: "品牌／社團", selectors: ["#work_maker .maker_name", "#work_maker a", "#work_maker", ".maker_name", ".circle_name", "[data-circle]", "[itemprop='brand']"] },
    { label: "系列", selectors: ["#work_series a", "#work_series", ".series_name", "[data-series]", "[itemprop='isPartOf']"] },
    { label: "原作", selectors: ["#work_original a", "#work_original", "[data-original-work]", "[data-original-title]", "[itemprop='isBasedOn']"] }
  ];

  function buildSearchUrl(rawTitle, rawSection = DEFAULT_SECTION) {
    const title = cleanText(rawTitle);
    if (!title) throw new TypeError("請輸入作品標題。");
    const section = cleanText(rawSection)?.toLowerCase();
    if (!ALLOWED_SECTIONS.has(section)) throw new TypeError("不支援此 DLsite 分區。");
    return `${ORIGIN}/${section}/fsr/=/keyword/${encodeURIComponent(title)}`;
  }

  function capturePage(document, pageUrl) {
    let url;
    try {
      url = new URL(pageUrl);
    } catch {
      return outcome("unsupported", pageUrl, "invalid_url");
    }
    if (url.origin !== ORIGIN || url.username || url.password) return outcome("unsupported", url.href, "unapproved_origin");
    const manualNode = document.querySelector?.(MANUAL_SELECTOR);
    if ((manualNode && isProbablyVisible(manualNode)) || PROTECTION_TITLE.test(cleanText(document.title) || "")) {
      return outcome("manual_action", url.href, "site_requires_user_action");
    }
    if (SEARCH_PATH.test(url.pathname)) return captureSearch(document, url);
    const productMatch = PRODUCT_PATH.exec(url.pathname);
    if (productMatch) return captureProduct(document, url, productMatch[1].toUpperCase());
    return outcome("unsupported", url.href, "unsupported_dlsite_page");
  }

  function captureSearch(document, url) {
    const roots = RESULT_ROOTS.flatMap((selector) => {
      const node = document.querySelector?.(selector);
      return node ? [{ node, selector }] : [];
    });
    if (!roots.length) return outcome("parser_error", url.href, "search_result_root_not_found");
    const candidates = dedupe(roots.flatMap(({ node, selector }) =>
      [...(node.querySelectorAll?.('a[href*="/work/=/product_id/"]') || [])]
        .map((anchor) => candidateFromAnchor(anchor, url.href, selector))
        .filter(Boolean)
    ));
    return {
      schemaVersion: 1,
      pageType: "search",
      status: candidates.length ? "success" : "no_results",
      pageUrl: url.href,
      candidates,
      fields: [],
      signals: { explicitTraditionalChinese: false, language: [], relation: [], comparisonFieldCount: 0 },
      reason: null
    };
  }

  function candidateFromAnchor(anchor, baseUrl, rootSelector) {
    let url;
    try {
      url = new URL(anchor.href, baseUrl);
    } catch {
      return null;
    }
    const match = url.origin === ORIGIN && !url.username && !url.password && PRODUCT_PATH.exec(url.pathname);
    if (!match || url.search || url.hash) return null;
    const card = anchor.closest?.("li, article, .work, .search_result_item") || anchor.parentElement || anchor;
    const titleNode = anchor.querySelector?.(".work_name, .title") || anchor;
    const title = cleanText(titleNode?.textContent) || cleanText(anchor.querySelector?.("img[alt]")?.alt);
    if (!title) return null;
    return {
      productId: match[1].toUpperCase(),
      title,
      productUrl: url.href,
      creators: texts(card, ".maker_name, .circle_name, .author_name, [data-circle], [data-author]", 8),
      languageHints: texts(card, ".work_lang, .language, [data-language]", 8),
      versionHints: texts(card, ".work_version, .version, [data-version]", 8),
      evidence: `${rootSelector} a[href*="/work/=/product_id/"]`
    };
  }

  function captureProduct(document, url, productId) {
    const titleHit = firstNode(document, TITLE_SELECTORS);
    const metaTitle = cleanText(document.querySelector?.('meta[property="og:title"]')?.content);
    const title = cleanText(titleHit?.node?.textContent) || metaTitle;
    const fields = [];
    const seenRows = new Set();
    for (const selector of FIELD_ROW_SELECTORS) {
      const rows = [...(document.querySelectorAll?.(selector) || [])];
      rows.forEach((row, index) => {
        if (fields.length >= MAX_FIELDS || seenRows.has(row)) return;
        seenRows.add(row);
        const label = cleanText(row.querySelector?.("th, dt, .label, .title")?.textContent);
        const value = cleanText(row.querySelector?.("td, dd, .value, .text")?.textContent);
        if (!label || !value || !RELEVANT_LABEL.test(label)) return;
        fields.push({ label, value, evidence: `${selector}:nth-match(${index + 1})` });
      });
      if (fields.length >= MAX_FIELDS) break;
    }
    for (const selector of FIELD_PAIR_SELECTORS) {
      const pairs = [...(document.querySelectorAll?.(selector) || [])];
      pairs.forEach((pair, index) => {
        if (fields.length >= MAX_FIELDS || seenRows.has(pair)) return;
        seenRows.add(pair);
        const label = cleanText(pair.querySelector?.("dt, .label, .title")?.textContent);
        const value = cleanText(pair.querySelector?.("dd, .value, .text")?.textContent);
        if (!label || !value || !RELEVANT_LABEL.test(label)) return;
        fields.push({ label, value, evidence: `${selector}:nth-match(${index + 1})` });
      });
      if (fields.length >= MAX_FIELDS) break;
    }
    for (const semanticField of SEMANTIC_FIELDS) {
      if (fields.length >= MAX_FIELDS || fields.some((field) => sameSemanticLabel(field.label, semanticField.label))) continue;
      const hit = firstTexts(document, semanticField.selectors, 8);
      if (!hit) continue;
      fields.push({ label: semanticField.label, value: hit.values.join("／"), evidence: hit.selector });
    }
    const language = fields.filter((field) => /(言語|語言|language|繁體|繁体|中文)/i.test(`${field.label} ${field.value}`));
    const relation = fields.filter((field) => RELATION_LABEL.test(`${field.label} ${field.value}`));
    const comparison = fields.filter((field) => COMPARISON_LABEL.test(field.label));
    const languageText = language.flatMap((field) => [field.label, field.value]).join(" ");
    return {
      schemaVersion: 1,
      pageType: "product",
      status: title ? "success" : "parser_error",
      pageUrl: url.href,
      productId,
      title: title || null,
      titleEvidence: titleHit?.selector || (metaTitle ? 'meta[property="og:title"]' : null),
      candidates: [],
      fields,
      signals: {
        explicitTraditionalChinese: TRADITIONAL_CHINESE.test(languageText),
        language,
        relation,
        comparisonFieldCount: comparison.length
      },
      reason: title ? null : "product_title_not_found"
    };
  }

  function outcome(status, pageUrl, reason) {
    return {
      schemaVersion: 1,
      pageType: "unknown",
      status,
      pageUrl: cleanText(pageUrl) || null,
      candidates: [],
      fields: [],
      signals: { explicitTraditionalChinese: false, language: [], relation: [], comparisonFieldCount: 0 },
      reason
    };
  }

  function firstNode(document, selectors) {
    for (const selector of selectors) {
      const node = document.querySelector?.(selector);
      if (node) return { node, selector };
    }
    return null;
  }

  function isProbablyVisible(node) {
    if (node.hidden || node.getAttribute?.("aria-hidden") === "true") return false;
    const rects = node.getClientRects?.();
    return !rects || rects.length > 0;
  }

  function isSafeSnapshot(value) {
    if (!value || typeof value !== "object" || value.schemaVersion !== 1) return false;
    if (!["search", "product", "unknown"].includes(value.pageType)) return false;
    if (!["success", "no_results", "manual_action", "parser_error", "unsupported"].includes(value.status)) return false;
    if (typeof value.pageUrl !== "string" && value.pageUrl !== null) return false;
    if (!Array.isArray(value.candidates) || value.candidates.length > MAX_CANDIDATES) return false;
    if (!Array.isArray(value.fields) || value.fields.length > MAX_FIELDS) return false;
    if (!value.signals || typeof value.signals.explicitTraditionalChinese !== "boolean") return false;
    return value.candidates.every((item) =>
      item && typeof item.productId === "string" && typeof item.title === "string" &&
      typeof item.productUrl === "string" && item.productUrl.startsWith(`${ORIGIN}/`)
    ) && value.fields.every((field) =>
      field && typeof field.label === "string" && field.label.length <= MAX_TEXT &&
      typeof field.value === "string" && field.value.length <= MAX_TEXT &&
      typeof field.evidence === "string"
    );
  }

  function texts(root, selector, limit) {
    const values = [...(root?.querySelectorAll?.(selector) || [])].map((node) => cleanText(node.textContent || node.content)).filter(Boolean);
    return [...new Set(values)].slice(0, limit);
  }

  function firstTexts(root, selectors, limit) {
    for (const selector of selectors) {
      const values = texts(root, selector, limit);
      if (values.length) return { selector, values };
    }
    return null;
  }

  function sameSemanticLabel(existing, expected) {
    const groups = {
      "作者": /作者|author/i,
      "品牌／社團": /サークル|circle|ブランド|brand|メーカー|maker|社團|品牌/i,
      "系列": /シリーズ|series|系列/i,
      "原作": /原作|原題|original/i
    };
    return groups[expected]?.test(existing) || false;
  }

  function cleanText(value) {
    if (typeof value !== "string") return null;
    const text = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
    return text ? text.slice(0, MAX_TEXT) : null;
  }

  function dedupe(values) {
    const seen = new Set();
    return values.filter((item) => !seen.has(item.productId) && seen.add(item.productId)).slice(0, MAX_CANDIDATES);
  }

  globalThis.DlsiteFeasibilityProbe = Object.freeze({ buildSearchUrl, capturePage, isSafeSnapshot });
})();
