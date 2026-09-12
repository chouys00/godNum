# A1 可驗證基線

## 來源與相容性決定

- 來源網域：`https://nhentai.net/*`
- 固定網址格式：`https://nhentai.net/g/<六位半形數字>/`
- 最低 Chrome：114；實機驗收目標：Chrome 152。
- 來源格式依既有 Godconverter 專案所稱的 N 站流程確認；A1 僅導覽，不讀取作品資料，也不處理登入、年齡確認或驗證碼。

## 離線驗證

在專案根目錄執行：

```powershell
node test/run-tests.mjs
node --check src/background/service-worker.js
node --check src/ui/side-panel.js
node --check src/content/handshake.js
```

測試涵蓋六位數有效值、首尾空白、過短、過長、字母、全形數字、空值、固定 HTTPS URL、非核准 URL、重複輸入一致性、狀態 schema 與 manifest 最小權限。

## Chrome 152 blocking 驗收

此項仍待驗收者執行。步驟如下：

1. 開啟 `chrome://extensions`，啟用開發人員模式。
2. 選擇「載入未封裝項目」，指定 `D:\tools\godNum`。
3. 點擊擴充功能圖示，確認側邊面板開啟。
4. 輸入 `460733` 並送出，確認一般分頁開啟 `https://nhentai.net/g/460733/`。
5. 關閉並重開側邊面板，切換分頁後確認號碼與狀態仍存在；再等待 service worker 休眠後重開面板確認狀態可恢復。
6. 點擊「清除本機紀錄」，確認輸入與恢復狀態均被清除。

不要在此流程中提交年齡確認、登入或驗證碼；若網站要求人工操作，保持在正常分頁由使用者自行處理。

Chrome 152 會忽略未封裝擴充功能的命令列載入，因此驗收必須在 `chrome://extensions` 手動選擇「載入未封裝項目」。不得用停用 Chrome 安全保護的旗標取代這個步驟。
