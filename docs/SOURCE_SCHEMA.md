# A2 來源擷取契約

## 欄位

來源 record 的 `schemaVersion` 為 1。`number` 必須是六位半形數字，`sourceUrl` 必須精確等於 `https://nhentai.net/g/<number>/`。

`data` 固定包含：

| 欄位 | 型別 | 上限 | 規則 |
|---|---|---|---|
| `titleJapanese` | string 或 null | 500 字元 | 只採頁面或結構化來源明示值 |
| `titleEnglish` | string 或 null | 500 字元 | 缺少時保持 null |
| `titleDisplay` | string 或 null | 500 字元 | 不由其他標題推測 |
| `authors` | string[] | 20 筆，每筆 500 字元 | 去除重複，不推測作者 |
| `groups` | string[] | 20 筆，每筆 500 字元 | 去除重複，不把作者自動當社團 |
| `pageCount` | integer 或 null | 1 至 10000 | 非正整數或超出上限時捨棄 |

## 來源優先序與證據

每個欄位獨立依 `same_origin_api`、`embedded_structured_data`、`standard_metadata`、`dom` 的順序取第一個有效值。較低優先序只能補缺，不能覆蓋先前值。

採用的欄位必須在 `evidence` 留下 `sourceType` 與 `locator`。缺少 locator 的候選不採用。record 只保存必要欄位、證據路徑與使用過的策略，不保存 API 完整回應、頁面 HTML、頁面全文、Cookie、Authorization header、驗證碼或作品內容。

## 錯誤

| 代碼 | 狀態 | 用途 |
|---|---|---|
| `SOURCE_NOT_FOUND` | `not_found` | 同源 API 或頁面明確顯示 404／不存在 |
| `SOURCE_MANUAL_ACTION_REQUIRED` | `manual_action` | 401、403、429、驗證、登入或年齡確認 |
| `SOURCE_NETWORK_ERROR` | `error` | 同源 API 連線失敗，且其他策略沒有可用標題 |
| `SOURCE_PARSER_OUTDATED` | `error` | 頁面可達但四種策略都沒有具證據的標題 |

每筆錯誤固定包含 `message` 與 `nextAction`。人工接手後，使用者可在側邊面板按「重新擷取來源資料」；背景程式會再次核對目前查詢、來源 tab 與精確網址，再要求 content script 重試。

## 跨 context 訊息

訊息頂層採精確 allowlist，總序列化長度上限為 18000 字元。side panel 訊息只接受擴充功能自身 URL；來源訊息必須同時符合 extension ID、目前 tab ID、目前查詢號碼與精確來源 URL。snapshot 只允許既定策略、欄位、locator 及有限的 outcome 欄位。

沒有使用 MAIN world bridge。content script 只把同源 API 或 DOM 中必要欄位整理成最小 snapshot，再交給背景程式驗證與合併。

## 去識別化 fixture

`test/fixtures/source/` 只能保存虛構標題、虛構作者／社團、頁數、最小 snapshot 與錯誤旗標。不得保存真實頁面 HTML、完整 API 回應、圖片網址、作品內容或工作階段資料。fixture 必須涵蓋完整 API、逐欄 fallback、缺少證據、惡意字串、超長值、404、人工接手、網路錯誤與 schema 變動。
