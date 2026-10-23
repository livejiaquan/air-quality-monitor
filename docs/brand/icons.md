# Icon 與品牌標記（第六輪，2026-10-23）

## 品牌標記

- **檔案**：`public/brand/mark.svg`。`public/favicon.svg` 是同一份檔案；`public/apple-touch-icon.png`（180px）從同一個 SVG 產生。這三個檔案的副本放在本資料夾。
- **結構**：64×64 圓角方形，圓角 14.08（邊長的 22%），實心填強調色 `#29aea0`。
  - 這個 teal 的 HSL 是 174°、62%、42%，落在規範要求的飽和度 55–70%、亮度 42–50%。
  - 沒有邊框、陰影或漸層。
- **內容**：Lucide `wind`，白色，佔邊長 58%，stroke 2，置中。
- **apple-touch-icon**：iOS 會自己裁圓角，所以這張改成滿版：強調色正方形，圖示一樣佔 58%。
- **頁首**：32px 標記，右邊 10px 是字標。站名「台灣空氣品質」16px／600、字距 -0.01em；副標「環境部即時 AQI」12px／500、次文字色，寬度 400px 以下時隱藏。
- **深色模式**：標記顏色不變。

## 站內 icon 一覽（全部 Lucide，`lucide-react` 0.475）

- **繪製參數**：由 `src/index.css` 的 `svg.lucide` 統一設定 stroke-width 1.75、圓頭線端與轉角；顏色用 `currentColor`。
- **尺寸**：只用 16、20、24 三種。

| 位置 | 用途 | Lucide 名稱 | 尺寸 |
|---|---|---|---|
| 頁首 | 重新讀取資料 | `rotate-cw` | 20 |
| 頁首 | 切換深色／淺色 | `moon` / `sun` | 20 |
| 測站搜尋框 | 搜尋 | `search` | 20 |
| 測站搜尋框 | 清除所選測站 | `x` | 16 |
| 搜尋建議清單 | 測站項目 | `map-pin` | 16 |
| 頁首副標、焦點卡 | 資料時間 | `clock-3` | 16 |
| 活動建議 | 一般民眾 | `users` | 16 |
| 活動建議 | 敏感族群 | `heart-pulse` | 16 |
| 活動建議（無法使用時） | 說明 | `info` | 16 |
| 測站列表 | 篩選 | `search` | 16 |
| 測站列表 | AQI 排序方向 | `arrow-down-wide-narrow` / `arrow-up-narrow-wide` | 16 |
| 頂部說明（超過 24 小時、連不上資料） | 提示 | `alert-triangle` | 20 |
| 錯誤卡片 | 提示 | `alert-triangle` | 24 |
| 錯誤卡片 | 重新載入 | `refresh-cw` | 16 |

**被替換或移除的部分**
- 原本 `index.html` 內嵌一個手繪 data URI favicon（波浪線加黃點），已改成品牌標記 `favicon.svg`。
- 頁首原本用 Tailwind 色塊加 `wind` icon 拼成標記，已改成 `brand/mark.svg`。
- 頁首 icon 原本是 18px（不在允許的尺寸內），已改為 20px；錯誤卡片 icon 原本是 36px，已改為 24px。
- 站內沒有其他手繪 SVG 或 emoji icon。

**不屬於 icon 集的元素**：地圖上的 AQI 數字標記、色階條指示點、Leaflet 縮放鈕上的「+／−」是資料圖形和文字字元，不是 icon，所以保留。

## GitHub 露出

- 移除頁尾的「原始碼（MIT）」連結（指向 GitHub repo），改成「© 2026 Lim Jia Quan」，不加連結。
- 驗收：`npm run build` 後執行 `grep -rn "github.com" dist/`，結果是 0 筆（含第三方套件授權註解）。
- README、LICENSE、`.github/`、package.json 沒有動，因為那些不是網站露出。
