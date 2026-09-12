import assert from "node:assert/strict";
import {
  buildGalleryApiUrl,
  buildSearchApiUrl,
  containsJapanese,
  findChineseVersions,
  parseGalleryResponse,
  stripTitleMetadata
} from "../../src/adapters/nhentai/nhentai-v2.js";

const gallery = {
  id: 123456,
  title: {
    japanese: "[作者名] 作品タイトル ～第一話～ [英訳] [DL版]",
    english: "[Author] Work Title [English] [Digital]",
    pretty: "Work Title"
  },
  tags: [
    { type: "artist", name: "author-original" },
    { type: "group", name: "group-original" }
  ],
  num_pages: 40
};

const source = parseGalleryResponse(gallery, "123456");
assert.equal(source.translationTitle, "作品タイトル ～第一話～");
assert.equal(source.translationLanguage, "ja");
assert.deepEqual(source.artists, ["author-original"]);
assert.deepEqual(source.groups, ["group-original"]);
assert.equal(buildGalleryApiUrl("123456"), "https://nhentai.net/api/v2/galleries/123456");
assert.match(buildSearchApiUrl("作品タイトル"), /^https:\/\/nhentai\.net\/api\/v2\/search\?/);
assert.equal(new URL(buildSearchApiUrl("作品タイトル")).searchParams.get("query"), "作品タイトル");
assert.equal(stripTitleMetadata("[A] Name [Chinese] [Digital]"), "Name");
assert.equal(containsJapanese("作品タイトル"), true);
assert.equal(containsJapanese("秘密基地"), true);
assert.equal(containsJapanese("Work Title"), false);

const results = {
  result: [
    {
      id: 120001,
      english_title: "[Author] Work Title [Chinese]",
      japanese_title: "[作者名] 作品タイトル ～第一話～ [中国翻訳]",
      num_pages: 42
    },
    {
      id: 120002,
      english_title: "[Author] Work Title Part 2 [Chinese]",
      japanese_title: "[作者名] 続 作品タイトル ～第一話～ [中国翻訳]",
      num_pages: 40
    },
    {
      id: 120003,
      english_title: "[Author] Work Title [English]",
      japanese_title: "[作者名] 作品タイトル ～第一話～ [英訳]",
      num_pages: 40
    },
    {
      id: 120004,
      english_title: "[Other] Work Title [Chinese]",
      japanese_title: "[別作者] 作品タイトル ～第一話～ [中国翻訳]",
      num_pages: 40
    },
    {
      id: 120005,
      english_title: "[Author] Work Title [Chinese]",
      japanese_title: "[作者名] 作品タイトル ～第一話～ [中国翻訳]",
      num_pages: 80
    }
  ]
};

assert.deepEqual(findChineseVersions(results, source), [{
  id: 120001,
  url: "https://nhentai.net/g/120001/",
  title: "[Author] Work Title [Chinese]",
  pageCount: 42
}]);
assert.throws(() => parseGalleryResponse({ ...gallery, id: 999999 }, "123456"), TypeError);
assert.throws(() => buildGalleryApiUrl("12345"), TypeError);
assert.throws(() => findChineseVersions({}, source), TypeError);

const englishOnly = parseGalleryResponse({
  id: 234567,
  title: { japanese: null, english: "[Author] English Only [English]", pretty: "English Only" },
  tags: [],
  num_pages: 20
}, "234567");
assert.equal(englishOnly.translationTitle, "English Only");
assert.equal(englishOnly.translationLanguage, "en");

const romanizedJapaneseField = parseGalleryResponse({
  id: 345678,
  title: { japanese: "[Author] Romanized Title [中国翻訳]", english: "[Author] Romanized Title", pretty: "Romanized Title" },
  tags: [],
  num_pages: 20
}, "345678");
assert.equal(romanizedJapaneseField.translationTitle, "Romanized Title");
assert.equal(romanizedJapaneseField.translationLanguage, "en");

console.log("nhentai-v2.test.mjs: all assertions passed");
