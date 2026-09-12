# 下一 task 交接

> **修訂 6 現行交接（最高優先）**：新契約已核准並完成 v0.3.0 離線實作。下一步不是討論範圍，而是 A6 Chrome 152 實機驗收。重新載入 `D:\tools\godNum`，確認第一次使用會由 Chrome 免費下載日文／英文到繁中語言包，標題顯示「機器直譯」、作者／署名保持原文、中文版本以 nhentai 連結顯示，且重新開啟側邊面板後沒有最近查詢。使用者已知情授權這些連結可能導向成人作品頁。控制狀態為計畫版本 6、A6 implementation_complete／CONCERNS。

> **修訂 5 歷史交接（已由上方修訂 6 取代）**：V1 至 V3 已完成。獨立零費用方案在 10 筆留置樣本只成功 1 筆，0 次已知誤配，V3 gate 為 FAIL。這段只保留舊契約停止原因，不得用來阻止已核准的修訂 6 實機驗收。

## 交接模式

validate-current-stage

## 整體目標

確認使用者願意採用哪一種替代契約；V3 FAIL 尚未解決前不得開始完整實作。

## 目前階段與狀態

- 已完成：A1、A2、B1、B2、B3 accepted／PASS；V1 來源研究完成；V2 驗證完成但 FAIL。
- 目前階段：V3，awaiting_user_decision／FAIL。
- 後續順序：C1 → I1 → I2 → A6，但 C1 受使用者契約決策阻擋。
- F1 與舊 A3 至 A5 已 superseded，不再重測或續作。
- 控制狀態來源：`docs/STAGE_STATE.yaml`，計畫版本 5。

## 本 task 目標

向使用者說明 1/10 留置結果與資料缺口，取得一個明確的新契約；未取得決策時維持 V3 FAIL，不開始 I1。

## 完成條件

- 使用者選擇自動直譯、Codex 介入、人工確認或低覆蓋率中的一種，或提出等價新契約。
- 明確記錄是否仍要求名稱有外部來源、可接受等待時間、額度界線與新的首次成功門檻。
- 同步正式文件與 DEC-012 後，才把 C1 設為可執行。

## 相關文件

- `docs/PROJECT_SPEC.md`
- `docs/PROJECT_ROADMAP.md`
- `docs/STAGE_STATE.yaml`
- `docs/DECISIONS.md`
- `docs/F1_VALIDATION_MATRIX.md`
- `docs/ACCEPTANCE.md`

## 已確認決策與限制

- DEC-008：F1 是 A3 前置 blocking 閘門。
- DEC-009：B1 至 B3 已完成，但不構成 DLsite 實站證據。
- B1 沒有正式權重或信心門檻，也不含 DLsite selector。
- B2 將本機狀態 schema 升為 4；舊版、損壞、過期或超長狀態會重設，不嘗試保留不可信巢狀資料。
- 不繞過登入、年齡確認、驗證碼或網站防護。

## 測試與驗證證據

- `npm run quality`：通過。入口檢查 37 個非 fixture JavaScript 檔案、兩份 manifest、CSP、權限、禁止 API、完整離線測試與 500 毫秒效能基線。
- `quality-gate.test.mjs`：七種固定違規 fixture 全數回傳非零狀態。
- `node --check`：37 個非 fixture `src/`、`test/`、`probe/` JavaScript 檔案全數通過。
- B2 第一輪測試發現本機 Node 不支援 `structuredClone`，已改用純 JSON schema 相容複製並重驗通過。
- 狀態測試涵蓋損壞、未知版本、過期、未來時間、超長、重複紀錄與任意巢狀資料；診斷測試確認不輸出 Cookie、Authorization、頁面全文、標題、作者或 URL。
- 真實 DLsite：尚未執行，ACC-F1-001 pending。

## 已知問題與風險

- 靜態檢查只能攔截已定義的模式，不能取代 F1 實站證據、A5 整合審查或 A6 Chrome 實機驗收。
- ACC-F1-001 需要使用者實際操作 Chrome；沒有 3 組繁中正例與 2 組非繁中對照時，不得宣稱 F1 通過。

## 工作區與 Git 狀態

- 路徑：`D:\tools\godNum`。
- 工作區不是 Git repository；沒有 HEAD、分支或 `git diff`，不得自行初始化 Git。

## 下一步模型建議

Terra＋中等。F1 的程式與離線測試已完成，下一步是整理使用者提供的 Probe 實測證據並更新判定；範圍固定，但需要仔細核對 blocking 條件與不可繞過網站保護的限制。
