# 台灣空氣品質即時監測 (Taiwan AQI Monitor)

這是一個使用 **Native JavaScript**、**Tailwind CSS** 和 **Leaflet.js** 開發的靜態網頁應用程式，用於即時監測台灣各地的空氣品質 (AQI)。

## 功能特色

-   **即時地圖視覺化**：整合 Leaflet.js 顯示全台測站位置。
-   **顏色分級警示**：根據 AQI 數值顯示不同顏色的標記 (綠/黃/橘/紅/紫/褐)。
-   **詳細資訊面板**：點擊測站可查看 PM2.5、PM10、主要污染物及健康建議。
-   **地區篩選**：可快速切換至特定縣市。
-   **響應式設計**：支援桌面與行動裝置瀏覽。

## 技術架構

-   **Frontend**: HTML5, JavaScript (ES6 Modules)
-   **Styling**: Tailwind CSS (CDN), Custom CSS (Glassmorphism)
-   **Map**: Leaflet.js, OpenStreetMap
-   **Data Source**: [環境部開放資料平臺 (MOENV)](https://data.moenv.gov.tw/)

## 如何在本地端執行 (How to Run Locally)

由於瀏覽器安全性限制 (CORS)，本專案無法直接透過雙擊 `index.html` 開啟，必須透過本地網頁伺服器執行。

### 方法 1: 使用 Python (推薦)

如果你有安裝 Python 3：

1.  開啟終端機 (Terminal)。
2.  進入專案資料夾：
    ```bash
    cd /path/to/project
    ```
3.  啟動伺服器：
    ```bash
    python3 -m http.server 8080
    ```
4.  在瀏覽器開啟：`http://localhost:8080`

### 方法 2: 使用 Node.js

如果你有安裝 Node.js：

1.  安裝 `serve` 套件：
    ```bash
    npm install -g serve
    ```
2.  啟動伺服器：
    ```bash
    serve .
    ```

## 部署至 GitHub Pages

本專案為純靜態網頁，非常適合部署至 GitHub Pages。

1.  將專案 Push 到 GitHub Repository。
2.  進入 Repository 的 **Settings** > **Pages**。
3.  在 **Build and deployment** 下的 **Source** 選擇 `Deploy from a branch`。
4.  **Branch** 選擇 `main` (或 `master`)，資料夾選擇 `/ (root)`。
5.  點擊 **Save**。
6.  等待幾分鐘後，GitHub 會提供網址 (例如 `https://username.github.io/repo-name/`)。

## 關於 API Key 安全性

本專案使用環境部開放資料 API。由於是純前端靜態網頁，API Key 必須包含在前端程式碼中才能發送請求。這在開放資料應用中是常見且通常被允許的做法，但請勿將此架構用於需要高度安全性的私有 API 金鑰。

API 設定位於 `js/config.js`。

## 自動部署 (CI/CD)

本專案使用 GitHub Actions 自動部署。每次 Push 到 `main` 分支時，會自動注入 API Key 並部署到 GitHub Pages。

