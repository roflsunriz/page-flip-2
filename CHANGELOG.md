# 変更履歴

このファイルは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に従います。

## [Unreleased]

### Added

- 現行環境で再現可能に開発・配布できるよう、Bun 1.3.14を基準にしたESMビルド、型検査、lint、フォーマット、テストの経路を追加した。
- 実装本体やCSSが欠落したbundleを配布しないよう、出力サイズと必須マーカーを検査するビルド後検証を追加した。
- ページ番号を論理順序のまま維持しながら、見開き配置、次・前の操作、スワイプ、イベントを反転できる `readingDirection: 'ltr' | 'rtl'` を追加した。

### Changed

- 旧ライブラリ名や `St` グローバルへ依存しない `page-flip-2` パッケージへ変更し、公開入口を `src/index.ts` に一本化した。
- 重複していたRollup・Webpack経路を廃止し、JavaScriptのbundle生成を `Bun.build()` に一本化した。
- テスト実行をVitestからBun標準ランナーへ移し、DOM環境をJSDOMへ変更した。
- DOMクラス名を `page-flip-2__*` へ統一した。

### Fixed

- Firefoxなどでwrapperの寸法指定が外れないよう、上流CSSの `.sft__wrapper` という綴り違いを解消し、高さも明示した。
- bundleが注入するstyle要素の識別属性と重複検査セレクターが一致しない問題を修正した。
- 初期orientationの確定前に既定spreadが通知され、指定した開始ページとは別のページへ同期される問題を修正した。
- 最終spreadで `turnToNextPage()` を呼ぶと範囲外のspreadへ進む問題を修正した。
- 設定の既定値オブジェクトが呼び出し間で共有され、以前のインスタンスのRTLや影設定が次のインスタンスへ漏れる問題を修正した。
- 親要素がページ領域の原点と一致しない場合、プログラムによるアニメーション開始座標がずれる問題を修正した。
- RTLアニメーションで隣接しないページの密度を参照し、softページがhard表示のまま残る問題を修正した。
