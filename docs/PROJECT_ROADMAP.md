# 專案 Roadmap

- 計畫版本：9
- 文件設定：audited
- 主要平台：Windows Chrome Manifest V3
- 現行階段順序：A1 → A2 → B1 → B2 → B3 → F1（歷史、superseded）→ V1 → V2 → V3 → C1 → I1 → I2 → A6

專案整體完成條件：`PROJECT_SPEC.md` 的必要需求與成功條件都有測試證據；所有 blocking 驗收均為 `passed`，或由使用者明確設為 `waived`；`STAGE_STATE.yaml` 最終階段為 `accepted` 且 gate 為 `PASS`。

## 修訂 5：中文名稱首次查證與可行性停止線

> **修訂 9 覆寫（2026-09-13）**：v0.3.3 將原始標題、作者／署名與社團的非空值改為搜尋連結，透過 Chrome 預設搜尋引擎在新分頁搜尋顯示字串；新增最小必要 `search` 權限。A6 須一併確認三種欄位的有值與缺值狀態、搜尋字串及新分頁行為。修訂 8 的其他條件維持有效。

### C1：替代契約確認

- 狀態：accepted／PASS。
- 中文版本連結和機器直譯是兩個獨立結果；機器直譯不冒充正式名稱。
- 額外服務費用為零，執行期不依賴 Codex，不保存查詢。

### I1：最小實作

- 狀態：implementation_complete／PASS。
- 新增 nhentai v2 adapter、嚴格中文版本比對、v2 service worker、Chrome Translator API wrapper 與新版 side panel。
- manifest 0.3.0 最低 Chrome 138，只保留 `sidePanel` 與精確 nhentai host permission。

### I2：離線與整合驗證

- 狀態：implementation_complete／PASS。
- fixture 覆蓋有效中文版本、續篇、非中文、作者衝突、頁數差異、英日翻譯輸入、訊息來源及 Translator wrapper。
- `npm run quality` 通過；真實 Chrome Translator 語言包與 UI 仍屬 A6。

### A6：Chrome 實機驗收

- 狀態：implementation_complete／CONCERNS。
- 重新載入未封裝擴充功能，確認 manifest 顯示 0.3.3；提交一組 1–10 筆號碼後，確認每筆結果、單筆失敗隔離、標題／作者／社團搜尋連結、免費語言包下載、離線翻譯、中文版本連結與不保存。
- 完成前不得標示最終 accepted。

- 使用者已取消 DLsite／授權閱讀資源與查詢保存。現行目標只保留六位號碼、來源 metadata、具來源的中文名稱及可用作者。
- F1 與其後舊 A3 至 A5 只保留歷史，不再執行。A1、A2、B1 至 B3 的可重用基礎仍為 accepted。
- V1 已完成免費來源能力矩陣：nhentai v2 是唯一同時符合資料類型、零費用與程式可用性的候選，但中文名稱覆蓋不足。
- V2 已完成 10 筆探索與 10 筆留置：探索 3/10；留置 1/10；兩者皆 0 次已知誤配。
- V3 gate 為 FAIL，因留置 10% 未達 80%。在使用者核准替代契約前，C1、I1、I2 與 A6 不得開始。
- C1 只討論並凍結新契約：接受自動直譯、接受 Codex 每次介入、接受人工確認，或接受目前低覆蓋率。不得自行替使用者選擇。
- I1 才能依核准契約更新 v2 API、純記憶體查詢、匹配與 UI；同時移除查詢歷史、DLsite provider 與不必要權限。
- I2 驗證空結果、同名、續篇、合集、速率、取消、逾時及不保存；A6 維持最終使用者實機阻擋。
- 詳見 `CHINESE_TITLE_SOURCE_MATRIX.md` 與 `CHINESE_TITLE_FEASIBILITY_REPORT.md`。下方修訂 2 至 4 與舊階段細節只作歷史；與修訂 5 衝突時以本節為準。

## 修訂 2：先完成可自動驗證功能，集中補驗

- A2 至 A5 的實機或外部網站核對改為 non-blocking，統一登錄於 `SUPPLEMENTAL_VALIDATION.md`。各階段仍須完成程式碼、離線 fixture、整合測試及必要獨立審查，才能前進。
- A6 彙整所有尚未執行的補驗。程式碼與自動測試完成後可標記 `implementation_complete`；ACC-A6-001 通過前，A6 gate 維持 `CONCERNS`，專案不得標記為最終 accepted。
- 工具無法開啟網站、操作瀏覽器內部頁面或完成人工驗證，只能記為 pending／blocked，不得推定結果或繞過限制。

## 修訂 3：把 DLsite 可行性改為前置阻擋閘門

- 保留 A1、A2 已 accepted 的歷史，在 A2 與 A3 之間新增 F1。
- F1 只建立可丟棄的 DLsite Probe，不延續正式候選、配對或 UI 實作。
- F1 必須以一般 Chrome 實測搜尋頁、商品頁與人工接手狀態。ACC-F1-001 通過前，A3 至 A6 不得開始或繼續。
- DEC-008 取代 DEC-007 中「A3 實站核對可延後且不阻擋後續實作」的部分；其他補驗仍依 DEC-007 管理。

## 修訂 4：抽出不依賴實站的共用基礎

- 新增 B1、B2、B3，承接原 A4、A5、A6 中不依賴 DLsite 真實欄位、真值或 Chrome 實機的工作。
- B1 只建立純文字正規化、穩定排序與評估統計，不設定正式特徵權重或高信心門檻。
- B2 只建立本機狀態、診斷、安全訊息與無障礙的共用基礎；與網站 DOM 有關的錯誤復原仍留在 A5。
- B3 只建立自動品質閘門、效能基線及封裝前檢查；Chrome 安裝與端到端驗收仍留在 A6。
- F1 的 Probe 實作已完成，但 blocking 實站驗收改在 B3 accepted 後接續。這項排序不把 F1 寫成已通過，也不解除 A3 至 A6 對 F1 的相依。

## A1：Chrome 擴充功能骨架與可驗證基線

### 需求對應

- REQ-001、REQ-002、REQ-003、REQ-012
- COMP-001、COMP-002、COMP-003
- SEC-001、SEC-003、SEC-005

### 目標

建立不需編譯及伺服器的 Manifest V3 骨架，完成側邊面板、六位數驗證、service worker 訊息往返、精確網域導覽、本機狀態 schema，以及可離線執行的最小測試基線。

### 非目標

不擷取真實來源資料，不搜尋 DLsite，不實作候選評分。

### 前置條件與相依階段

無。

### 預期成果

- 可由 `chrome://extensions` 載入的擴充功能。
- 側邊面板輸入與狀態介面。
- manifest、模組目錄、訊息 schema、狀態 schema 與最小權限說明。
- 不依賴套件管理器的測試方案；若無法滿足，再提出工具選擇，不直接安裝。

### 實作方向

使用原生 ES modules、HTML、CSS 與 Chrome APIs。採 side panel 作持續介面，service worker 管理工作狀態與分頁，content script 先只做握手。所有 URL 由固定 base URL 與通過驗證的數字組合。

### 可能影響的系統或資料

Chrome 擴充功能權限、本機 `chrome.storage.local`、由擴充功能開啟的來源分頁。

### 階段內任務與並行候選

循序執行。manifest、訊息 schema、UI 與測試骨架會反覆調整共同介面，不適合在邊界確立前並行修改。

- A1-T1：確認精確來源網域、URL 形式、Chrome 最低版本與必要權限。
- A1-T2：建立 manifest、side panel、service worker 與模組結構；相依 A1-T1。
- A1-T3：完成輸入驗證、導覽、狀態保存與清除；相依 A1-T2。
- A1-T4：建立離線測試與本機載入檢查；相依 A1-T3。
- A1-T5：同步文件、驗收證據與下一階段交接；相依 A1-T4。

### 必要測試

- manifest 可解析且無遠端程式碼、`<all_urls>` 或非必要權限。
- 輸入有效值、前後空白、少於六位、多於六位、字母、全形數字與空值。
- 相同號碼重複送出結果一致。
- URL 建構只可能指向核准 HTTPS 網域。
- 狀態可在側邊面板關閉、分頁切換及 service worker 休眠後恢復。
- Chrome 152 未封裝載入 smoke test。

### 完成條件

- REQ-001、REQ-002、REQ-003 的基礎行為完成且有自動測試。
- 本機 Chrome 能載入擴充功能，點擊圖示可開側邊面板並正確導向測試號碼。
- 權限逐項附理由，沒有超出 A1 所需範圍。
- 開發與測試不需啟動伺服器，也沒有 AI 或遠端判定依賴。

### 人工或外部驗收

- 類型：blocking
- 項目：ACC-A1-001，由使用者或驗收者在 Chrome 152 載入未封裝擴充功能，確認側邊面板與來源導覽可用。

### 獨立審查

conditional：若新增頁面主世界腳本、廣泛權限或套件依賴，須執行獨立審查；否則可由階段整合檢查放行。

### 風險與未知事項

- 精確來源網域或 URL 形式若改變，會影響 host permissions。
- Chrome side panel 的開啟方式與使用者操作限制需在實機驗證。

## A2：來源作品資料擷取與人工接手

### 需求對應

- REQ-004、REQ-005、REQ-006、REQ-013、REQ-014
- QREQ-001、QREQ-006、QREQ-007
- SEC-002、SEC-003、SEC-004

### 目標

從正常 Chrome 分頁可靠取得原始標題變體與作品識別資料，遇到網站保護或擷取器失效時能安全停止並提示人工處理。

### 非目標

不查詢 DLsite，不評分候選，不繞過網站存取控制。

### 前置條件與相依階段

- A1 accepted。

### 預期成果

- `source` adapter、欄位 schema、證據 schema 與錯誤分類。
- 同源 API、結構化資料、中繼資料、DOM 的固定優先序及 fallback。
- 去識別化頁面 fixture 與實機驗收報告。

### 實作方向

優先解析頁面已提供的結構化資料。若必須呼叫同源 API，先在 content script 可行範圍實作；只有隔離環境確實無法取得時，才使用封裝內的 MAIN world bridge，並限制訊息欄位及來源。

### 可能影響的系統或資料

來源網站分頁、擴充功能本機工作狀態、去識別化測試 fixture。

### 階段內任務與並行候選

- id: A2-T1
  title: 擷取介面與離線 fixture 規格
  depends_on: []
  parallel_candidate: false
- id: A2-T2
  title: 來源 adapter 與錯誤分類
  depends_on: [A2-T1]
  parallel_candidate: false
- id: A2-T3
  title: 離線 parser 測試補強
  depends_on: [A2-T1]
  parallel_candidate: true
  parallel_group: A2-P1
  mode: disjoint_write
  scope:
    read_paths: [src/adapters/source/, test/fixtures/source/]
    write_paths: [test/source/]
    forbidden_write_paths: [src/, manifest.json]
  deliverable: parser 邊界與錯誤案例測試
  verification: [離線測試可執行且先對未實作案例失敗]
  join_verification: [完成 adapter 後執行完整 source 測試套件]
- id: A2-T4
  title: 實機案例與人工阻擋分類表
  depends_on: [A2-T1]
  parallel_candidate: true
  parallel_group: A2-P1
  mode: read_only
  scope:
    read_paths: [docs/PROJECT_SPEC.md, test/fixtures/source/]
    write_paths: []
    forbidden_write_paths: [src/, test/]
  deliverable: 不修改工作區的實機觀察回報
  verification: [每個號碼記錄可存取、人工接手或不存在]
  join_verification: [與 adapter 結果逐案核對]
- id: A2-T5
  title: adapter、測試與實機證據整合
  depends_on: [A2-T2, A2-T3, A2-T4]
  parallel_candidate: false

### 必要測試

- 每種擷取來源及 fallback 優先序的 fixture 測試。
- 缺欄位、惡意字串、超長內容、schema 改變、404、驗證頁與非預期頁面。
- 所有 REQ-013 號碼的實機結果分類與重複輸入一致性。
- 網頁文字插入側邊面板時不執行 HTML 或 script。
- MAIN world bridge 若存在，驗證非法來源與不合 schema 訊息會被拒絕。

### 完成條件

- 所有可正常開啟的驗收案例，其擷取資料與來源可見或結構化資料一致。
- 不可存取案例都進入明確的人工接手或錯誤狀態。
- 沒有儲存 Cookie、頁面全文或作品內容。

### 人工或外部驗收

- 類型：non-blocking
- 項目：ACC-A2-001／SUP-A2-001，依 REQ-013 在真實 Chrome 分頁逐案核對來源標題與作者／社團；可存取案例須全數一致。工具無法執行時列入補驗，不阻擋 A3 技術實作。

### 獨立審查

required。

### 風險與未知事項

- 某些號碼可能已刪除、限制地區或需要人工驗證，不能把不可存取誤判為擷取失敗。
- 頁面結構改版會使 selector fallback 失效，結構化來源須優先。

## B1：純文字與評估核心

### 需求對應

- REQ-009、REQ-010
- QREQ-002、QREQ-003、QREQ-004、QREQ-005、QREQ-006

### 目標

建立不依賴網站 DOM 或正式候選欄位的文字正規化、標題變體、集合相似度、穩定排序與評估統計工具。

### 非目標

不決定 DLsite 正式特徵、不設定權重或高信心門檻、不以合成資料宣稱真實準確率。

### 前置條件與相依階段

- A2 accepted。

### 預期成果

- 純函式文字正規化與核心標題變體。
- 可重現的相似度與穩定排序工具。
- precision、coverage、abstention rate 評估工具。
- 邊界、重複輸入與效能測試。

### 實作方向

只處理 Unicode NFKC、大小寫、控制字元、標點、括號附註與空白。評估工具只接收明確的真值及判定結果，不內建任何網站欄位或門檻。

### 可能影響的系統或資料

新增 `src/core/` 純函式與對應離線測試，不接觸瀏覽器、儲存或網路。

### 階段內任務與並行候選

循序執行；函式契約與測試共用同一介面。

- B1-T1：凍結正規化、排序與評估輸入輸出契約。
- B1-T2：實作純函式；相依 B1-T1。
- B1-T3：補齊邊界、確定性與效能測試；相依 B1-T2。
- B1-T4：執行完整回歸並同步文件；相依 B1-T3。

### 必要測試

- 全形／半形、大小寫、控制字元、空白、標點及括號附註。
- 空值、超長輸入、重複變體及不修改原始輸入。
- 相似度範圍、空集合、完全相同及完全不同。
- 同分排序結果固定，不依賴輸入陣列被原地修改。
- precision、coverage、abstention rate 的零分母與混合案例。
- 代表性批次在 500 毫秒內完成。

### 完成條件

- 所有純函式有固定測試且輸出可重現。
- 沒有網站名稱、selector、正式權重或門檻常數。
- 完整離線回歸與語法檢查通過。

### 人工或外部驗收

- 類型：none

### 獨立審查

none。

### 風險與未知事項

- 括號可能屬於作品正式名稱；因此同時保留完整與去附註版本，不直接刪改來源值。

## B2：本機可靠性與安全基礎

### 需求對應

- REQ-012、REQ-014、REQ-015
- QREQ-007、QREQ-008
- SEC-001 至 SEC-006

### 目標

建立與網站內容無關的本機狀態上限、schema 損壞復原、診斷 allowlist、安全訊息邊界及側邊面板無障礙檢查。

### 非目標

不處理真實 DLsite 錯誤頁、不新增網站權限、不完成 A5 的實機安裝與使用說明驗收。

### 前置條件與相依階段

- B1 accepted。

### 預期成果

- 本機狀態與診斷輸出的資料上限及清理規則。
- 診斷 allowlist 與敏感欄位排除測試。
- 訊息來源、URL 與 schema 的負面測試。
- 側邊面板鍵盤、label、live region 與非顏色提示檢查。

### 實作方向

沿用既有 A1、A2 契約，只新增網站無關的防護與測試。若某項需要知道 F1 的正式商品欄位，保留到 A5。

### 可能影響的系統或資料

`src/core/`、`src/ui/`、本機狀態與診斷測試。

### 階段內任務與並行候選

循序執行；狀態、訊息與診斷共用 schema，不拆成並行修改。

- B2-T1：盤點既有狀態、訊息與 UI 邊界。
- B2-T2：實作資料上限、診斷 allowlist 與損壞復原；相依 B2-T1。
- B2-T3：補齊安全與無障礙測試；相依 B2-T2。
- B2-T4：執行完整回歸並同步文件；相依 B2-T3。

### 必要測試

- 損壞、過期、超長與未知 schema 狀態安全復原。
- 診斷輸出不含 Cookie、Authorization、頁面全文或未列入 allowlist 的欄位。
- 非目前分頁、錯誤 extension ID、任意 URL 與未知訊息被拒絕。
- 主要 UI 控制項有 label，可由鍵盤操作，狀態有 live region，信心不只靠顏色。

### 完成條件

- 網站無關的可靠性與安全測試全數通過。
- 未新增權限、遠端程式碼或敏感資料保存。
- 需要 F1 的項目明確保留到 A5，不以 mock 宣稱完成。

### 人工或外部驗收

- 類型：none

### 獨立審查

none。

### 風險與未知事項

- A3 正式候選 schema 可能改變，診斷欄位必須維持 allowlist 並在 A5 重新整合。

## B3：自動品質閘門

### 需求對應

- QREQ-004、QREQ-005、QREQ-006、QREQ-008
- COMP-001、COMP-002
- SEC-001、SEC-003、SEC-004、SEC-005、SEC-006

### 目標

建立可重複執行的 manifest、CSP、權限、禁止 API、語法、效能及測試完整性檢查，作為後續階段共同品質閘門。

### 非目標

不替代 Chrome 未封裝載入、不執行真實網站端到端測試、不封存正式版本。

### 前置條件與相依階段

- B2 accepted。

### 預期成果

- 單一自動檢查入口。
- manifest／CSP／精確網域與禁止模式檢查。
- 純函式效能基線與測試清單完整性檢查。
- A6 可沿用的封裝前檢查報告格式。

### 實作方向

沿用無套件管理器的 Node 測試方式；所有檢查只讀取工作區，失敗時回傳非零狀態。

### 可能影響的系統或資料

`test/`、`package.json` 與開發文件，不存取外部網路。

### 階段內任務與並行候選

循序執行；測試入口與檢查清單互相依賴。

- B3-T1：定義自動品質閘門清單。
- B3-T2：實作統一檢查入口；相依 B3-T1。
- B3-T3：建立失敗案例並驗證非零結束狀態；相依 B3-T2。
- B3-T4：執行完整品質閘門並同步文件；相依 B3-T3。

### 必要測試

- 遠端程式碼、`<all_urls>`、非預期權限、危險 DOM API 與敏感資料 API 能被檢查器攔截。
- JavaScript 語法錯誤與測試失敗會使入口回傳非零狀態。
- 代表性純函式工作符合 500 毫秒基線。
- 檢查結果不寫入瀏覽資料或修改來源檔案。

### 完成條件

- 單一指令可重跑全部離線品質檢查。
- 正常工作區通過，固定違規 fixture 會失敗。
- 不需要瀏覽器、伺服器或網路。

### 人工或外部驗收

- 類型：none

### 獨立審查

none。

### 風險與未知事項

- 靜態檢查只能找已定義模式，不能取代 A5 的整合審查與 A6 實機驗收。

## F1：DLsite 最小可行性探針與阻擋驗收

### 需求對應

- REQ-007、REQ-008、REQ-017
- QREQ-001、QREQ-003、QREQ-006、QREQ-007
- SEC-001、SEC-003、SEC-005、SEC-006

### 目標

在正式串接前，以獨立且可丟棄的 Chrome 擴充功能驗證 DLsite 搜尋頁及商品頁是否提供足以完成候選擷取、繁體中文判定及原作關聯核對的公開資料。

### 非目標

不接收六位數、不讀取來源網站、不計算配對分數、不修改正式側邊面板流程，也不把 Probe 程式碼直接當成正式 adapter。

### 前置條件與相依階段

- B3 accepted。Probe 實作已完成；本階段只剩 blocking 實站驗收與結果判定。

### 預期成果

- 位於 `probe/dlsite-feasibility/` 的可載入 Manifest V3 Probe。
- 搜尋頁候選與商品頁明確欄位的有界擷取結果。
- 離線 fixture 測試與人工實測操作說明。
- 對搜尋、繁中訊號、原作關聯及人工接手四項能力的 PASS／FAIL 證據。

### 實作方向

Probe 由使用者手動輸入標題並開啟 DLsite 搜尋頁；在目前分頁執行有界擷取，僅顯示 URL、商品 ID、標題、作者／社團、相關欄位和值、選擇器及人工接手狀態。不得擷取頁面全文、Cookie、Authorization header 或作品內容。

### 可能影響的系統或資料

一般 Chrome 的 DLsite 分頁、Probe popup 及暫時顯示的精簡擷取結果。Probe 不寫入 `chrome.storage`。

### 階段內任務與並行候選

循序執行。擷取欄位與實站觀察互相影響，不安排並行工作。

- F1-T1：凍結可行性問題、資料上限及 PASS／FAIL 門檻。
- F1-T2：建立獨立 Probe、搜尋頁與商品頁擷取器；相依 F1-T1。
- F1-T3：建立去識別化 fixture 與離線測試；相依 F1-T2。
- F1-T4：由使用者在一般 Chrome 載入 Probe 並完成實站案例；相依 F1-T3。
- F1-T5：依實測證據決定繼續 A3、縮減成候選搜尋工具或停止 DLsite 自動判定；相依 F1-T4。

### 必要測試

- Probe manifest 可解析，僅允許 `https://www.dlsite.com/*`，不含遠端程式碼或 `<all_urls>`。
- 搜尋 URL 正確編碼，空白輸入與非 DLsite 分頁安全失敗。
- 搜尋頁只擷取 DLsite 商品連結，去重並限制最多 20 筆。
- 商品頁只保留相關標籤和值；每個值有實際 selector 證據，且單欄與總筆數有上限。
- 驗證碼、登入、年齡確認及非預期頁面回報 `manual_action` 或 `unsupported`。
- 實站至少涵蓋 3 組繁中正例及 2 組非繁中對照；若找不到足夠正例，記為資料不足，不得推定通過。

### 完成條件

- 離線測試與語法檢查通過。
- 實站搜尋頁能穩定提供商品 ID、標題與商品 URL，且不混入站外項目。
- 商品頁有明確、可機器讀取的繁中訊號，並至少有兩項可與來源交叉核對的欄位；不得只靠譯名猜測。
- 人工接手頁能安全停止。
- ACC-F1-001 為 passed；否則 F1 維持 implementation_complete／CONCERNS，A3 不得開始。

### 人工或外部驗收

- 類型：blocking
- 項目：ACC-F1-001／SUP-F1-001，由使用者在 Chrome 152 載入 `probe/dlsite-feasibility/`，完成 3 組繁中正例與 2 組非繁中對照並提供 Probe 輸出。

### 獨立審查

none。Probe 是可丟棄的前置驗證工具，離線測試與 blocking 實站證據共同決定結果。

### 風險與未知事項

- DLsite 可能依語系、地區、年齡設定或商品分類使用不同 URL 與 DOM。
- 商品頁可能沒有明示原作關聯；若只能從譯名猜測，正式範圍必須縮減。

## A3：DLsite 查詢、候選擷取與真值集

### 需求對應

- REQ-007、REQ-008、REQ-013、REQ-014
- QREQ-003、QREQ-006、QREQ-007
- SEC-003、SEC-005

### 目標

依固定查詢策略搜尋 DLsite，擷取足以供配對的候選資料，並建立人工核對的真值與「無法確認」標記。

### 非目標

本階段不完成最終自動配對門檻，不把搜尋排序當成作品相同性證明。

### 前置條件與相依階段

- F1 accepted，且 ACC-F1-001 passed。

### 預期成果

- DLsite adapter、查詢策略、候選 schema、查詢上限及錯誤分類。
- 去識別化 DLsite fixture。
- 對 REQ-013 案例的人工真值帳本；沒有可確認對應時明確記錄 unknown 或 no-match。

### 實作方向

依序嘗試日文完整標題、清理後日文標題、英文或顯示標題、標題加作者／社團。查詢去重並設上限。只讀取搜尋結果與商品頁明確標示的資料。

### 可能影響的系統或資料

DLsite 分頁、本機候選資料與人工真值紀錄。

### 階段內任務與並行候選

- A3-T1：定義查詢與候選 schema；循序。
- A3-T2：實作 DLsite adapter；相依 A3-T1。
- id: A3-T3
  title: 補齊離線 fixture 測試
  depends_on: [A3-T1]
  parallel_candidate: true
  parallel_group: A3-P1
  mode: disjoint_write
  scope:
    read_paths: [docs/PROJECT_SPEC.md, test/fixtures/dlsite/]
    write_paths: [test/dlsite/]
    forbidden_write_paths: [src/, manifest.json, docs/ACCEPTANCE.md]
  deliverable: DLsite parser、查詢與錯誤案例測試
  verification: [測試可離線執行，並能辨識預期失敗]
  join_verification: [完成 adapter 後執行完整 DLsite 測試套件]
- id: A3-T4
  title: 唯讀執行實機搜尋並提出真值候選
  depends_on: [A3-T1]
  parallel_candidate: true
  parallel_group: A3-P1
  mode: read_only
  scope:
    read_paths: [docs/PROJECT_SPEC.md, docs/ACCEPTANCE.md]
    write_paths: []
    forbidden_write_paths: [src/, test/, manifest.json]
  deliverable: 每個驗收號碼的查詢、候選與人工核對建議回報
  verification: [逐案附 DLsite 原始網址及觀察時間，不自行判定 unknown 案例]
  join_verification: [與 adapter 正式輸出逐案比對，差異交由人工判斷]
- A3-T5：由人工確認真值並整合證據；相依 A3-T2、A3-T3、A3-T4。

執行時仍須確認 A3-T3 不讀取 A3-T4 的暫存輸出；若真值回報需要寫入工作區，兩項改為循序執行。

### 必要測試

- 日文、英文、空格、標點、特殊字元及作者組合的 URL 編碼。
- 查詢去重、次數上限、停止、無結果、驗證頁與 DOM 改版 fixture。
- 候選欄位不得混入廣告、推薦項目或站外連結。
- REQ-013 案例逐案記錄查詢字串、候選與人工結論。

### 完成條件

- 可從 fixture 與實機頁面穩定產生相同候選 schema。
- 每個驗收號碼都有可稽核的查詢紀錄與候選狀態。
- 真值不足時保留 unknown，不為了後續評分捏造配對。

### 人工或外部驗收

- 類型：non-blocking
- 項目：ACC-A3-001／SUP-A3-001，使用者核對真值帳本中被標成同一作品的 DLsite 項目。工具無法執行時列入補驗，不阻擋 A4 技術實作；未核對資料不得充當真值。

### 獨立審查

required。

### 風險與未知事項

- DLsite 未必有相同作品，中文或繁體中文版更不保證存在。
- 搜尋頁可能依語系、地區或年齡設定呈現不同結果。

## A4：確定性配對、信心校準與完整流程

### 需求對應

- REQ-009、REQ-010、REQ-011、REQ-013
- QREQ-002、QREQ-003、QREQ-004、QREQ-005、QREQ-006

### 目標

完成不依賴 AI 的正規化、評分、信心分級與端到端工作流，並用人工真值校準高信心門檻。

### 非目標

不以模糊猜測提高命中率，不對沒有真值的案例宣稱準確。

### 前置條件與相依階段

- A3 accepted，且真值帳本已完成阻擋式驗收。

### 預期成果

- 純函式正規化及計分模組。
- 集中管理的權重、門檻與版本。
- 高信心、待確認、未找到三種結果。
- 端到端結果畫面與精確率／涵蓋率報告。

### 實作方向

使用 Unicode NFKC、大小寫統一、空白及標點清理、括號標籤及常見版本詞處理。分別計算完整標題、核心標題、作者／社團與語言版本訊號；高信心判定同時要求最低總分及第一、第二名差距。

### 可能影響的系統或資料

本機評分設定、結果狀態、人工真值及測試報告。

### 階段內任務與並行候選

- A4-T1：鎖定正規化規格與評分介面；循序。
- A4-T2：實作正規化與評分；相依 A4-T1。
- id: A4-T3
  title: 建立真值驅動的門檻校準測試
  depends_on: [A4-T1]
  parallel_candidate: true
  parallel_group: A4-P1
  mode: disjoint_write
  scope:
    read_paths: [docs/PROJECT_SPEC.md, test/fixtures/matching/, src/core/matching-contract.js]
    write_paths: [test/matching/]
    forbidden_write_paths: [src/core/, src/ui/, manifest.json]
  deliverable: 正規化、排序、信心門檻與統計報告測試
  verification: [固定真值輸入產生可重現的 precision、coverage 與 abstention rate]
  join_verification: [與正式評分模組整合後執行完整 matching 測試]
- id: A4-T4
  title: 實作結果 UI
  depends_on: [A4-T1]
  parallel_candidate: true
  parallel_group: A4-P1
  mode: disjoint_write
  scope:
    read_paths: [docs/PROJECT_SPEC.md, src/core/matching-contract.js]
    write_paths: [src/ui/]
    forbidden_write_paths: [src/core/, test/matching/, manifest.json]
  deliverable: 高信心、待確認與未找到的結果元件
  verification: [以固定 mock 資料驗證三種狀態、鍵盤操作與安全文字輸出]
  join_verification: [接上正式評分輸出後執行端到端 UI 測試]
- A4-T5：整合端到端流程並跑完整測試；相依 A4-T2、A4-T3、A4-T4。

只有 A4-T1 已建立並凍結 `matching-contract.js` 時才可並行；否則循序執行。

### 必要測試

- 中日英文、全半形、假名、標點、括號標籤、版本字樣及空白差異。
- 同名不同作者、作者相同但標題不同、譯名差異、第一二名接近及無候選案例。
- 重複輸入的分數、排序與結果完全一致。
- 以真值集計算 confusion matrix、precision、coverage 與 abstention rate。
- 排除網路時間的解析及排序效能測試。

### 完成條件

- 所有固定測試通過，結果可重現。
- 高信心規則符合 QREQ-002；樣本不足時依規格明確限制宣稱。
- 信心不足時不自動選定作品。
- 使用者可看見主要加分、扣分與原始連結。

### 人工或外部驗收

- 類型：non-blocking
- 項目：ACC-A4-001／SUP-A4-001，使用者抽查所有高信心結果；若真值樣本達 20 筆，另核對精確率至少 95%。工具無法執行時列入補驗，不阻擋 A5 技術實作；樣本不足時不得宣稱達標。

### 獨立審查

required。

### 風險與未知事項

- 初始案例數可能不足以支持 95% 的統計宣稱，應先以零誤判與保守 abstain 為準。
- 不同譯名可能需要增加明確、可測試的字典，但不得改用 AI 猜測。

## A5：可靠性、隱私、診斷與使用說明

### 需求對應

- REQ-012、REQ-014、REQ-015
- QREQ-007、QREQ-008
- SEC-001 至 SEC-006

### 目標

補齊錯誤復原、資料清除、安全訊息處理、診斷摘要、無障礙與本機安裝說明，準備正式驗收。

### 非目標

不新增搜尋來源、不擴大網站權限、不發布到 Chrome Web Store。

### 前置條件與相依階段

- A4 accepted。

### 預期成果

- 完整錯誤狀態及重試流程。
- 隱私與權限說明、診斷匯出、清除本機資料功能。
- 未封裝安裝、更新、停用與移除說明。
- 安全與無障礙檢查報告。

### 實作方向

集中錯誤代碼與使用者訊息；匯出前以 allowlist 建立診斷資料。檢查所有 DOM 輸出、訊息來源、URL 建構與 storage schema。

### 可能影響的系統或資料

擴充功能本機儲存、診斷文字、使用說明。

### 階段內任務與並行候選

- A5-T1：鎖定錯誤與診斷 schema；循序。
- A5-T2：錯誤復原與診斷功能；相依 A5-T1。
- id: A5-T3
  title: 安全與權限唯讀審查
  depends_on: [A5-T2]
  parallel_candidate: true
  parallel_group: A5-P1
  mode: read_only
  scope:
    read_paths: [manifest.json, src/, test/, docs/PROJECT_SPEC.md]
    write_paths: []
    forbidden_write_paths: [src/, test/, docs/]
  deliverable: 權限、CSP、訊息、URL 與儲存風險清單
  verification: [每項發現附檔案位置、重現方式與規格對應]
  join_verification: [整合修正後重跑安全靜態檢查及相關測試]
- id: A5-T4
  title: 使用說明與無障礙檢查
  depends_on: [A5-T2]
  parallel_candidate: true
  parallel_group: A5-P1
  mode: disjoint_write
  scope:
    read_paths: [src/ui/, docs/PROJECT_SPEC.md]
    write_paths: [docs/USAGE.md, test/accessibility/]
    forbidden_write_paths: [src/, manifest.json, test/core/]
  deliverable: 未封裝安裝說明與無障礙驗證案例
  verification: [依文件從乾淨設定檔完成載入步驟，無障礙測試可執行]
  join_verification: [整合修正後執行完整 UI、無障礙與安裝 smoke test]
- A5-T5：整合修正與完整回歸；相依 A5-T2、A5-T3、A5-T4。

審查若發現需要修改 `src/ui/`，A5-T4 必須停止寫入，改由 A5-T5 循序整合。

### 必要測試

- 各錯誤代碼、重試、取消、分頁被關閉、離線與 service worker 重啟。
- 診斷摘要不含 Cookie、header、頁面全文、作品內容或未列入 allowlist 的欄位。
- 儲存上限、清除紀錄、schema 升級與損壞資料復原。
- 鍵盤操作、焦點順序、label、live region 與非顏色提示。
- 權限與 CSP 靜態檢查。

### 完成條件

- SEC-001 至 SEC-006 全部有檢查證據。
- 使用者可自行安裝、更新、清除資料及移除擴充功能。
- 常見失敗不會卡死，診斷資料足以區分問題階段。

### 人工或外部驗收

- 類型：non-blocking
- 項目：ACC-A5-001／SUP-A5-001，使用者依說明從空白 Chrome 設定檔載入並完成一次查詢，確認權限提示與本機資料清除符合預期。工具無法執行時列入補驗，不阻擋 A6 自動回歸。

### 獨立審查

required。

### 風險與未知事項

- 網站廣告與跳轉屬不可信內容，必須確認不會藉訊息通道觸發任意導覽。
- 未封裝擴充功能的開發人員模式提示屬 Chrome 行為，文件需清楚說明。

## A6：實機回歸、驗收與第一版封存

### 需求對應

- REQ-001 至 REQ-015
- QREQ-001 至 QREQ-008
- COMP-001、COMP-002、COMP-003、COMP-004
- SEC-001 至 SEC-006
- REQ-016
- 專案成功條件 1 至 6

### 目標

在 Chrome 152 完成固定案例、失敗案例、安全與回歸驗收，整理可交付的第一版資料夾與證據。

### 非目標

不新增功能、不改用其他技術、不上架商店。

### 前置條件與相依階段

- A5 accepted。

### 預期成果

- 完整測試與驗收報告。
- 版本化、可載入的擴充功能資料夾。
- 已知限制、問題清單、權限清單與使用說明。

### 實作方向

先凍結候選版本，再執行離線、整合及實機測試。驗收發現的缺陷依影響回到對應階段修正，不在 A6 偷加功能。

### 可能影響的系統或資料

Chrome 測試設定檔、本機驗收紀錄與版本資料。

### 階段內任務與並行候選

循序執行。實機網站狀態、真值與候選版本是共同可變基線，為避免證據混淆不安排並行。

- A6-T1：凍結候選版本與測試環境紀錄。
- A6-T2：執行全部離線與整合測試。
- A6-T3：執行工具可達的 REQ-013 實機測試；無法執行的項目逐筆更新補驗清單，不得推定結果。
- A6-T4：執行獨立階段放行審查。
- A6-T5：整理交付資料與已知限制。

### 必要測試

- 全部自動測試與 manifest 靜態檢查。
- REQ-013 固定案例、重複案例、無效輸入、來源阻擋、DLsite 無結果與候選歧義。
- 從乾淨 Chrome 設定檔載入、停用、重啟、更新及移除。
- 本機資料清除與診斷資料抽查。

### 完成條件

- 所有自動測試通過後可到 `implementation_complete`；所有 blocking acceptance 為 passed 或由使用者明確 waived 後，才能設為 `accepted`。
- 所有成功條件有可追溯證據。
- 獨立審查結果為 PASS。
- 交付資料不含測試 Cookie、瀏覽資料、頁面全文或作品內容。

### 人工或外部驗收

- 類型：blocking
- 項目：ACC-A6-001，使用者完成第一版整體操作驗收並接受已知限制。

### 獨立審查

required。

### 風險與未知事項

- 外部網站在驗收期間的暫時故障須與產品缺陷分開記錄，不能直接視為通過或失敗。
