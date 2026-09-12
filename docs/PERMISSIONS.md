# A1 權限說明

| 項目 | 用途 | A1 必要性 |
|---|---|---|
| `sidePanel` | 點擊擴充功能圖示後開啟持續存在的側邊面板。 | REQ-002 |
| `storage` | 保存目前查詢與最多十筆最近輸入，讓面板重新開啟或 service worker 休眠後可恢復。 | REQ-002、REQ-012 |
| `https://nhentai.net/*` | 導覽到固定來源網址，並讓同源 content script 回報受限握手。 | REQ-003 |

未申請 `tabs`、`scripting` 或 DLsite 網域。A1 沒有讀取分頁敏感資料、注入腳本或執行 DLsite 功能。manifest 不含 `<all_urls>`、遠端程式碼或外部連線來源。
