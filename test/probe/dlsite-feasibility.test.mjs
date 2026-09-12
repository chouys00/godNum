import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../../probe/dlsite-feasibility/extractor.js");
const { buildSearchUrl, capturePage, isSafeSnapshot } = globalThis.DlsiteFeasibilityProbe;

assert.equal(
  buildSearchUrl("  架空 作品 & 作者  "),
  "https://www.dlsite.com/books/fsr/=/keyword/%E6%9E%B6%E7%A9%BA%20%E4%BD%9C%E5%93%81%20%26%20%E4%BD%9C%E8%80%85"
);
assert.equal(buildSearchUrl("架空作品", "maniax"), "https://www.dlsite.com/maniax/fsr/=/keyword/%E6%9E%B6%E7%A9%BA%E4%BD%9C%E5%93%81");
assert.throws(() => buildSearchUrl("   "), /請輸入作品標題/);
assert.throws(() => buildSearchUrl("架空作品", "unknown"), /不支援此 DLsite 分區/);
assert.equal(new URL(buildSearchUrl("../../https://example.test/")).origin, "https://www.dlsite.com");

function node(textContent) {
  return { textContent };
}

const card = {
  querySelectorAll(selector) {
    if (selector.includes("maker_name")) return [node("虛構社團"), node("作者甲")];
    if (selector.includes("work_lang")) return [node("繁體中文")];
    if (selector.includes("work_version")) return [node("中文翻譯版")];
    return [];
  }
};
const validAnchor = {
  href: "https://www.dlsite.com/books/work/=/product_id/BJ01234567.html",
  textContent: "架空作品 繁體中文版",
  querySelector() { return null; },
  closest() { return card; }
};
const externalAnchor = { ...validAnchor, href: "https://example.test/books/work/=/product_id/BJ09999999.html" };
const root = { querySelectorAll() { return [validAnchor, validAnchor, externalAnchor]; } };
const searchDocument = {
  querySelector(selector) {
    if (selector === "#search_result_list") return root;
    return null;
  }
};
const search = capturePage(searchDocument, "https://www.dlsite.com/maniax/fsr/=/keyword/test");
assert.equal(search.status, "success");
assert.equal(search.candidates.length, 1, "候選必須去重並排除站外連結");
assert.equal(search.candidates[0].productId, "BJ01234567");
assert.equal(isSafeSnapshot(search), true);

const manyAnchors = Array.from({ length: 25 }, (_, index) => ({
  ...validAnchor,
  href: `https://www.dlsite.com/maniax/work/=/product_id/RJ${String(10000000 + index)}.html`
}));
const boundedSearch = capturePage({
  querySelector(selector) {
    return selector === "#search_result_list" ? { querySelectorAll() { return manyAnchors; } } : null;
  }
}, "https://www.dlsite.com/maniax/fsr/=/keyword/test");
assert.equal(boundedSearch.candidates.length, 20, "搜尋候選必須限制在 20 筆");

function row(label, value) {
  return {
    querySelector(selector) {
      if (selector.startsWith("th")) return node(label);
      if (selector.startsWith("td")) return node(value);
      return null;
    }
  };
}
const productRows = [
  row("對應語言", "繁體中文"),
  row("原作", "架空作品 日本語版"),
  row("作者", "作者甲"),
  row("售價", "999")
];
const productDocument = {
  querySelector(selector) {
    if (selector.includes("challenges.cloudflare.com")) return null;
    if (selector === "#work_name") return node("架空作品 繁體中文版");
    return null;
  },
  querySelectorAll(selector) {
    return selector === "#work_outline tr" ? productRows : [];
  }
};
const product = capturePage(productDocument, "https://www.dlsite.com/books/work/=/product_id/BJ01234567.html");
assert.equal(product.status, "success");
assert.equal(product.productId, "BJ01234567");
assert.equal(product.fields.length, 3, "無關售價欄位不可擷取");
assert.equal(product.signals.explicitTraditionalChinese, true);
assert.equal(product.signals.relation.length, 1);
assert.equal(product.signals.comparisonFieldCount, 2);
assert.match(product.fields[0].evidence, /#work_outline tr/);
assert.equal(isSafeSnapshot(product), true);

const titleOnlyChinese = capturePage({
  querySelector(selector) {
    if (selector === "#work_name") return node("架空作品 繁體中文版");
    return null;
  },
  querySelectorAll() { return []; }
}, "https://www.dlsite.com/books/work/=/product_id/BJ01234567.html");
assert.equal(titleOnlyChinese.signals.explicitTraditionalChinese, false, "只在標題出現繁中不得算明確語言欄位");

const semanticProduct = capturePage({
  querySelector(selector) { return selector === "#work_name" ? node("架空作品") : null; },
  querySelectorAll(selector) {
    if (selector === "#work_author a") return [node("作者甲")];
    if (selector === "#work_maker .maker_name") return [node("虛構出版社")];
    return [];
  }
}, "https://www.dlsite.com/books/work/=/product_id/BJ01234567.html");
assert.equal(semanticProduct.signals.comparisonFieldCount, 2, "商品頁獨立作者與品牌節點必須納入交叉核對欄位");
assert.deepEqual(semanticProduct.fields.map((field) => field.label), ["作者", "品牌／社團"]);

const definitionPair = {
  querySelector(selector) {
    if (selector.startsWith("dt")) return node("Language");
    if (selector.startsWith("dd")) return node("Traditional Chinese");
    return null;
  }
};
const definitionProduct = capturePage({
  querySelector(selector) { return selector === "#work_name" ? node("Fictional work") : null; },
  querySelectorAll(selector) { return selector === "#work_outline dl" ? [definitionPair] : []; }
}, "https://www.dlsite.com/home/work/=/product_id/RJ01234567.html");
assert.equal(definitionProduct.signals.explicitTraditionalChinese, true, "定義清單格式也必須支援");

const longValue = "長".repeat(600);
const manyRows = Array.from({ length: 40 }, (_, index) => row(`作者 ${index}`, longValue));
const boundedProduct = capturePage({
  querySelector(selector) { return selector === "#work_name" ? node("架空作品") : null; },
  querySelectorAll(selector) { return selector === "#work_outline tr" ? manyRows : []; }
}, "https://www.dlsite.com/maniax/work/=/product_id/RJ01234567.html");
assert.equal(boundedProduct.fields.length, 30, "商品欄位必須限制在 30 筆");
assert.equal(boundedProduct.fields[0].value.length, 300, "單一欄位必須限制在 300 字元");

const manualDocument = { querySelector(selector) { return selector.includes("challenges.cloudflare.com") ? {} : null; } };
assert.equal(capturePage(manualDocument, "https://www.dlsite.com/maniax/fsr/=/keyword/test").status, "manual_action");
const forbiddenDocument = { title: "Forbidden", querySelector() { return null; } };
assert.equal(capturePage(forbiddenDocument, "https://www.dlsite.com/books/fsr/=/keyword/test").status, "manual_action");
const hiddenManualDocument = {
  querySelector(selector) { return selector.includes("challenges.cloudflare.com") ? { hidden: true } : null; }
};
assert.notEqual(capturePage(hiddenManualDocument, "https://www.dlsite.com/maniax/fsr/=/keyword/test").status, "manual_action");
assert.equal(capturePage({ querySelector() { return null; } }, "https://example.test/").status, "unsupported");
assert.equal(capturePage({ querySelector() { return null; } }, "https://example.test@www.dlsite.com/maniax/fsr/=/keyword/x").status, "unsupported");
assert.equal(isSafeSnapshot({}), false);
assert.equal(isSafeSnapshot({ ...search, candidates: Array(21).fill(search.candidates[0]) }), false);

const manifest = JSON.parse(await readFile(new URL("../../probe/dlsite-feasibility/manifest.json", import.meta.url), "utf8"));
assert.deepEqual(manifest.permissions, ["tabs"]);
assert.deepEqual(manifest.host_permissions, ["https://www.dlsite.com/*"]);
assert.equal(JSON.stringify(manifest).includes("<all_urls>"), false);
assert.equal(manifest.permissions.includes("storage"), false, "Probe 不得保存擷取結果");
assert.equal(manifest.permissions.includes("scripting"), false, "Probe 不需要動態注入權限");

const implementationText = await Promise.all([
  "../../probe/dlsite-feasibility/extractor.js",
  "../../probe/dlsite-feasibility/content.js",
  "../../probe/dlsite-feasibility/popup.js"
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
const executableText = implementationText.join("\n");
assert.equal(/innerHTML|eval\s*\(|chrome\.storage|document\.cookie|Authorization/i.test(executableText), false);

const popupHtml = await readFile(new URL("../../probe/dlsite-feasibility/popup.html", import.meta.url), "utf8");
assert.match(popupHtml, /<label for="title">/);
assert.match(popupHtml, /<label for="section">/);
assert.match(popupHtml, /role="status"/);
assert.match(popupHtml, /<textarea id="output"[^>]*readonly/);
assert.equal(/<script[^>]+src=["']https?:/i.test(popupHtml), false, "Probe 不得載入遠端腳本");

console.log("dlsite-feasibility.test.mjs: all assertions passed");
