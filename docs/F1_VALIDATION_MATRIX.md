# F1 可行性驗證矩陣

本文件區分可由離線測試確認的程式行為，以及必須等一般 Chrome 與真實 DLsite 才能確認的網站事實。離線結果不得替代實站結果。

## 已由自動測試確認

| 技術點 | 狀態 | 證據 |
|---|---|---|
| 搜尋 URL 只指向允許的 DLsite `books`、`maniax` 或 `home` 搜尋分區 | passed | 分區 allowlist、編碼、空白輸入及固定 origin 測試 |
| 搜尋候選只接受 DLsite 商品 URL | passed | 站外連結排除測試 |
| 商品分類可接受 `maniax`、`books`、`home` 等單一 DLsite 區段 | passed | 多區段商品 URL 測試 |
| 候選依商品 ID 去重且最多 20 筆 | passed | 重複與 25 筆輸入測試 |
| 商品欄位只保留語言、翻譯、原作、作者、社團、品牌、系列及版本相關標籤 | passed | 售價排除測試 |
| 商品頁獨立作者、品牌／社團、系列與原作節點可納入交叉核對 | passed | 獨立語意節點與重複標籤排除測試 |
| 表格與定義清單兩種欄位結構 | passed | `tr` 與 `dl` fixture 測試 |
| 繁中訊號必須來自明確語言欄位 | passed | 標題單獨含「繁體中文版」仍不得通過的反例測試 |
| 每個值最多 300 字元、商品欄位最多 30 筆 | passed | 超長值與 40 列輸入測試 |
| 驗證、年齡節點或 Forbidden 標題會回報人工接手 | passed | 可見與隱藏節點、Forbidden 標題測試 |
| 輸出 schema、訊息回傳及 popup 顯示使用安全文字介面 | passed | schema validator 與靜態禁用模式測試 |
| Probe 不保存資料，也不要求 `<all_urls>` 或動態注入權限 | passed | manifest 與程式碼靜態測試 |

## 尚待真實網站確認

| 技術點 | 狀態 | 判定方式 |
|---|---|---|
| DLsite 搜尋 URL 在目前地區與語系正常載入 | pending | 一般 Chrome 開啟 Probe 建立的搜尋 URL |
| 真實搜尋結果容器符合任一受支援 selector | pending | Probe 回報 `search/success`，而非 `parser_error` |
| 真實候選商品卡提供商品 ID、標題與站內 URL | pending | 檢查搜尋頁 JSON 與畫面一致 |
| 商品頁有明確繁中欄位 | pending | 3 組繁中正例的 `explicitTraditionalChinese` 為 true 且附欄位證據 |
| 非繁中商品不會誤判 | pending | 2 組對照案例的 `explicitTraditionalChinese` 為 false |
| 商品頁有至少兩項原作交叉核對欄位 | pending | 每組檢查標題以外的作者、社團、品牌、系列、原作或原題欄位 |
| 網站保護頁能被實際辨識 | pending | 遇到真實保護頁時回報 `manual_action`；若測試期間未遇到則記為 not_observed |

## F1 判定

- 所有「已由自動測試確認」項目目前為 passed。
- 任一必要實站項目 failed，F1 不放行，先依證據調整 Probe 或縮減產品範圍。
- 必要實站項目全部 passed，才能由使用者把 ACC-F1-001 設為 passed，接著修訂 A3 正式實作內容。

## 2026-09-12 第一次實站觀察

- 使用 Probe 0.1.0，共收到 2 組繁中正例、2 組非繁中對照及 1 組 Forbidden 搜尋結果。
- 兩組繁中商品的明確語言欄位皆正確回報 `explicitTraditionalChinese: true`；兩組日文對照皆正確回報 false。
- 4 組可載入的搜尋頁全數回報 `no_results`。案例商品皆為 `books`，但 Probe 0.1.0 固定搜尋 `maniax`，因此尚未證明搜尋候選可行。
- 所有商品的 `comparisonFieldCount` 均為 0，未達至少 2 項交叉核對欄位的門檻。
- Forbidden 頁回報 `parser_error`，未安全轉為 `manual_action`。
- 本輪 F1 判定為 FAIL。Probe 0.2.0 已加入分區選擇、Forbidden 辨識與獨立語意欄位擷取，須重測後才能更新實站矩陣狀態。
