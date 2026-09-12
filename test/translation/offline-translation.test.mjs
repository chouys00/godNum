import assert from "node:assert/strict";
import {
  createOfflineTranslator,
  translateWithPreparedTranslator
} from "../../src/core/offline-translation.js";

let createOptions;
let progressHandler;
const fakeTranslator = {
  async translate(text) { return `翻譯：${text}`; }
};
const fakeScope = {
  Translator: {
    create(options) {
      createOptions = options;
      options.monitor({ addEventListener(type, handler) {
        assert.equal(type, "downloadprogress");
        progressHandler = handler;
      } });
      return Promise.resolve(fakeTranslator);
    }
  }
};
const progress = [];
const translator = await createOfflineTranslator("ja", (value) => progress.push(value), fakeScope);
assert.equal(translator, fakeTranslator);
assert.equal(createOptions.sourceLanguage, "ja");
assert.equal(createOptions.targetLanguage, "zh-Hant");
progressHandler({ loaded: 0.42 });
assert.deepEqual(progress, [42]);
assert.equal(await translateWithPreparedTranslator(translator, "原題"), "翻譯：原題");
await assert.rejects(() => createOfflineTranslator("fr", () => {}, fakeScope), TypeError);
await assert.rejects(() => createOfflineTranslator("ja", () => {}, {}), /不支援本機 Translator API/);
await assert.rejects(() => translateWithPreparedTranslator(null, "x"), TypeError);
await assert.rejects(() => translateWithPreparedTranslator(fakeTranslator, "  "), TypeError);

console.log("offline-translation.test.mjs: all assertions passed");
