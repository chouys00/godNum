import assert from "node:assert/strict";

await import("../../src/content/source-extractors.js");
const { domSnapshot, fromGallery, isGalleryStructuredData, pageOutcome, structuredCandidates } =
  globalThis.GodNumberSourceExtractors;

const displayFallback = fromGallery({
  id: 460733,
  title: { display: "顯示標題" },
  creator: { name: "作者甲" },
  publisher: { name: "社團乙" },
  pageCount: 18
}, "embedded_structured_data", "script[0]");
assert.equal(displayFallback.locators.titleDisplay, "script[0].title.display");
assert.equal(displayFallback.locators.authors, "script[0].creator");
assert.equal(displayFallback.locators.groups, "script[0].publisher");
assert.equal(displayFallback.locators.pageCount, "script[0].pageCount");

const nameFallback = fromGallery({
  identifier: "460733",
  name: "結構化名稱",
  numberOfPages: 20
}, "embedded_structured_data", "script[1]");
assert.equal(nameFallback.locators.titleDisplay, "script[1].name");
assert.equal(nameFallback.locators.pageCount, "script[1].numberOfPages");

assert.equal(
  isGalleryStructuredData({ title: { pretty: "沒有身分的標題" } }, "460733", "https://nhentai.net/g/460733/"),
  false,
  "只有 title 物件不足以證明屬於目前作品"
);
assert.equal(
  isGalleryStructuredData({ id: 460733, title: { pretty: "相符" } }, "460733", "https://nhentai.net/g/460733/"),
  true
);
assert.equal(
  isGalleryStructuredData({ url: "/g/460733/", name: "相符" }, "460733", "https://nhentai.net/g/460733/"),
  true
);
assert.equal(
  isGalleryStructuredData({ identifier: "299075", name: "其他作品" }, "460733", "https://nhentai.net/g/460733/"),
  false
);

const nested = { props: { pageProps: { gallery: { id: 460733 } } } };
assert.deepEqual(structuredCandidates(nested), [nested, nested.props.pageProps.gallery]);

function tagContainer(kind, names) {
  return {
    querySelector(selector) {
      return selector === ".field-name" ? { textContent: kind } : null;
    },
    querySelectorAll(selector) {
      return selector === ".tag .name, a .name" ? names.map((textContent) => ({ textContent })) : [];
    }
  };
}

const selectorValues = new Map([
  ["#info, [data-title-display]", { textContent: "" }],
  ["[data-title-japanese]", { textContent: "日文 fallback" }],
  ["[data-title-english]", { textContent: "English fallback" }],
  ["[data-title-display]", { textContent: "顯示 fallback" }],
  ["[data-page-count]", { textContent: "共 32 頁" }]
]);
const fakeDocument = {
  querySelector(selector) {
    return selectorValues.get(selector) || null;
  },
  querySelectorAll(selector) {
    return selector === "#tags .tag-container"
      ? [tagContainer("artist", ["作者甲"]), tagContainer("group", ["社團乙"])]
      : [];
  }
};
const domFallback = domSnapshot(fakeDocument);
assert.equal(domFallback.locators.titleJapanese, "[data-title-japanese]");
assert.equal(domFallback.locators.titleEnglish, "[data-title-english]");
assert.equal(domFallback.locators.titleDisplay, "[data-title-display]");
assert.equal(domFallback.locators.pageCount, "[data-page-count]");
assert.equal(
  domFallback.locators.authors,
  "DOM path: #tags .tag-container -> .field-name=artist -> .tag .name, a .name"
);
assert.equal(
  domFallback.locators.groups,
  "DOM path: #tags .tag-container -> .field-name=group -> .tag .name, a .name"
);
assert.deepEqual(domFallback.values.authors, ["作者甲"]);
assert.deepEqual(domFallback.values.groups, ["社團乙"]);
assert.equal(domFallback.values.pageCount, 32);

const noIdentity = domSnapshot({
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  }
});
assert.deepEqual(noIdentity.values, {});
assert.deepEqual(noIdentity.locators, {});

const challengeDocument = {
  title: "Please wait",
  querySelector(selector) {
    return selector.includes("challenges.cloudflare.com") ? { tagName: "IFRAME" } : null;
  }
};
assert.deepEqual(pageOutcome(challengeDocument), { manualAction: true });
const notFoundDocument = {
  title: "404 - Not Found",
  querySelector() {
    return null;
  }
};
assert.deepEqual(pageOutcome(notFoundDocument), { notFound: true });
const normalDocument = {
  title: "Gallery",
  querySelector(selector) {
    return selector === "#info" ? { id: "info" } : null;
  }
};
assert.deepEqual(pageOutcome(normalDocument), {});

console.log("source-extractors.test.mjs: all assertions passed");
