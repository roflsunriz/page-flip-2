# 変更履歴

このファイルは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に従います。

## [Unreleased]

### Added

- 現行環境で再現可能に開発・配布できるよう、Bun 1.3.14を基準にしたESMビルド、型検査、lint、フォーマット、テストの経路を追加した。
- 実装本体やCSSが欠落したbundleを配布しないよう、出力サイズと必須マーカーを検査するビルド後検証を追加した。

### Changed

- 旧ライブラリ名や `St` グローバルへ依存しない `page-flip-2` パッケージへ変更し、公開入口を `src/index.ts` に一本化した。
- 重複していたRollup・Webpack経路を廃止し、JavaScriptのbundle生成を `Bun.build()` に一本化した。
- DOMクラス名を `page-flip-2__*` へ統一した。

### Fixed

- Firefoxなどでwrapperの寸法指定が外れないよう、上流CSSの `.sft__wrapper` という綴り違いを解消し、高さも明示した。
