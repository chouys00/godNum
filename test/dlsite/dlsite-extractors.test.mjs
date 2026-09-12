import assert from "node:assert/strict";

await import("../../src/content/dlsite-extractors.js");
const { extractSearchSnapshot } = globalThis.GodNumberDlsiteExtractors;

function textNode(textContent) {
  return { textContent };
}

function card() {
  return {
    parentElement: null,
    querySelector(selector) {
      return selector === "img[src]" ? { src: "https://img.dlsite.jp/modpub/images2/work/doujin/RJ01230000/RJ01234567_img_main.jpg" } : null;
    },
    querySelectorAll(selector) {
      const values = {
        ".maker_name, .circle_name, [data-circle]": ["虛構社團"],
        ".author_name, [data-author]": ["作者甲"],
        ".work_lang, .language, [data-language]": ["日本語"],
        ".work_version, .version, [data-version]": ["DL版"]
      };
      return (values[selector] || []).map(textNode);
    }
  };
}

const resultCard = card();
const validAnchor = {
  href: "https://www.dlsite.com/maniax/work/=/product_id/RJ01234567.html",
  textContent: "架空作品 日本語",
  querySelector() { return null; },
  closest() { return resultCard; }
};
const externalAnchor = { ...validAnchor, href: "https://example.test/maniax/work/=/product_id/RJ09999999.html" };
const searchRoot = { querySelectorAll() { return [validAnchor, externalAnchor]; } };
const document = {
  title: "DLsite search",
  querySelector(selector) {
    if (selector === "#search_result_list") return searchRoot;
    return null;
  }
};
const snapshot = extractSearchSnapshot(document, "https://www.dlsite.com/maniax/fsr/=/keyword/%E6%9E%B6%E7%A9%BA");
assert.equal(snapshot.status, "success");
assert.equal(snapshot.candidates.length, 1, "站外連結不可成為候選");
assert.equal(snapshot.candidates[0].productId, "RJ01234567");
assert.deepEqual(snapshot.candidates[0].circles, ["虛構社團"]);
assert.equal(snapshot.candidates[0].thumbnailUrl.startsWith("https://img.dlsite.jp/"), true);

const emptyRoot = { querySelectorAll() { return []; } };
const noResults = extractSearchSnapshot({ title: "DLsite search", querySelector(selector) { return selector === "#search_result_list" ? emptyRoot : null; } }, "https://www.dlsite.com/maniax/fsr/=/keyword/x");
assert.deepEqual(noResults, { status: "no_results", candidates: [], outcome: null });
const parserFailure = extractSearchSnapshot({ title: "DLsite search", querySelector() { return null; } }, "https://www.dlsite.com/maniax/fsr/=/keyword/x");
assert.deepEqual(parserFailure, { status: "error", candidates: [], outcome: { parserError: true } });
const manualAction = extractSearchSnapshot({
  title: "DLsite search",
  querySelector(selector) { return selector.includes("challenges.cloudflare.com") ? {} : null; }
}, "https://www.dlsite.com/maniax/fsr/=/keyword/x");
assert.deepEqual(manualAction, { status: "manual_action", candidates: [], outcome: { manualAction: true } });

console.log("dlsite-extractors.test.mjs: all assertions passed");
