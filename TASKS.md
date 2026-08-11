# Delivery and Launch Gates

更新：2026-08-10。`[x]` 只表示有本輪可核對證據，不代表產品已公開上線。

## Repository baseline

- [x] 完整讀取 README、project docs、source、scripts、workflows、tests 與 config。
- [x] 檢查 branch、status、diff、history、remote 與 secret；保存原始 prototype baseline commit。
- [x] 在 `codex/trustworthy-aqi-foundation` 高風險分支工作。
- [x] 查核現行官方資料、API terms、AQI guidance、授權、競品與 Pages 文件。

## P0 trust foundation

- [x] Production cache runtime contract：核心欄位、字串型別、AQI 0–500、唯一 siteid。
- [x] Coverage ≥ 80、22 個合法台灣縣市、valid ratio ≥ 95%、逐站 3 小時 freshness、未來 15 分鐘容忍。
- [x] Sample/fallback deploy rejection、欄位白名單與 credential material rejection。
- [x] Atomic promotion、last-known-good preservation、HTTP／non-JSON／network error redaction。
- [x] CLI production validator 與 synthetic contract tests。
- [x] 前端逐站 stale/future 計算，舊站不進入「目前」摘要、排行與建議。
- [x] 不再預設全台最高站為個人活動建議。
- [x] 手動縣市→測站流程；移除無行為的定位／熱點／圖層 controls。
- [x] 真實 reload control、15 分鐘 refresh、頁面重新可見 refresh 與 last-visible error。
- [x] 「普通」不稱安全；一般民眾／敏感族群分開呈現。
- [x] Sample／全 stale 時停止現在結論；mixed stale 明確排除並告知數量。
- [x] OGL attribution、資料用途與非官方聲明。
- [x] GitHub Pages workflow 在 build 前拒絕不可信 cache。
- [ ] 配置本產品自己的 `MOENV_API_KEY` 並產生第一份可提交的官方 production cache。
- [ ] 建立／確認 remote 與受保護的 Pages environment。

## Verification for this iteration

- [x] Focused TypeScript data tests。
- [x] Synthetic Node contract、atomic write 與 redaction tests。
- [x] 最終 lint、non-incremental typecheck、full tests、production build。
- [x] `npm audit --omit=dev` 與 full audit；build-chain advisories 已經 lockfile 安全更新後歸零。
- [x] Browser desktop、320px 及 390px 核心流程：選縣市、選測站、刷新。
- [x] Browser loading、empty、error、sample/stale、fresh synthetic、mixed stale、refresh error。
- [x] Keyboard、focus、accessible names、reduced motion 與 chart text alternative。
- [x] Console、network、production preview、artifact contents 與 source-map 檢查。
- [x] Independent engineering/product review 後修正；blocking/high all clear。
- [x] Mission Guardian post-iteration review：P0 GO、public production NO-GO。

## Public launch blockers

- [ ] 72 小時 hourly refresh soak 與 freshness/coverage/error monitoring。
- [ ] 5 位以上陌生使用者核心任務測試；記錄 time-to-answer 與 stale comprehension。
- [x] P1 選站限制說明：主流程明示目前沒有站型、地址或距離資料，不判定最近或代表性測站，並連到環境部站型說明。
- [ ] 正式網域決定；DNS、HTTPS、canonical、OG URL、sitemap、Search Console 使用真實值。
- [ ] Production smoke、rollback 與 on-call/key rotation owner 可操作。

## P1 after trust gate

- [ ] AQF_P_01 最新批次 10 空品區 × 3 日 contract 與 UI。
- [ ] 測站基本資料：站型、地址、代表性。
- [ ] Shareable station URL 與 local-only favorites。
- [ ] 有可靠 snapshots 後的 12–24 小時趨勢。

## P2 only after outcome evidence

- [ ] PWA compact view。
- [ ] 依真人需求決定是否做 Web Push；不預設必要。
- [ ] 長期 reliability 與 product outcome metrics dashboard。
