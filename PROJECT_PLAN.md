# Product Mission and Evidence-led Roadmap

更新：2026-08-10（Asia/Taipei）

## Mission

> 讓台灣使用者不用安裝 App、登入或交出位置，就能在 5 秒內選定所在地，確認環境部 AQI、資料時間與一般／敏感族群活動提醒；資料不新鮮或不完整時，產品寧可停止下結論，也不把舊值包裝成今日建議。

這個 mission 取代「看全台最差地區與安全地區」的舊目標。全台最差站不是個人暴露，AQI 51–100 的「普通」也不等於對所有人安全。

## 2026-08-09 證據摘要

### 官方資料與風險

- 環境部 [AQX_P_432](https://data.moenv.gov.tw/dataset/detail/AQX_P_432) 是每小時 AQI 資料；官方 API 需要 key。[API 使用說明](https://data.moenv.gov.tw/paradigm)
- [API 介接服務條款](https://data.moenv.gov.tw/api-term) 說明會員單一 API 每日 5,000 次、key 有效一年。因此共用 hourly cache 合理，但 key 必須有 owner 與輪替日。
- 當晚官方 live snapshot 有 84 站；AQI 均有值，但 PM2.5 缺 3 站、PM10 缺 8 站、風速缺 4 站，且所有欄位皆為字串。缺值不能偷偷變成 0。
- 無 key 的 API 回 HTTP 500 且 body 不是穩定的乾淨 JSON。不能以 status code 或 schema 假設取代 runtime validation。
- 官方說明近兩年即時小時值只供參考；正式引用另有品保後年度資料。[即時值說明](https://airtw.moenv.gov.tw/cht/Query/InsValue.aspx)
- 台灣 AQI 門檻自 2025-01-01 調整。[現行 AQI 與健康建議](https://airtw.moenv.gov.tw/CHT/Information/Standard/AirQualityIndicatorNew.aspx)
- 開放資料可再利用但必須顯名，且提供機關不保證持續供應。[政府資料開放授權條款](https://data.gov.tw/license)

### 市場與使用者結果

- 官方「環境即時通」已有定位、收藏、通知與三日預報。
- 民間產品已有測站趨勢、變好／變壞提醒與 widgets。
- 因此 generic map/dashboard 沒有足夠回訪理由。本產品的第一個差異是免安裝、免定位權限、trust-first 的所在地答案；第二個差異才是未來三日活動安排。
- 上述需求是由官方健康建議與競品能力收斂出的產品假設，尚未被足量真實使用者研究證明。

## Product principles

1. **所在地優先**：先手動選縣市／測站；不預設全台最差站就是使用者答案。
2. **結論晚於可信度**：先顯示 source、發布時間、fresh/stale，再顯示活動提醒。
3. **逐站 freshness**：一站新資料不能掩蓋其他過期站。
4. **過期即停止**：sample、fallback、缺時間、超過 3 小時或未來時間異常均不提供「現在」結論。
5. **分開受眾**：一般民眾與敏感族群建議不混寫；「普通」不稱為安全。
6. **不洩漏 credential**：browser、cache、log、error 與 git 都不能有 API key。
7. **可查核**：資料集、授權、發布時間、處理規則與非官方聲明必須可見。
8. **不假裝精確**：stylized map 明示為示意；未取得站型／距離前不宣稱最近站代表住家。

## Roadmap

### P0 — Trust foundation（本分支）

- Production cache schema、coverage、valid ratio、dedupe、AQI range、Taiwan time 與 freshness gate。
- Atomic last-known-good promotion、error/key redaction、deploy-time sample rejection。
- 前端逐站 freshness；過期站排除於摘要與結論。
- 取消無行為的定位／熱點／圖層 controls；更新按鈕與 15 分鐘／重新可見時 refresh 有真實行為。
- 手動縣市→測站流程；無預設「全台最差」建議。
- 一般／敏感族群分開；AQI 51–100 不稱安全。
- OGL attribution、非官方與即時資料用途聲明。
- CI、Pages deployment workflow、sample production gate 與 custom-domain checklist。

### P1 — Useful return reason

- 接入 `AQF_P_01`，以最新 publishtime 驗證 10 空品區 × 3 日，明示「空品區預報」而非測站預報。
- 接入測站基本資料，顯示站型、地址與代表性；在有證據後提供距離或選站理由。
- Shareable stable station URL 與 local-only 常用地點；不要求帳號。
- 保存可靠 hourly snapshots 後提供 12–24 小時趨勢，避免把單點噪音寫成因果。
- 真實陌生使用者任務測試，驗證是否能在 5 秒內找到所在地、看懂時間與說出下一步。

### P2 — Retention only after validation

- PWA／compact home-screen view。
- 只有在使用者研究證明需求後才評估 Web Push；不先複製既有 App 的通知功能。
- 可觀測性 dashboard：last success、source age、record count、drop ratio、refresh failures、key expiry。

## Public launch gates

所有條件同時成立才可把正式網域視為 production：

- 本產品自己的 MOENV credential 已設定、owner／申請日／到期日前輪替責任清楚。
- production artifact 不含 sample/fallback；deploy validator 實際通過。
- 至少 72 小時 hourly refresh soak：無時間倒退、低覆蓋被拒、失敗保留 last-good、無 key/log 洩漏。
- 320、390、tablet、desktop 實機流程通過；keyboard、screen reader names、focus、reduced motion 與非色彩唯一提示通過。
- Loading、empty、initial error、refresh error、sample、全 stale、mixed stale、future timestamp 都經 browser 驗證。
- Production build、artifact contents、relative base path、Pages deployment 與 rollback 可重現。
- 無阻斷 console/log error；production dependency audit 無已知漏洞。
- Metadata、attribution、privacy posture、custom domain DNS/HTTPS/canonical/OG/sitemap 均使用真實值。
- 至少 5 位非開發者完成核心任務測試；若多數人仍先讀全台排行而找不到所在地，本產品不可宣稱達成 mission。

## Success metrics

- **Core task success**：首次使用者能選所在地測站並正確說出 AQI、資料時間與適用族群提醒。
- **Trust comprehension**：看到 stale/sample 狀態者不會回答「這就是現在 AQI」。
- **Time to answer**：核心任務中位數 ≤ 5 秒是目標，先測量再宣稱。
- **Data readiness**：正式環境 source age ≤ 3 小時、有效站數 ≥ 80 且涵蓋 22 個合法台灣縣市；任何 gate 不符則 readiness false。80／22 是依本輪 84 站 live snapshot 設定的初始 fail-closed 門檻，需用 72 小時觀測校正。
- **Reliability**：72 小時 soak 期間，無不可信 cache promotion、無 credential exposure。

## Explicit unknowns

- 正式 remote、GitHub Pages account/environment、網域與 MOENV credential 尚未提供。
- 官方未提供可依賴的 SLA；3 小時 hard stop 是依 hourly cadence 制定的初始產品門檻，需以長期觀測校正。
- 「最接近」與「最具代表性」可能不是同一站；在站型與使用者地點設計完成前不自動選站。
- 5 秒 mission 尚未做足量真人測試，不是已證明成果。
