# 開發日誌

## 2026-09-11｜A3｜核心可行性重新規劃

- 實際檢查：交接指定的七個 SHA-256 全數相符；工作區如預期不是 Git repository。已讀取 A3 規格、Roadmap、驗收與補驗限制。
- 關鍵結果：嘗試以公開 URL 讀取 DLsite 搜尋頁時，Browser Use 安全政策封鎖目標網站。沒有取得搜尋結果、商品頁欄位、語言版本提示或中文版資源的真實證據；也沒有嘗試繞過封鎖、登入、年齡確認、驗證碼或其他存取控制。
- 影響：DLsite 是「來源作品資料 → 候選 → 中文版資源」的核心環節。現有 A3 至 A6 的技術設計只可視為離線假設，不能當作實機可行性結論。
- 狀態：A3 改為 `needs_replan`，gate 為 `CONCERNS`。ACC-A3-001／SUP-A3-001 仍為 non-blocking pending，沒有改成 passed。
- 下一步：優先以使用者正常 Chrome 分頁確認最小流程：以已知日文標題搜尋 DLsite、開啟結果商品頁、檢查官方標示的語言或中文版資訊；再依可觀察的 URL、DOM 與欄位調整 adapter 與後續計畫。

## 2026-09-10｜規劃｜initialize

- 實際改動：建立 audited 分階段文件組與 `AGENTS.md`；定義 Chrome Manifest V3、側邊面板、來源擷取、DLsite 查詢、確定性配對、安全與實機驗收共六階段。
- 實際測試與結果：尚未執行程式測試；規劃前確認工作區為空且不是 Git repository。
- 既有功能影響：沒有程式碼，因此沒有既有功能變更。
- 限制：尚未在本機 Chrome 載入擴充功能；外部網站結構與測試號碼結果均待後續階段驗證。
- 下一步：執行 A1。

## 2026-09-10｜A1｜啟動交接

- 實際改動：將 A1 控制狀態改為 `in_progress`，準備交由同一 saved project 的 Local task 執行。
- 實際測試與結果：尚未執行 A1 程式測試。
- 並行執行：未使用；A1 依 Roadmap 循序執行。
- 既有功能影響：只有專案控制文件更新，尚無功能程式碼。
- 限制：工作區不是 Git repository，沒有 HEAD、分支或 git diff 證據。
- 下一步：建立 A1 task，先核對路徑與控制文件，再開始實作。

## 2026-09-10｜A1｜Chrome 擴充功能骨架與可驗證基線

- 實際改動：建立 Manifest V3 擴充功能、side panel、module service worker、受限來源握手、六位數驗證、固定來源 URL 建構、`chrome.storage.local` 狀態 schema、清除功能與離線測試。新增 `docs/PERMISSIONS.md` 與 `docs/A1_BASELINE.md`。
- 來源與權限：固定導覽 `https://nhentai.net/g/<六位數>/`；只申請 `sidePanel`、`storage` 與 `https://nhentai.net/*`。未加入 `tabs`、`scripting`、DLsite host permission、MAIN world 腳本、套件、遠端程式碼或 `<all_urls>`。
- 實際測試與結果：`node test/run-tests.mjs` 通過；`node --check src/background/service-worker.js`、`node --check src/ui/side-panel.js`、`node --check src/content/handshake.js` 通過。Node 版本為 `v16.17.0`。首次測試發現 Node 將 `.js` 視為 CommonJS，已加入不含相依的 `package.json` 設定 `type: module` 後重跑通過。
- 實機驗收：未執行。ACC-A1-001 需要在 Chrome 152 載入未封裝擴充功能；驗收步驟位於 `docs/A1_BASELINE.md`。未將此項寫為通過。
- 並行執行：未使用；A1 依 Roadmap 循序執行。
- Git 證據：工作區不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。

- Gate：FAIL。blocking 驗收仍為 pending，A1 維持 `in_progress`，不得建立或實作 A2。
- 下一步：完成 ACC-A1-001 後，重新執行離線檢查並判定 A1 gate。

## 2026-09-10｜A1｜Chrome 152 載入嘗試與暫存清理

- 實際測試與結果：以獨立 Chrome 設定檔啟動 `Chrome/152.0.7977.83`，嘗試使用 `--load-extension` 與 `--disable-extensions-except` 載入 `D:\tools\godNum`。Chrome Remote Debugging 顯示的 service worker 經查為內建 Google Network Speech，非本專案。Chrome 152 已忽略未封裝擴充功能的命令列載入；本次嘗試不構成載入成功或 smoke test 證據。
- 限制：目前自動化介面沒有可控制的 Chrome 視窗或檔案選擇器，不能在 `chrome://extensions` 選擇未封裝資料夾。不得改用停用 Chrome 安全保護的命令列旗標繞過此限制。無法確認圖示點擊、面板 UI、表單送出、分頁切換、worker 休眠後恢復或清除按鈕。
- 暫存清理：已關閉三個隔離 Chrome 程序，刪除 `chrome-a1-smoke-profile`、`chrome-a1-extension-profile`、`chrome-a1-interactive-profile` 與空的 `output` 目錄。未動到使用者日常 Chrome 設定檔。
- 決策：新增 DEC-006，第一版完成後清除不必要的開發、驗收及暫時性設定。
- Gate：仍為 FAIL；A1 維持 `in_progress`，A2 未建立也未實作。

## 2026-09-10｜A1｜Computer Use 互動式驗收嘗試

- 實際測試與結果：Computer Use 偵測到目前 Google Chrome 的使用者分頁 `chrome://extensions/`，且可建立一般驗收分頁；但 Chrome 內部頁面不可由工具認領。從驗收分頁前往 `chrome://extensions/` 時，瀏覽器安全政策明確封鎖該導覽。工具因此無法確認未封裝擴充功能是否啟用，亦無法點擊圖示、開啟側邊面板或執行 `460733` 導覽、五種錯誤輸入、分頁切換與 worker 休眠後恢復、清除本機紀錄。
- 安全限制：沒有嘗試規避 Chrome 的內部頁面政策；沒有登入、提交年齡確認、處理驗證碼或繞過網站防護。未到達「清除本機紀錄」按鈕，故沒有觸發刪除前的即時確認。
- 離線測試：重新執行 `node test/run-tests.mjs`，`lookup.test.mjs` 與 `manifest-check.mjs` 全數通過。
- 文件與控制狀態：ACC-A1-001 記為 `blocked`；A1 維持 `in_progress`，gate 維持 `FAIL`。A2 未建立、未實作。
- 下一步：由具備直接 Chrome 介面存取權的驗收者完成 `docs/A1_BASELINE.md` 的 blocking 驗收，並以實測證據決定是否放行。

## 2026-09-10｜A1｜使用者實機確認與放行

- 實際驗收：使用者確認已在 Chrome 152 載入未封裝擴充功能，並由側邊面板輸入 `460733`，成功開啟 `https://nhentai.net/g/460733/`。
- 驗收判定：ACC-A1-001 為 passed。此使用者確認補足了 Computer Use 無法操作 Chrome 內部頁面的限制。
- 自動測試：`node test/run-tests.mjs` 仍為通過；`lookup.test.mjs` 與 `manifest-check.mjs` 全數通過。
- 並行執行：未使用；A1 全程循序執行。
- 獨立審查：不需要。A1 沒有新增頁面主世界腳本、廣泛權限或套件依賴。
- Git 證據：工作區仍不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。
- Gate：PASS。A1 設為 `accepted`；下一步交接 A2，目的 task 必須重新檢查並行安全性。

## 2026-09-10｜A2｜啟動與基線核對

- 基線核對：工作目錄為 `D:\tools\godNum`；檔案清單符合交接內容；工作區不是 Git repository。交接指定的七個 SHA-256 全數相符。
- 狀態：A1 已 accepted，ACC-A1-001 已 passed；控制狀態切換為 A2 `in_progress`，gate 尚未判定，ACC-A2-001 保持 pending。
- 並行執行：未使用。A2-T3 的測試內容依賴 A2-T1 契約與 A2-T2 adapter 邊界，A2-T4 又受相同 fixture 與 Chrome 人工操作基線影響；為避免規格與實機證據漂移，A2-P1 改為循序執行。
- 實際測試與結果：尚未執行 A2 測試。
- Git 證據：不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。
- 下一步：完成 A2-T1 至 A2-T5，不實作 DLsite 查詢或候選評分。

## 2026-09-11｜計畫修訂 2｜先完成可自動驗證功能

- 使用者決定：先完成並測試 A1 至 A6 可由代理執行的功能；Computer Use 或外部網站限制使代理無法執行的項目集中補驗，之後再與使用者共同操作。
- 文件改動：新增 REQ-016、DEC-007 與 `docs/SUPPLEMENTAL_VALIDATION.md`；A2 至 A5 實機驗收改為 non-blocking，A6 整體實機驗收維持 blocking；計畫版本升為 2。
- 狀態影響：A2 維持 `in_progress`。SUP-A2-001 至 SUP-A6-001 全部保持 pending；沒有把未執行測試或實機結果寫成通過。
- 實際測試與結果：本次只修訂計畫文件，尚未執行新增程式測試。
- 下一步：完成 A2 的自動化範圍與必要獨立審查，再依序接續 A3 至 A6。

## 2026-09-11｜A2｜自動化範圍完成，送交獨立審查

- 實際改動：新增來源 record、證據、錯誤及去識別化 fixture 契約；實作同源 API、內嵌結構化資料、標準中繼資料、DOM 四層逐欄 fallback；整合 content script、service worker、本機狀態、人工重試與 side panel 安全文字顯示。
- 安全與資料最小化：訊息限制精確 type、欄位 allowlist 與 18000 字元上限；來源訊息核對 extension ID、目前 tab ID、查詢號碼及來源 URL。只保存必要標題、作者／社團、頁數、來源網址及證據 locator；未加入 MAIN world bridge，也不讀取或保存 Cookie、Authorization header、頁面全文或作品內容。
- 實際測試與結果：`node test/run-tests.mjs` 通過；lookup、source adapter、runtime message schema 與 manifest 靜態檢查全數通過。另對 `src/`、`test/` 下全部 `.js`、`.mjs` 執行 `node --check`，全數通過。
- 測試範圍：完整 API、逐欄 fallback 優先序、缺少證據、惡意字串、超長文字與頁數、404、403、人工接手、網路錯誤、parser 失效、未知 schema 欄位、訊息長度及禁止 `innerHTML`／Cookie／Authorization 讀取。
- 補驗：Browser Use 安全政策拒絕來源網站，未執行 REQ-013 真實頁面分類。ACC-A2-001 與 SUP-A2-001 保持 pending，不當成通過證據。
- 並行執行：未使用；A2 循序完成。
- Git 證據：工作區不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。
- 狀態：A2 設為 `under_review`，等待 Roadmap 規定的獨立審查。

## 2026-09-11｜A2｜第一次獨立審查 FAIL 與修正

- 審查 task：`01a08e3c-4349-7b01-b185-a92e9c2aecb1`，唯讀審查。
- 審查結果：FAIL。人工處理或 403 outcome 與較低優先序標題同時存在時，原實作會先回傳 success，可能把驗證頁誤判為成功。
- 修正：把人工處理、401、403、429 與 404 設為終止結果；錯誤 record 清空資料及證據。標準中繼資料與 DOM fallback 另要求來源作品身分標記，結構化資料須有 gallery title 結構或相符 identifier／URL。
- 新增測試：人工處理、403、404 各自與中繼資料標題同時存在時，必須保持 manual_action 或 not_found，且不得保存該標題。
- 補驗：SUP-A2-001 仍為 non-blocking pending。
- 狀態：A2 暫回 `in_progress`，重跑完整測試後再送第二次獨立審查。

- 修正後驗證：`node test/run-tests.mjs` 通過；`src/` 與 `test/` 下全部 `.js`、`.mjs` 的 `node --check` 通過。A2 再次設為 `under_review`。

## 2026-09-11｜計畫修訂 3 與 F1｜DLsite 可行性前置閘門

- 使用者決定：先確認影響完整流程的 DLsite 技術點，再繼續正式實作。
- 計畫改動：計畫版本升為 3；保留 A1、A2 已 accepted 的歷史，在 A2 與 A3 之間新增 F1。ACC-F1-001 為 blocking，通過前不得執行 A3 至 A6。DEC-008 取代 DEC-007 中 A3 實站核對可延後的部分。
- Probe 實作：新增 `probe/dlsite-feasibility/`，可手動輸入標題開啟 DLsite 搜尋，並從目前搜尋頁或商品頁擷取有界欄位。只輸出頁面 URL、商品 ID、標題、站內商品網址、相關標籤和值、selector 證據及人工接手狀態；不使用 `chrome.storage`，不讀取 Cookie、Authorization header、頁面全文或作品內容。
- 實際測試：`node test/run-tests.mjs` 通過，包含新增的搜尋 URL、候選去重、站外連結排除、商品頁欄位 allowlist、繁中訊號、關聯訊號、人工接手與 Probe manifest 測試。
- 語法檢查：對 `src/`、`test/`、`probe/` 下共 25 個 `.js`／`.mjs` 執行 `node --check`，全數通過。
- 實站限制：Codex Browser Use 拒絕 DLsite，沒有執行真實網站測試。ACC-F1-001／SUP-F1-001 保持 pending；F1 為 implementation_complete／CONCERNS，A3 凍結。
- Git 證據：工作區不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。

## 2026-09-11｜F1｜代理可驗證範圍補強

- 使用者狀態：目前無法操作 Chrome，要求先完成代理可自行驗證的部分。F1 blocking 實站驗收維持 pending，未越過閘門執行 A3。
- Probe 補強：加入輸出 schema validator；拒絕含 username／password 的 URL；商品頁同時支援表格與定義清單欄位；繁中判定必須來自明確語言欄位，標題文字不能單獨使判定通過；隱藏的驗證元件不會誤判為人工接手。
- 邊界驗證：搜尋候選最多 20 筆、商品欄位最多 30 筆、單值最多 300 字元；站外連結、重複商品與無關售價欄位均被排除。
- UI 與隱私驗證：popup 有 label、live status 與 readonly 輸出；沒有遠端腳本、`innerHTML`、`eval`、`chrome.storage`、Cookie 或 Authorization 讀取。
- 新增文件：`docs/F1_VALIDATION_MATRIX.md`，逐項區分已由自動測試確認及仍待真實網站確認的事實。
- 實際測試：修改後重新執行 `node test/run-tests.mjs`，全數通過；`src/`、`test/`、`probe/` 下 25 個 `.js`／`.mjs` 的 `node --check` 全數通過。
- 狀態：F1 維持 implementation_complete／CONCERNS；ACC-F1-001／SUP-F1-001 pending，A3 至 A6 仍凍結。

## 2026-09-11｜F1｜實站驗收準備與離線回歸

- 控制狀態：已將目前階段切換為 F1 `in_progress`，gate 保持 `CONCERNS`，並維持 ACC-F1-001／SUP-F1-001 為 blocking pending；A3 至 A6 未開始。
- 實際測試：`npm run quality` 以結束碼 0 通過；`node test/run-tests.mjs` 通過，包含 F1 Probe 的搜尋 URL、候選、商品欄位、繁中訊號、原作關聯、人工接手與 manifest 離線測試。
- 實站限制：尚未收到使用者在一般 Chrome 執行的 3 組繁中正例與 2 組非繁中對照輸出，故未判定任何實站矩陣項目通過，也未修改 ACC-F1-001。
- 階段判定：離線回歸結束後，F1 記為 `implementation_complete`／`CONCERNS`，等待 blocking 實站證據；不因等待使用者操作而放行 A3。

## 2026-09-11｜計畫修訂 4 與 B1｜抽出網站無關基礎並開始執行

- 計畫改動：新增 B1「純文字與評估核心」、B2「本機可靠性與安全基礎」、B3「自動品質閘門」，階段順序改為 A1 → A2 → B1 → B2 → B3 → F1 → A3 → A4 → A5 → A6。F1 Probe 的實作歷史保留，ACC-F1-001 仍為 blocking pending。
- B1 實作：新增 `src/core/text-normalization.js`，提供 Unicode NFKC、大小寫、控制字元、標點、括號附註與空白正規化；同時保留完整與核心標題變體；加入字元 n-gram 相似度與不修改原陣列的確定性排序。
- B1 評估：新增 `src/core/matching-evaluation.js`，以明確真值及 matched／review／not_found 判定計算 precision、recall、coverage 與 abstention rate；零分母回傳 null，不以合成資料宣稱真實準確率。
- 測試發現與修正：第一輪測試發現 `localeCompare` 會使同分排序受執行環境語系影響；改用固定 Unicode 字串次序後通過，符合相同輸入產生相同結果的要求。
- 邊界與效能：覆蓋全半形、空值、控制字元、超長輸入、符號輸入、括號變體、相似度、排序、評估零分母與錯誤 schema；2,000 次代表性正規化及相似度批次低於 500 毫秒測試門檻。
- 實際測試：`node test/run-tests.mjs` 全數通過；`src/`、`test/`、`probe/` 下 29 個 `.js`／`.mjs` 的 `node --check` 全數通過；B1 核心檔案未含網站名稱、selector、URL、權重或門檻。
- Gate：PASS。B1 設為 accepted；下一階段 B2 planned。未開始 A3 至 A6，也未把 B1 當成 F1 實站證據。
- Git 證據：工作區不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。

## 2026-09-11｜A2｜最終獨立審查與放行補記

- 審查結果：最終獨立審查確認 A2 規格符合性與程式碼品質皆為 PASS，沒有阻擋問題。
- 實際測試與結果：重新執行 `node test/run-tests.mjs`，lookup、訊息 context／schema、source adapter、source extractors 與 manifest 靜態檢查全數通過；`src/` 與 `test/` 下全部 `.js`、`.mjs` 的 `node --check` 亦全數通過。
- 補驗：ACC-A2-001／SUP-A2-001 仍為 non-blocking pending。REQ-013 真實來源頁面尚未逐案核對，未列為通過證據。
- Gate：PASS。A2 設為 `accepted`，可交接 A3 技術實作。
- Git 證據：工作區不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。

## 2026-09-11｜A2｜最終獨立審查與放行

- 審查 task：`01a08e53-a7f1-7fe0-9bfc-dbabaf15897c`，唯讀審查。
- 審查結果：規格符合性 PASS、程式碼品質 PASS、最終 PASS；沒有阻擋問題。
- 實際測試：審查者重跑 `node test/run-tests.mjs` 與所有 `.js`／`.mjs` 的 `node --check`，全數通過；靜態檢查未發現 `innerHTML`、Cookie、Authorization、`<all_urls>`、DLsite 或 MAIN world bridge。
- 補驗：ACC-A2-001／SUP-A2-001 保持 non-blocking pending；真實來源頁面與 REQ-013 尚未逐案核對，未當成通過證據。
- Gate：PASS。A2 設為 `accepted`，可交接 A3 技術實作。
- Git 證據：工作區不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。

## 2026-09-11｜A2｜第二次獨立審查 FAIL 與修正

- 審查 task：`01a08e42-497d-7251-b16b-95251cb0fdad`，唯讀審查。
- 審查結果：FAIL。`fromGallery` 的 display、creator 與 pageCount fallback 會留下錯誤 locator；內嵌 JSON 只要含 `title` 物件便可能被採用，沒有綁定目前作品號碼或 URL。
- 修正：把頁面結構化資料 helper 拆至 `src/content/source-extractors.js`，依實際採用欄位產生 locator。內嵌候選必須以 id、gallery_id、identifier、media_id、url、@id 或 mainEntityOfPage 綁定目前六位數或精確來源 URL。
- 新增測試：直接測試 display／name、creator／publisher、pageCount／numberOfPages locator，並拒絕只有 title、沒有作品身分的內嵌資料。
- 狀態：A2 回到 `in_progress`；完整測試通過後才可再次送審。

- 修正後驗證：`node test/run-tests.mjs` 通過，包含新增的 `source-extractors.test.mjs`；`src/` 與 `test/` 下全部 `.js`、`.mjs` 的 `node --check` 通過。A2 第三次設為 `under_review`。

## 2026-09-11｜A2｜第三次獨立審查 FAIL 與修正

- 審查 task：`01a08e46-9ae8-7dc3-8277-598112d73b5a`，唯讀審查。
- 審查結果：FAIL。DOM fallback 雖採多個 selector，證據卻固定記錄第一條路徑；作者／社團 locator 也不是實際 selector 或可追蹤路徑。
- 修正：DOM 解析移入可離線測試的 `source-extractors.js`。每個標題與頁數回傳實際命中的 selector；作者／社團記錄容器、欄位篩選與名稱節點的完整 DOM path。
- 新增測試：以最小 fake document 覆蓋 `data-title-*`、`data-page-count`、artist／group 容器及無作品身分的 DOM。
- 狀態：A2 回到 `in_progress`；完整測試通過後再送獨立審查。

- 修正後驗證：`node test/run-tests.mjs` 通過；`src/` 與 `test/` 下全部 `.js`、`.mjs` 的 `node --check` 通過。A2 第四次設為 `under_review`。

## 2026-09-11｜A2｜第四次獨立審查 CONCERNS 與修正

- 審查入口 task：`01a08e4a-fb8f-7fe0-9bfc-dbabaf15897c`；實質審查 task：`01a08e4b-7ac1-7261-902f-05023363f8aa`。兩者皆未修改工作區。
- 審查結果：CONCERNS，無阻擋問題。疑慮為 record 邊界未強制非空欄位具 evidence、API JSON 解析錯誤誤列為網路錯誤，以及 runtime sender／tab 與 page outcome 缺少行為測試。
- 修正：`isSafeSourceRecord` 強制每個非空欄位有 evidence；API fetch 與 JSON 解析分開處理，後者回報 parserError；新增可測的 extension sender 與來源 sender／tab／URL 驗證函式，page outcome 也移入 helper。
- 新增測試：缺少 evidence、parserError、錯誤 extension ID、錯誤 tab、錯誤來源 URL、驗證頁、404 與正常頁面 outcome。
- 狀態：A2 回到 `in_progress`，完成測試後再送獨立審查。

- 修正後驗證：`node test/run-tests.mjs` 通過；`src/` 與 `test/` 下全部 `.js`、`.mjs` 的 `node --check` 通過。A2 再次設為 `under_review`。

## 2026-09-11｜B2｜本機可靠性與安全基礎完成

- 狀態可靠性：把儲存契約移至 `src/core/state.js`，schema 升為 4，加入 30 天期限、64,000 字元總上限、根層與巢狀 exact schema、查詢紀錄去重及安全複製。舊版、損壞、過期、未來時間或超長狀態會重設並由背景程式寫回安全初始值。
- 診斷隱私：新增固定 allowlist 診斷摘要，只輸出擴充功能版本、號碼、階段、錯誤代碼、擷取策略及計數；不輸出 Cookie、Authorization、頁面全文、作品標題、作者或網址。側邊面板可由使用者手勢複製有界摘要，不新增剪貼簿權限。
- 訊息與 URL：擴充功能命令只接受精確的側邊面板 URL；來源重試只接受精確的背景 service worker URL 與單欄訊息；來源及 DLsite URL 額外拒絕 username／password。儲存變更須重新經背景程式正規化後才顯示。
- 無障礙：輸入欄位加入 pattern、required 與錯誤時的 `aria-invalid`；狀態區加入 `aria-atomic`，錯誤與一般狀態都有可見文字前綴；主要控制項保持原生按鈕並加入清楚的 `focus-visible` 外框。
- 測試發現與修正：第一輪測試發現本機 Node 不支援 `structuredClone`；依無套件與既有 Node 相容要求，改用僅處理已驗證純 JSON 狀態的序列化複製。
- 實際測試：`node test/run-tests.mjs` 全數通過；新增狀態、診斷與無障礙測試。`src/`、`test/`、`probe/` 下 34 個 `.js`／`.mjs` 的 `node --check` 全數通過。
- 權限與限制：manifest 權限、host permissions 與 CSP 未變；未新增遠端程式碼或敏感資料保存。F1 實站驗收仍為 blocking pending，B2 不代表 DLsite 可行。
- Gate：PASS。B2 設為 accepted；下一階段 B3 planned。
- Git 證據：工作區不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。

## 2026-09-11｜B3｜自動品質閘門完成

- 實際改動：新增 `test/quality-gate.mjs` 與 `test/run-quality-gate.mjs`，以 `npm run quality` 作為單一離線入口。檢查器只讀取工作區，驗證兩份 Manifest V3、固定 CSP、精確權限與 host permissions，掃描 `src/`、`probe/` 的遠端程式碼、危險 DOM API 與敏感資料 API，並對 `src/`、`probe/`、非 fixture `test/` JavaScript 執行語法檢查。
- 測試完整性與效能：品質閘門確認既有完整離線測試入口包含核心、狀態、診斷、無障礙與 manifest 測試，並實際執行 `test/run-tests.mjs`；其中的代表性純文字批次測試維持 500 毫秒門檻。
- 失敗案例：新增七個隔離 fixture，分別涵蓋遠端程式碼、`<all_urls>`、非預期權限、危險 DOM API、敏感資料 API、JavaScript 語法錯誤與測試失敗。`quality-gate.test.mjs` 已確認每個案例都回傳非零狀態並輸出對應失敗類型。
- 實際測試：`npm run quality` 通過；正常工作區品質閘門檢查 37 個非 fixture JavaScript 檔案後通過，違規 fixture 全數通過預期驗證；另以 `node --check` 檢查相同 37 個檔案，全數通過。
- 限制：此閘門不需要瀏覽器、伺服器或網路，也不修改來源檔案；靜態規則只能攔截已定義模式，不能取代 F1 實站證據、A5 整合審查或 A6 Chrome 實機驗收。
- Gate：PASS。B3 設為 accepted；下一階段為 F1。ACC-F1-001／SUP-F1-001 仍為 blocking pending，A3 至 A6 繼續凍結。
- Git 證據：工作區不是 Git repository，沒有 HEAD、分支或 `git diff`；未初始化 Git、未 commit。

## 2026-09-12｜F1｜第一次實站驗收失敗與 Probe 0.2.0 修正

- 實站證據：使用者提供 2 組繁中正例、2 組日文對照及 1 組 Forbidden 搜尋輸出。繁中正例皆正確回報 true，日文對照皆正確回報 false。
- 失敗項目：4 組搜尋頁皆無候選；所有商品 `comparisonFieldCount` 都是 0；Forbidden 回報 `parser_error`；繁中正例仍少 1 組。ACC-F1-001 維持 pending，F1 gate 設為 FAIL。
- 原因與修正：0.1.0 固定搜尋 `maniax`，但實測商品皆位於 `books`。0.2.0 新增允許清單內的分區選擇、Forbidden 頁面標題辨識，以及商品頁獨立作者、品牌／社團、系列與原作節點擷取；未新增權限或資料保存。
- 測試發現：修正後第一輪離線測試發現中文「品牌／社團」未列入交叉核對計數，已補正後重跑。
- 實際測試：`node test/run-tests.mjs` 全數通過；`npm run quality` 通過。尚未重跑真實 DLsite，須由使用者在 Chrome 重新載入 0.2.0 後補驗。
- 階段狀態：F1 `in_progress`／FAIL；A3 至 A6 未開始。

## 2026-09-12｜中文名稱與作者解析計畫草案

> 後續更新：使用者確認原頁通常沒有中文、接受可核對別名、不要保存，且優先獨立運作與零額外費用。已新增 `CHINESE_TITLE_FEASIBILITY_PLAN.md` 取代舊提案，列出免費來源、首次查詢實驗、停止條件與 Terra 入口。本次僅更新規劃文件；未完成來源實測、未執行程式測試、未變更控制狀態，也未宣稱可行。

- 使用者縮小目標為作品中繼資料解析、中文名稱與可用作者名稱，要求先審阅計畫，後續交給 Terra 執行。
- 新增 `docs/CHINESE_TITLE_PLAN_DRAFT.md`，列出來源頁內中文名稱的範圍假設、證據規則、M0 至 M3 與 A6、測試及 Terra 執行入口。
- 閱讀既有來源 schema、extractor、adapter、輸入驗證與 manifest，確認中文名稱及語言證據尚未納入現有 record，並辨識仍存在 DLsite 執行權限。
- 本次只建立提案；未實作、未執行測試、未實站核對，未變更正式規格或控制狀態。先前多來源規格改寫與既有 Roadmap 不一致，已在 M0 列為核准後整理事項。

## 2026-09-12｜V1 至 V3｜獨立零費用中文名稱方案實測

- API 發現：來源舊 `/api/gallery/{id}` 已提示改用 v2；公開 OpenAPI 確認 `/api/v2/galleries/{gallery_id}`、`/api/v2/search` 與匿名 20 次／分鐘限制。
- 來源研究：Open Library 與 AniList 代表查詢無結果；Google Books 免金鑰請求回傳 429／quota 0；公共 SearXNG 與一般搜尋網頁不具可依賴的免費正式 runtime 介面。
- 凍結方法：以來源核心原題進行 nhentai v2 同站搜尋，只接受候選 metadata 中實際出現的中文名稱，再核對核心原題、作者／社團及合理頁數差異。僅有翻譯標記、羅馬字或漢化組名稱一律不算成功。
- 彙總：探索集 10 筆成功 3、無合格名稱 7、已知誤配 0；留置集 10 筆成功 1、無合格名稱 9、已知誤配 0。留置首次取得率 10%，未達 80% 門檻。
- 判定：V3 NO-GO。缺口主要是公開 metadata 沒有中文名稱文字，不是匹配器缺少語意能力；依停止條件未製作完整 UI 或 runtime prototype。
- 文件：計畫升為修訂 5，新增 `CHINESE_TITLE_SOURCE_MATRIX.md` 與 `CHINESE_TITLE_FEASIBILITY_REPORT.md`，同步規格、Roadmap、狀態、決策、驗收與交接。舊 DLsite F1 標為 superseded，歷史 FAIL 保留。
- 測試：本次只變更文件與控制狀態，沒有程式碼變更；`npm run quality` 以 exit code 0 通過。API 研究未被記作產品整合測試。

## 2026-09-12｜修訂 6／I1-I2｜中文版本連結與本機離線翻譯

- 新契約：使用者不再要求正式或有來源中文名稱；改為輸出同作中文版本 nhentai 連結，並對每筆來源標題執行本機繁中機器直譯。作者／署名原文返回。使用者知情授權成人作品頁連結風險。
- 實作：新增 `nhentai-v2.js`，使用 gallery 與 search endpoint，清理標題 metadata，以核心原題、credit 與 20%／至少 5 頁差異核對中文候選；拒絕續篇、非中文、同文種作者衝突與頁數差異過大案例。
- 本機翻譯：新增 Chrome Translator API wrapper，使用 `ja`／`en` 到 `zh-Hant`；side panel 在 submit 的第一次 await 前建立翻譯器，以符合首次語言包下載需要使用者操作的要求。
- 架構：新增 v2 service worker 與 side panel；manifest 升為 0.3.0、最低 Chrome 138，只保留 `sidePanel` 與 `https://nhentai.net/*`。不再啟用 DLsite、content scripts、tabs 或 storage。
- 修正：品質檢查後發現舊 sender 驗證只允許舊 side panel，已新增 v2 精確 sender URL 驗證與回歸測試。格式無效時不建立翻譯器；作者顯示優先採來源原文 credit。
- 測試：新增 v2 adapter、Translator wrapper、訊息 schema／context、manifest 與無障礙測試；`npm test` 通過，`npm run quality` 通過 49 個 JavaScript 檔案與所有違規 fixture。
- 實站 API：使用 Node HTTPS harness 驗證一筆正例與一筆負例；正例取得 4 個通過同作核對的中文版本，負例為 0，兩者皆正確建立日文翻譯輸入並辨識有作者資料。未在文件保存名稱對照。
- 翻譯可靠性：同一次提交會在 user activation 尚有效時準備日文與英文 translator；若其中一組首次下載被拒絕，UI 提供只建立實際語言組合的「重試本機翻譯」按鈕。
- 語言選擇：翻譯前先移除尾端版本標記，再以假名／漢字判為日文；純羅馬字標題改走英文語言包，避免被 `[中国翻訳]` 標記中的漢字誤判為日文。
- 限制：真實 Chrome 語言包與側邊面板流程仍保留到 SUP-A6-001，不寫成已通過。

## 2026-09-12｜修訂 7／批次查詢

- 使用者需求：一次輸入 5–10 組號碼並批次回傳資訊。
- 實作：v0.3.1 將單行輸入改為 textarea，接受換行、空白、半形或全形逗號分隔的 5–10 組唯一六位數號碼。背景新增受嚴格 schema 驗證的 `BATCH_LOOKUP` 訊息，逐筆回傳成功資料或安全錯誤；單筆失敗不會中止整批。來源 API 請求以至少 3.1 秒間距排程，避免超過匿名限制。
- 介面與隱私：每筆獨立顯示來源欄位、中文版本、翻譯狀態與必要時的重試按鈕；所有 DOM 文字使用 `textContent`，不新增權限、儲存、Cookie 或查詢留存。
- 測試：`node test/run-tests.mjs` 通過（含批次輸入與 runtime schema 邊界）；`node test/quality-gate.mjs` 通過（49 個 JavaScript 檔案、manifest、CSP、權限、禁止 API、語法與完整離線測試）。`git diff --check` 通過。
- 限制與下一步：未在真實 Chrome 執行批次流程或驗證 API 的實際速率行為；SUP-A6-001 維持 pending，A6 為 `implementation_complete`／`CONCERNS`，不得標記最終 accepted。

## 2026-09-13｜修訂 8／取消批次最少組數

- 使用者決定：批次輸入不設最低組數，但最多 10 組。
- 實作：v0.3.2 將批次輸入與 runtime schema 的下限從 5 改為 1；介面提示、規格、Roadmap、控制狀態與補驗步驟同步改為 1–10 組。
- 驗證：依使用者明確指示，未執行測試、品質閘門或 Chrome 實機驗收；SUP-A6-001 維持 pending。

## 2026-09-13｜修訂 9／作品欄位搜尋連結

- 使用者需求：原始標題、作者／署名及社團有資料時顯示為與來源頁一致的超連結；點擊後在 Chrome 搜尋該字串。
- 實作：v0.3.3 新增安全的搜尋欄位 renderer；非空值以 `<a>` 呈現，點擊時呼叫 `chrome.search.query` 並在新分頁使用 Chrome 預設搜尋引擎。缺值維持不可點擊的「未提供」。
- 權限：manifest 新增最小必要 `search` 權限；未新增 Google 或其他搜尋網域的 host permission，亦未保存查詢。
- 驗證：`node test/run-tests.mjs` 與 `node test/run-quality-gate.mjs` 通過；49 個 JavaScript 檔案、manifest、CSP、權限、禁止 API、語法、離線測試及七種違規 fixture 均通過。Chrome 實際搜尋行為仍列入 SUP-A6-001。

## 2026-09-13｜修訂 10／完整移除本機離線翻譯

- 使用者需求：刪除本機離線翻譯功能，以及相關代碼、依賴與資源，並確認無殘留。
- 實作：移除 side panel 的 Translator 建立、翻譯結果區、進度、重試與清理流程；刪除 `src/core/offline-translation.js` 及 `test/translation/offline-translation.test.mjs`；移除測試入口與品質閘門引用。來源 schema 不再產生 `translationTitle` 或 `translationLanguage`，原始標題顯示改用 `searchTitle`。
- Manifest：版本升為 0.4.0、描述移除翻譯，最低 Chrome 版本由 138 恢復為 114；權限仍只有 `sidePanel`、`search` 與精確 nhentai host permission。
- 驗證：`node test/run-tests.mjs` 與 `node test/run-quality-gate.mjs` 通過；品質閘門掃描 47 個 JavaScript 檔案及七種違規 fixture。對 `src/`、`test/`、manifest 與 package 執行全域搜尋，未找到翻譯模組、API、UI、欄位或資源引用；`git diff --check` 通過。Chrome 實機仍由 SUP-A6-001 追蹤。

## 2026-09-13｜結果介面文案與排版調整

- 將主要按鈕「批次查詢」改為「查詢」、區塊「批次結果」改為「結果」，完成狀態移除查詢保存文案。
- 每筆結果標題整合為「作品資料（六位數號碼）」，不再重複顯示「號碼」與「作品資料」標題。
- 有中文版本時只顯示連結清單，移除「找到 N 個通過同作核對的中文版本」提示；無結果和搜尋失敗訊息維持不變。

## 2026-09-13｜欄位搜尋連結中鍵支援

- 原始標題、作者／署名與社團的搜尋連結新增 `auxclick` 處理；以滑鼠中鍵點擊時會阻止 `#` 的預設開啟行為，並與左鍵相同透過 Chrome 預設搜尋引擎建立新分頁查詢。

## 2026-09-13｜移除結果區塊標題

- 移除可見的「結果」區塊標題，結果直接從各筆「作品資料（號碼）」開始；容器保留 `aria-label`，確保輔助科技仍可辨識查詢結果區域。

## 2026-09-13｜移除結果外層容器

- 移除結果的外層 section，改由結果清單直接承載無障礙名稱與 hidden 狀態。每筆「作品資料」保留頂部分隔線，清楚區隔多筆結果。
