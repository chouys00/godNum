# 中文名稱來源能力矩陣

- 實測日期：2026-09-12
- 目的：驗證零額外費用、執行期不依賴 Codex 的名稱來源。
- 範圍：只讀公開書目 metadata；未讀取圖片或作品內容。

| 來源 | 官方／公開介面 | 費用與限制 | 實測結果 | 判定 |
|---|---|---|---|---|
| nhentai API v2 | `GET /api/v2/galleries/{id}`、`GET /api/v2/search`；公開 OpenAPI | 無金鑰可用；規格記載匿名 20 次／分鐘，需描述性 User-Agent | 可取得來源標題、作者標籤、頁數，也能找到部分同作中文翻譯 gallery；但多數中文 gallery 只有羅馬字標題與翻譯標記，沒有中文名稱文字 | **可作來源與候選主來源；名稱覆蓋不足** |
| Open Library Search API | 官方 `search.json` | 公開免費介面 | 代表樣本以原題／作者查詢為 0 筆；資料類型偏一般出版品 | **不適合作主來源** |
| AniList GraphQL API | 官方 GraphQL endpoint | 公開；實測時官方速率頁顯示暫時降為 30 次／分鐘 | 代表樣本無媒體結果；目標類型與 catalog 範圍不吻合 | **不適合作主來源** |
| Google Books API | 官方 Books API 文件 | 文件支援 `intitle`／`inauthor`；實際免金鑰請求回傳 HTTP 429、quota limit 0 | 無法證明 keyless 部署可穩定運作；即使可用，涵蓋仍偏正式書籍 | **不可列入零設定主路徑** |
| SearXNG 公開 instance | 官方軟體有 HTTP API | instance 可自行停用 JSON；可用性、來源與速率由個別站方決定 | 無法把任一公共 instance 視為長期穩定依賴；自架仍增加維運且上游搜尋未必允許 | **不適合作穩定主來源** |
| 一般搜尋引擎網頁 | 人工網頁介面 | 沒有符合本案的免費、穩定正式 API；網頁 DOM 與阻擋會變動 | 開發探索偶爾找到別名，但雜訊高且不能轉化為可靠獨立 runtime | **只可人工研究，不可作主方案** |
| Codex／模型 API | 雲端模型與網路研究 | Codex 使用既有額度；API key 呼叫另計費 | 可協助研究或產生翻譯，但不能補出來源中不存在的既有中文別名；且違反主方案獨立條件 | **排除於主方案** |

## 主要證據網址

- nhentai v2 文件：<https://nhentai.net/api/v2/docs>
- nhentai v2 OpenAPI：<https://nhentai.net/api/v2/openapi.json>
- Open Library Search API：<https://openlibrary.org/dev/docs/api/search>
- AniList API：<https://docs.anilist.co/guide/graphql/>
- Google Books API：<https://developers.google.com/books/docs/v1/using>
- SearXNG Search API：<https://docs.searxng.org/dev/search_api.html>

## 結論

同站搜尋是唯一在資料類型、零費用與程式可用性上同時成立的候選來源，但它只能在上傳者把中文別名寫入標題時提供合格名稱。`[Chinese]` 標記只能證明翻譯版本，不能證明名稱，因此無法靠更寬鬆的 parser 補足缺失資料。
