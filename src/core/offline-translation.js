const SUPPORTED_SOURCE_LANGUAGES = new Set(["ja", "en"]);
const TARGET_LANGUAGE = "zh-Hant";

export async function createOfflineTranslator(sourceLanguage, onProgress = () => {}, scope = globalThis) {
  if (!SUPPORTED_SOURCE_LANGUAGES.has(sourceLanguage)) throw new TypeError("不支援的來源語言。");
  if (!scope.Translator || typeof scope.Translator.create !== "function") {
    throw new Error("此 Chrome 版本不支援本機 Translator API。");
  }
  const options = { sourceLanguage, targetLanguage: TARGET_LANGUAGE };
  return scope.Translator.create({
    ...options,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", (event) => {
        const progress = Number.isFinite(event.loaded) ? Math.round(event.loaded * 100) : null;
        onProgress(progress);
      });
    }
  });
}

export async function translateWithPreparedTranslator(translator, text) {
  if (!translator || typeof translator.translate !== "function") throw new TypeError("離線翻譯器尚未準備完成。");
  const normalized = typeof text === "string" ? text.trim() : "";
  if (!normalized) throw new TypeError("待翻譯標題不可為空。");
  const result = await translator.translate(normalized);
  if (typeof result !== "string" || !result.trim()) throw new Error("離線翻譯沒有回傳結果。");
  return result.trim().slice(0, 1000);
}
