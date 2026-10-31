# 調査知見

- `source-map-js` は `jsdom` → `css-tree` の間接依存。監査失敗時はlockfileの実効版を確認する。`tr46` は既に7系が解決されるため、旧6系用パッチが残っていないか依存更新ごとに確認する。
- 2026-10-31の監査ではminimatchを修正版へoverrideし、jsdom 30.1.3とundici 8.12.3の組合せでrelease:checkを確認した。
- `scripts/pack.mjs` はbuildを再実行して新しい `dist` を梱包する。CSSはbundleから一度だけ注入されるため別CSSを追加せず、package dry-runでJS・型定義・ライセンス類を確認する。
- 描画変更はHTML/画像の両モードでLTR/RTL、縦横、resize、dragの取消/完了、WebGL fallback、連続操作、更新・破棄を実ブラウザーで確認する。`@zumer/snapdom` 更新時は背景・疑似要素・Shadow DOMと従来描画fallbackも対象。
- 上流Issue/PRの採否は [docs/upstream-audit.md](docs/upstream-audit.md) が正本。過去のページめくり不具合は `web-page-enhancement-scripts` のbook-style-manga-viewer履歴も参照し、既知問題を再導入しない。
