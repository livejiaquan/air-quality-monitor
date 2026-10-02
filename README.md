# 台灣 AQI 在地速查

一個以可信度優先的台灣空氣品質公共產品：使用者不需登入或提供定位，選擇縣市與測站後，可查看環境部 AQI、資料發布時間，以及分開呈現的一般民眾／敏感族群活動提醒。

## 目前狀態

此 repository 已具備可重現的前端、資料驗證、定時更新、CI 與 GitHub Pages 部署流程。**開發分支通過程式檢查，不等於正式資料與上線門檻已全部完成**：

- checked-in cache 是具有原始發布時間的靜態快照，會自然過期；前端依每站 3 小時門檻判斷，不會因重新整理而變新。
- production deployment 會主動拒絕 sample、fallback、過期或覆蓋不足的 cache。
- Remote repository 已存在於 [livejiaquan/air-quality-monitor](https://github.com/livejiaquan/air-quality-monitor)。本開發分支的 UI 驗證不會改動 production 分支，也不據此宣稱 secret、正式網域或 72 小時更新觀察已驗證完成。
- 三日空品區預報、測站站型／距離與真實使用者測試仍在 roadmap，不能宣稱已完成。

產品在沒有可信當期資料時會停止現在排行與活動結論，而不是用範例或舊資料填滿畫面。

## 為何不是另一個全台排行 Dashboard

官方與既有 App 已提供地圖、定位、預報、收藏及通知。本產品目前聚焦一個更窄的工作：在瀏覽器中用最少步驟回答「我選的所在地測站現在如何、資料多久前、一般人與敏感族群該注意什麼」，並把資料是否可用放在結論之前。

Mission、競品證據、成功指標與分階段 launch gates 見 [PROJECT_PLAN.md](./PROJECT_PLAN.md)。

## 資料來源與可信度契約

主要資料為環境部環境資料開放平臺 [AQX_P_432 空氣品質指標](https://data.moenv.gov.tw/dataset/detail/AQX_P_432)，官方標示每小時更新。瀏覽器不接觸 API key，只讀取 `public/data/aqi-latest.json` 靜態快取。

正式快取在寫入前必須符合：

- `source.kind` 必須是 `official-cache`，禁止 sample／fallback。
- 至少 80 筆有效測站、涵蓋 22 個合法台灣縣市，且有效比例至少 95%（依本輪官方 84 站 live snapshot 設定初始 fail-closed 門檻）。
- `siteid` 唯一，核心欄位齊全，AQI 為 0–500 的整數。
- 每站發布時間可依 Asia/Taipei 正確解析、不得超過 15 分鐘未來容忍值，亦不得超過 3 小時。
- 空字串、`-` 等可選污染物缺值可保留，但不會轉成 0。
- 寫入內容使用欄位白名單，不含 API URL、key、token 或 cookie。
- 驗證與同目錄暫存寫入成功後才原子替換；全體最新時間或任一既有測站時間倒退都會拒絕，錯誤會保留上一版 cache。

前端另外逐站計算 freshness。混合新舊資料時，舊站不會進入目前最高值、縣市排行、分布與活動建議。

即時資料只適合生活參考；正式研究或統計引用應使用環境部品保後資料。健康提示依環境部 2025-01-01 起的[現行 AQI 健康影響及活動建議](https://airtw.moenv.gov.tw/CHT/Information/Standard/AirQualityIndicatorNew.aspx#Health)精簡整理，不是醫療建議；個人用藥依既有醫囑。

## 本機開發

需要 Node.js 22 與 npm lockfile：

```bash
npm ci
npm run dev
```

Vite 會印出本機網址。靜態快照若已過期，預設看到 stale gate 是正確行為；範例與備援資料則始終停止現在結論。

可重現的展示狀態：

- `/`：checked-in cache（依來源種類與各站發布時間判斷是否可用）
- `/?demo=error`：載入錯誤
- `/?demo=empty`：空資料
- `/?demo=loading`：載入中

## 所在地查詢與測站探索

- 首要閱讀順序固定為縣市／測站選擇 → 所選測站、發布時間與活動提醒 → 示意分布；窄螢幕不必先越過地圖才能看結果。
- 地圖與測站卡片的選擇會同步到同一組縣市／測站控制。測站卡片可返回所選結果區；不要求定位權限。
- 測站資料庫以縣市、站名排序，可組合縣市、資料時效、資料內 AQI 分類與關鍵字。非當期值可查核，但不混入現在的活動判斷。
- 卡片先顯示 AQI、資料狀態與發布時間；6 項污染物與分族群說明使用原生 `details`／`summary` 展開。缺值顯示「未提供」，實測 0 保留為 0。
- 篩選欄位有可見標籤、結果數提示與清除操作；每次顯示 12 站。選站、篩選、展開與重試使用原生可鍵盤操作的控制，保留焦點樣式。

上述是實作與自動化測試契約。320／390／768／1440px、200% 縮放、鍵盤全流程及螢幕閱讀器仍需在實際渲染環境完成驗證；不可將伺服器端 HTML 測試視為已通過視覺或輔助科技驗收。

## 抓取官方資料

先向環境部申請本產品自己的 API key。不要使用文件範例 key、他人的 key，或把 key 寫進檔案與命令紀錄。

```bash
export MOENV_API_KEY=your-own-api-key
npm run fetch:aqi
npm run validate:aqi
```

`fetch:aqi` 只有在 production contract 通過後才會替換快取。API key 缺失、上游非 JSON、HTTP 錯誤或資料不可信時會以非零狀態結束且不破壞 last-known-good。

## 驗證

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`.github/workflows/ci.yml` 會在 pull request，以及 `main`、`master`、`codex/**` 分支 push 時執行上述四項檢查。CI 只有 repository 讀取權限，不使用 API key、不改寫快取，也不發布 GitHub Pages；同一事件／分支的新提交會取消較舊的 CI，單次檢查最多 10 分鐘。

`npm run validate:aqi` 是 production data gate；在 sample 或過期快取上失敗是預期結果。CI 透過 synthetic contract fixtures 驗證拒絕過期資料等規則，不會因開發分支的靜態快取自然老化而跳過程式檢查；部署工作流仍必須額外通過真實 production cache gate，逐站 3 小時 freshness 門檻不變。

## 部署

`.github/workflows/deploy-pages.yml` 使用 GitHub Pages custom workflow。它接收預設分支與 `codex/unified-visual-refresh` 的 push／手動操作，也在 refresh workflow 成功後以 `workflow_run` 重新 checkout 預設分支，避免 `GITHUB_TOKEN` 自動提交不會觸發下一個 push workflow 的限制。每次部署依序：

1. 安裝 lockfile dependencies。
2. 拒絕 sample、fallback、過期與覆蓋不足的 cache。
3. 執行 lint、typecheck、tests、production build。
4. 只上傳 `dist` artifact，部署至受保護的 `github-pages` environment。

啟用前仍需人工完成：

1. 在既有 repository 審核開發分支；合併或更新 production 分支需要另行授權。
2. 在 Actions secret 設定本產品自己的 `MOENV_API_KEY`。
3. 在 Pages 將 source 設為 GitHub Actions，保護 `github-pages` environment。
4. 先成功執行 refresh workflow，確認 cache 為新鮮官方資料，再觸發部署。
5. 連續觀察至少 72 小時的每小時更新、失敗保留、source age 與資料筆數。
6. 正式網域確定後再加入並驗證 `CNAME`、DNS、HTTPS、canonical URL、`og:url`、sitemap 與 Search Console；目前不猜測網域。

## 授權與資料顯名

程式碼採 [MIT License](./LICENSE)。環境部資料依[政府資料開放授權條款第 1 版](https://data.gov.tw/license)再利用；產品頁面保留資料集名稱、來源連結與非官方服務聲明。
