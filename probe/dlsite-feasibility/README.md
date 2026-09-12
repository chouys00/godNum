# DLsite 可行性 Probe

此擴充功能只驗證 DLsite 搜尋頁與商品頁能否提供正式功能需要的公開欄位。它不讀取來源網站、不評分、不下載作品內容，也不保存擷取結果。

離線已確認與仍待實站確認的範圍記錄於 `docs/F1_VALIDATION_MATRIX.md`。

## 載入

1. 在 Chrome 開啟 `chrome://extensions`。
2. 開啟「開發人員模式」。
3. 選擇「載入未封裝項目」，指定本資料夾：`D:\tools\godNum\probe\dlsite-feasibility`。
4. 載入後固定「DLsite Feasibility Probe」圖示。

## 每個案例的操作

1. 點 Probe 圖示，先選商品所在分區，再輸入作品原名並按「開啟搜尋」。`BJ` 商品通常選「書籍（books）」；`RJ` 商品通常選「同人（maniax）」。
2. 搜尋頁載入完成後，再開啟 Probe，按「擷取目前分頁」。
3. 確認輸出為 `pageType: search`、`status: success`，且候選只含 DLsite 商品 ID、標題與站內網址。
4. 在搜尋頁開啟要核對的商品。
5. 商品頁載入完成後，再開啟 Probe，按「擷取目前分頁」。
6. 複製「精簡驗證結果」交給 Codex 記錄。輸出不得包含頁面全文、Cookie 或作品內容。

若網站顯示 Forbidden，或要求登入、年齡確認、驗證碼，請自行正常處理；Probe 不會代為提交。處理前可先擷取一次，預期狀態為 `manual_action`。

## 放行資料

- 3 組明確標示繁體中文的正例。
- 2 組非繁體中文的對照案例。
- 每組包含搜尋頁與商品頁輸出。
- 商品頁必須有明確繁中訊號，以及至少兩項可與來源作品交叉核對的欄位。只看譯名不足以放行。
