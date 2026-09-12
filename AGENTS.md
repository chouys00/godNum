# 專案工作規則

## 文件索引

- `docs/PROJECT_SPEC.md`：需求與成功條件的主要來源。
- `docs/PROJECT_ROADMAP.md`：階段、相依與完成條件的主要來源。
- `docs/STAGE_STATE.yaml`：目前控制狀態的唯一機器可讀來源。
- `docs/DECISIONS.md`：跨階段決策紀錄。
- `docs/ACCEPTANCE.md`：人工與實機驗收帳本。
- `docs/SUPPLEMENTAL_VALIDATION.md`：受工具限制而延後的實機補驗清單。
- `docs/DEVELOPMENT_STATUS.md`：人類閱讀版狀態。
- `docs/DEVELOPMENT_LOG.md`：實際工作與測試紀錄。
- `docs/NEXT_TASK_HANDOFF.md`：下一個 task 的開工入口。

## 長期規則

- 以 Chrome Manifest V3 為第一版主要平台，最低支援版本暫定 Chrome 114。
- 第一版只用擴充功能內附的 HTML、CSS、JavaScript，不引入 Flutter、伺服器、資料庫或 AI。
- 不繞過驗證碼、反自動化機制、登入、年齡確認或網站存取控制；遇到阻擋時交由使用者在正常分頁完成。
- 網站權限限於實際需要的精確網域。不得要求 `<all_urls>`，也不得儲存 Cookie、密碼、頁面全文或漫畫內容。
- 原作標題與 DLsite 候選必須保留來源網址及可核對證據。信心不足時列出候選或回報未找到，不得強行判定。
- 配對流程必須可重現且不依賴 AI；演算法、門檻與正規化規則要有固定測試。
- 未經使用者明確要求，不下載、重製或重新散布作品內容。
- 實作與測試結果應同步寫入 `docs/DEVELOPMENT_LOG.md`，控制狀態只更新 `docs/STAGE_STATE.yaml`。
- 能離線或以本機自動測試驗證的功能先完成；受 Computer Use 或外部網站限制的操作列入補驗，不得寫成已通過。A6 整體實機驗收完成前，專案不得標記為最終 accepted。
