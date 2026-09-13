# 驗收帳本

| 代號 | 階段 | 類型 | 狀態 | 證據 | 日期 | 決定者 |
|---|---|---|---|---|---|---|
| ACC-A1-001 | A1 | blocking | passed | 使用者確認已在 Chrome 152 載入未封裝擴充功能；由側邊面板輸入 `460733` 後可開啟 `https://nhentai.net/g/460733/`。此前 Computer Use 的內部頁面限制不影響此使用者實機確認。 | 2026-09-10 | 使用者 |
| ACC-A2-001 | A2 | non-blocking | pending | SUP-A2-001；待依 REQ-013 核對可存取案例的來源標題與作者／社團 |  |  |
| ACC-F1-001 | F1 | blocking | superseded | 2026-09-12 修訂 5 已取消 DLsite 目標；歷史 FAIL 保留，但不再要求 Probe 0.2.0 重測 | 2026-09-12 | 範圍變更 |
| ACC-V2-001 | V2 | blocking | failed | 10 筆留置樣本僅 1 筆取得具來源中文別名，首次取得率 10%，0 次已知誤配；未達 8/10 門檻 | 2026-09-12 | Codex 實測，待使用者決策 |
| ACC-I2-001 | I2 | non-blocking | passed | v0.4.0 adapter、批次訊息 schema、輸入驗證、搜尋連結、manifest 與無障礙測試通過；離線翻譯及其測試已依修訂 10 移除；`npm run quality` 通過 | 2026-09-13 | Codex |
| ACC-A3-001 | A3 | non-blocking | superseded | 修訂 5 取消 DLsite 候選階段 | 2026-09-12 | 範圍變更 |
| ACC-A4-001 | A4 | non-blocking | superseded | 修訂 5 取消舊跨來源配對階段 | 2026-09-12 | 範圍變更 |
| ACC-A5-001 | A5 | non-blocking | superseded | 修訂 5 取消舊 DLsite 整合驗收；新實作另立 I2／A6 | 2026-09-12 | 範圍變更 |
| ACC-A6-001 | A6 | blocking | pending | 待使用者完成第一版整體操作驗收 |  |  |

只有使用者能把 blocking 項目設為 `waived`，並須記錄原因與日期。所有 pending 補驗仍須保留到 A6，不因階段技術 gate 通過而消失。
