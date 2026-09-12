(() => {
  function entityNames(value, maxItems = 20) {
    const items = Array.isArray(value) ? value : value ? [value] : [];
    return items
      .map((item) => typeof item === "string" ? item : item?.name)
      .filter((item) => typeof item === "string" && item.trim())
      .slice(0, maxItems);
  }

  function fromGallery(value, sourceType, locatorPrefix) {
    const title = value?.title && typeof value.title === "object" ? value.title : value;
    const tags = Array.isArray(value?.tags) ? value.tags : [];
    const tagAuthors = tags.filter((tag) => tag?.type === "artist").map((tag) => tag.name);
    const tagGroups = tags.filter((tag) => tag?.type === "group").map((tag) => tag.name);
    const authors = tagAuthors.length ? tagAuthors : entityNames(value?.author || value?.creator);
    const groups = tagGroups.length ? tagGroups : entityNames(value?.publisher);
    const titleDisplay = title?.pretty || title?.display || value?.name || null;
    const pageCount = value?.num_pages || value?.pageCount || value?.numberOfPages || null;
    const values = {
      titleJapanese: title?.japanese || null,
      titleEnglish: title?.english || null,
      titleDisplay,
      authors,
      groups,
      pageCount
    };
    const locators = {};
    if (values.titleJapanese) locators.titleJapanese = `${locatorPrefix}.title.japanese`;
    if (values.titleEnglish) locators.titleEnglish = `${locatorPrefix}.title.english`;
    if (titleDisplay) {
      locators.titleDisplay = title?.pretty
        ? `${locatorPrefix}.title.pretty`
        : title?.display
          ? `${locatorPrefix}.title.display`
          : `${locatorPrefix}.name`;
    }
    if (authors.length) {
      locators.authors = tagAuthors.length
        ? `${locatorPrefix}.tags[type=artist].name`
        : value?.author
          ? `${locatorPrefix}.author`
          : `${locatorPrefix}.creator`;
    }
    if (groups.length) {
      locators.groups = tagGroups.length
        ? `${locatorPrefix}.tags[type=group].name`
        : `${locatorPrefix}.publisher`;
    }
    if (pageCount) {
      locators.pageCount = value?.num_pages
        ? `${locatorPrefix}.num_pages`
        : value?.pageCount
          ? `${locatorPrefix}.pageCount`
          : `${locatorPrefix}.numberOfPages`;
    }
    return { sourceType, values, locators };
  }

  function isGalleryStructuredData(value, number, sourceUrl) {
    if (!value || typeof value !== "object") return false;
    const identifiers = [value.id, value.gallery_id, value.identifier, value.media_id]
      .filter((item) => item !== undefined && item !== null)
      .map(String);
    const urls = [
      value.url,
      value["@id"],
      typeof value.mainEntityOfPage === "string" ? value.mainEntityOfPage : value.mainEntityOfPage?.["@id"]
    ].filter((item) => typeof item === "string");
    return identifiers.includes(number) || urls.some((url) => {
      try {
        return new URL(url, sourceUrl).href === sourceUrl;
      } catch {
        return false;
      }
    });
  }

  function structuredCandidates(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (!parsed || typeof parsed !== "object") return [];
    return [
      parsed,
      parsed.gallery,
      parsed.pageProps?.gallery,
      parsed.props?.pageProps?.gallery
    ].filter(Boolean);
  }

  function firstText(root, selectors) {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      const value = node?.textContent?.replace(/\s+/g, " ").trim();
      if (value) return { value, locator: selector };
    }
    return { value: null, locator: null };
  }

  function namesFromTags(document, kind, maxItems = 20) {
    const names = [];
    for (const container of document.querySelectorAll("#tags .tag-container")) {
      const label = container.querySelector(".field-name")?.textContent?.trim().toLowerCase();
      if (label !== kind) continue;
      for (const name of container.querySelectorAll(".tag .name, a .name")) {
        const value = name.textContent?.replace(/\s+/g, " ").trim();
        if (value && !names.includes(value)) names.push(value);
      }
    }
    return names.slice(0, maxItems);
  }

  function domSnapshot(document, outcome = {}) {
    if (!document.querySelector("#info, [data-title-display]")) {
      return { sourceType: "dom", values: {}, locators: {}, outcome };
    }
    const japanese = firstText(document, [
      "#info h1 .japanese",
      "#info .title .japanese",
      "[data-title-japanese]"
    ]);
    const english = firstText(document, [
      "#info h2 .english",
      "#info .title .english",
      "[data-title-english]"
    ]);
    const display = firstText(document, [
      "#info h1 .pretty",
      "#info .title .pretty",
      "[data-title-display]",
      "#info h1"
    ]);
    const pageText = firstText(document, ["#info .pages", "[data-page-count]"]);
    const pageCount = pageText.value?.match(/\d+/)?.[0];
    const authors = namesFromTags(document, "artist");
    const groups = namesFromTags(document, "group");
    return {
      sourceType: "dom",
      values: {
        titleJapanese: japanese.value,
        titleEnglish: english.value,
        titleDisplay: display.value,
        authors,
        groups,
        pageCount: pageCount ? Number(pageCount) : null
      },
      locators: {
        ...(japanese.locator ? { titleJapanese: japanese.locator } : {}),
        ...(english.locator ? { titleEnglish: english.locator } : {}),
        ...(display.locator ? { titleDisplay: display.locator } : {}),
        ...(authors.length ? { authors: "DOM path: #tags .tag-container -> .field-name=artist -> .tag .name, a .name" } : {}),
        ...(groups.length ? { groups: "DOM path: #tags .tag-container -> .field-name=group -> .tag .name, a .name" } : {}),
        ...(pageText.locator ? { pageCount: pageText.locator } : {})
      },
      outcome
    };
  }

  function pageOutcome(document) {
    const title = String(document.title || "").toLowerCase();
    const manualAction = Boolean(
      document.querySelector(
        "iframe[src*='challenges.cloudflare.com'], .cf-turnstile, [data-sitekey], input[name='cf-turnstile-response'], form[action*='login'], form[action*='age'], [data-age-verification]"
      )
    );
    const notFound = /(^|\s)404(\s|$)|not found/.test(title) && !document.querySelector("#info");
    return {
      ...(manualAction ? { manualAction: true } : {}),
      ...(notFound ? { notFound: true } : {})
    };
  }

  globalThis.GodNumberSourceExtractors = Object.freeze({
    domSnapshot,
    fromGallery,
    isGalleryStructuredData,
    pageOutcome,
    structuredCandidates
  });
})();
