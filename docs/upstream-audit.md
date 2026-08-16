# StPageFlip Issue / PR 監査

2026-08-16時点の `Nodlik/StPageFlip` にある全Issue 52件と全PR 8件を、GitHub REST APIの本文・コメント、PR差分、`upstream/master` と照合した記録です。

判定は次の3種類です。

- **取込済み**: page-flip-2の既存実装または今回の変更で満たしている。
- **一部取込**: 一般化できる修正だけを取り込み、アプリ固有部分や危険な実装は除外した。
- **対象外**: 利用相談、外部アプリ側の課題、別製品相当の機能要求、または安全に移植できる修正を含まない。

## Issues

|                                                    # | 判定     | 照合結果                                                                                                                                             |
| ---------------------------------------------------: | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [71](https://github.com/Nodlik/StPageFlip/issues/71) | 取込済み | `destroy()`で描画を停止し、多重開始も防止済み。今回さらに静止時の継続描画自体を廃止した。                                                            |
| [70](https://github.com/Nodlik/StPageFlip/issues/70) | 一部取込 | 範囲外spreadへの遷移は修正済み。Electronアプリ固有のinside-cover構成はライブラリ単体の再現がなく対象外だが、終端の孤立ページ密度は今回修正した。     |
| [69](https://github.com/Nodlik/StPageFlip/issues/69) | 取込済み | 開始spread同期、Shadow DOM CSS、clip境界、更新・破棄・再初期化を修正済み。                                                                           |
| [68](https://github.com/Nodlik/StPageFlip/issues/68) | 取込済み | `readingDirection: 'ltr'                                                                                                                             | 'rtl'` と論理ページ順を実装済み。 |
| [67](https://github.com/Nodlik/StPageFlip/issues/67) | 取込済み | Bunビルドで `.d.ts` を生成し、package exportsの型入口を公開済み。                                                                                    |
| [66](https://github.com/Nodlik/StPageFlip/issues/66) | 取込済み | `showNext()` の上限を `length - 1` に修正済み。                                                                                                      |
| [65](https://github.com/Nodlik/StPageFlip/issues/65) | 取込済み | `drawShadow: false` でCanvas中央の綴じ影も無効化するよう修正した。                                                                                   |
| [64](https://github.com/Nodlik/StPageFlip/issues/64) | 対象外   | `loadFromHTML()` はCanvasを生成しないという利用方法の誤解で、報告者も解決済み。                                                                      |
| [59](https://github.com/Nodlik/StPageFlip/issues/59) | 取込済み | `a` / `button` 自体だけでなく、その子要素からの操作も祖先探索で転送するよう修正した。                                                                |
| [56](https://github.com/Nodlik/StPageFlip/issues/56) | 取込済み | Canvas余白色を指定できる `backgroundColor` を追加した。                                                                                              |
| [55](https://github.com/Nodlik/StPageFlip/issues/55) | 取込済み | 誤記された `.sft__wrapper` を廃し、page-flip-2固有クラスへ統一済み。                                                                                 |
| [54](https://github.com/Nodlik/StPageFlip/issues/54) | 対象外   | リポジトリ運用状態の表示依頼でありコード修正ではない。                                                                                               |
| [53](https://github.com/Nodlik/StPageFlip/issues/53) | 対象外   | ズーム中だけswipeを切る統合要件。全入力停止には既存の `useMouseEvents` があり、ズーム状態は呼出側が管理する。                                        |
| [52](https://github.com/Nodlik/StPageFlip/issues/52) | 対象外   | 上下綴じは水平ページめくりとは別の座標・公開APIを要する機能要求。PR #46を個別評価した。                                                              |
| [51](https://github.com/Nodlik/StPageFlip/issues/51) | 取込済み | READMEと公開APIを `loadFromHTML()` に統一済み。                                                                                                      |
| [50](https://github.com/Nodlik/StPageFlip/issues/50) | 対象外   | 常設dog-ear表示という新しいUI機能要求で、修正案・仕様がない。                                                                                        |
| [49](https://github.com/Nodlik/StPageFlip/issues/49) | 一部取込 | 終端の孤立ページを暗黙にhard化しない修正と、soft表紙設定を追加した。PR #61のDOM複製・中央移動方式はRTLと破棄時状態を壊すため不採用。                 |
| [44](https://github.com/Nodlik/StPageFlip/issues/44) | 一部取込 | #49と同系統。終端密度と表紙密度を分離した。報告URL固有の再現環境は消失している。                                                                     |
| [43](https://github.com/Nodlik/StPageFlip/issues/43) | 取込済み | 配布物とREADMEをBun ESMの `dist/page-flip-2.js` に一致させた。                                                                                       |
| [41](https://github.com/Nodlik/StPageFlip/issues/41) | 対象外   | iframeはHTMLページ内容として利用可能で、同一生成元制約などはブラウザ側の仕様。                                                                       |
| [40](https://github.com/Nodlik/StPageFlip/issues/40) | 対象外   | API利用質問で修正提案がない。論理方向は `readingDirection` と次・前APIで一貫させている。                                                             |
| [38](https://github.com/Nodlik/StPageFlip/issues/38) | 一部取込 | wrapperのoverflow境界、portrait座標、`touch-action: pan-y`、touchmoveのpassive制御を修正済み。ページ全体のscroll位置はホスト側レイアウトに依存する。 |
| [36](https://github.com/Nodlik/StPageFlip/issues/36) | 対象外   | 任意HTMLの自動組版・次ページ流し込みはページめくり描画の範囲外。                                                                                     |
| [35](https://github.com/Nodlik/StPageFlip/issues/35) | 対象外   | Vue 2でbrowser bundleとESM importを混在させた利用相談。Bun ESMの単一入口へ整理済み。                                                                 |
| [34](https://github.com/Nodlik/StPageFlip/issues/34) | 取込済み | Firefoxで静止中も毎frame DOMを書き換える処理をオンデマンド描画へ変更した。                                                                           |
| [32](https://github.com/Nodlik/StPageFlip/issues/32) | 取込済み | `showPageCorners: false` を実装済み。                                                                                                                |
| [31](https://github.com/Nodlik/StPageFlip/issues/31) | 対象外   | browser global版とESMを同時利用したパス解決の相談。現在はESM入口へ一本化済み。                                                                       |
| [29](https://github.com/Nodlik/StPageFlip/issues/29) | 取込済み | `flipPrev()` の開始X座標へ描画領域のleftを加算済み。                                                                                                 |
| [27](https://github.com/Nodlik/StPageFlip/issues/27) | 取込済み | #68と同じRTL要望。論理順を保つ実装で対応済み。                                                                                                       |
| [25](https://github.com/Nodlik/StPageFlip/issues/25) | 取込済み | `useMouseEvents` と `clickEventForward` に加え、入れ子のリンク・ボタン判定も修正した。                                                               |
| [23](https://github.com/Nodlik/StPageFlip/issues/23) | 取込済み | `drawShadow: false` をCanvas中央影にも適用した。                                                                                                     |
| [22](https://github.com/Nodlik/StPageFlip/issues/22) | 取込済み | bounds再計算、`ResizeObserver`、`updateFromHtml()` 後のhandler再設定を実装済み。                                                                     |
| [21](https://github.com/Nodlik/StPageFlip/issues/21) | 取込済み | 静止中の `cssText` 再代入を止め、変更時だけ描画するよう修正した。                                                                                    |
| [20](https://github.com/Nodlik/StPageFlip/issues/20) | 取込済み | `showCover` の単独配置と材質を分離し、`coverDensity: 'soft'` を追加した。                                                                            |
| [19](https://github.com/Nodlik/StPageFlip/issues/19) | 取込済み | #67と同じ型宣言要望。公開済み。                                                                                                                      |
| [18](https://github.com/Nodlik/StPageFlip/issues/18) | 取込済み | `disableFlipByClick` 時のプログラム操作座標を描画領域内へ修正済み。                                                                                  |
| [17](https://github.com/Nodlik/StPageFlip/issues/17) | 取込済み | `disableFlipByClick` と `useMouseEvents` を維持し、回帰テストを追加済み。                                                                            |
| [16](https://github.com/Nodlik/StPageFlip/issues/16) | 対象外   | 画像配信のpreload方針はホストアプリ・HTTPキャッシュ側の責務。ライブラリは画像ごとの非同期状態を扱う。                                                |
| [15](https://github.com/Nodlik/StPageFlip/issues/15) | 対象外   | pinch zoomは表示アプリ側のviewport機能で、ページ幾何へ暗黙統合するとdrag/swipeと競合する。                                                           |
| [14](https://github.com/Nodlik/StPageFlip/issues/14) | 取込済み | HTML更新後にshadow要素を再生成し、ShadowRoot向けCSSも注入する。                                                                                      |
| [13](https://github.com/Nodlik/StPageFlip/issues/13) | 取込済み | #68と同じRTL要望。対応済み。                                                                                                                         |
| [12](https://github.com/Nodlik/StPageFlip/issues/12) | 取込済み | 自動portraitに加え、`displayMode: 'portrait'` で常時片面を指定可能にした。                                                                           |
| [11](https://github.com/Nodlik/StPageFlip/issues/11) | 一部取込 | clip境界と終端ページの暗黙hard化を修正した。原報告に最小再現・寸法情報がなく、それ以上の固有修正は行わない。                                         |
| [10](https://github.com/Nodlik/StPageFlip/issues/10) | 取込済み | `disableFlipByClick` と `showPageCorners` でclickとhoverを独立制御できる。                                                                           |
|   [9](https://github.com/Nodlik/StPageFlip/issues/9) | 対象外   | 複数の物理ページを同時に積層する別アニメーション方式の機能要求。現在は競合を避けて進行中animationを確定する。                                        |
|   [8](https://github.com/Nodlik/StPageFlip/issues/8) | 対象外   | easing・pointer追従補間という新規animation API要求で、確定仕様・PRがない。                                                                           |
|   [7](https://github.com/Nodlik/StPageFlip/issues/7) | 取込済み | HTMLページとwrapperのoverflow/clip境界を追加し、Firefoxで外周線やscroll領域が露出しにくい構成へ修正済み。                                            |
|   [5](https://github.com/Nodlik/StPageFlip/issues/5) | 取込済み | `showPageCorners` を実装済み。                                                                                                                       |
|   [4](https://github.com/Nodlik/StPageFlip/issues/4) | 取込済み | `init` イベントと実表示ページ・orientationの同期を実装済み。                                                                                         |
|   [3](https://github.com/Nodlik/StPageFlip/issues/3) | 対象外   | Konva/Reactで多数Canvasを持つアプリの構成相談で、ライブラリ修正案ではない。                                                                          |
|   [2](https://github.com/Nodlik/StPageFlip/issues/2) | 取込済み | `usePortrait: false` と `useMouseEvents: false` を維持し、clone・handlerを破棄時に回収する。                                                         |
|   [1](https://github.com/Nodlik/StPageFlip/issues/1) | 対象外   | DOM読込前に初期化した呼出側の問題で、報告者が自己解決済み。                                                                                          |

## Pull requests

|                                                  # | 判定     | 照合結果                                                                                                                                                                   |
| -------------------------------------------------: | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [61](https://github.com/Nodlik/StPageFlip/pull/61) | 一部取込 | オンデマンド描画、`flipPrev()`、soft表紙の意図を取り込んだ。Vite/pnpm/Rollup追加、公開 `ui`、空virtual method、RTL非対応のDOM mirror、固定translateは採用しない。          |
| [60](https://github.com/Nodlik/StPageFlip/pull/60) | 一部取込 | #61の旧版。共通する有効部分は同じく取り込み、demo/build基盤の置換はBun構成と競合するため除外した。                                                                         |
| [46](https://github.com/Nodlik/StPageFlip/pull/46) | 対象外   | 上下綴じ専用の大規模機能。`loadFromImages(string[])` を破壊し、package名変更・CoreJS・Rollup・`any`・用途固有trimBoxを同時導入するため、安全な修正単位として移植できない。 |
| [45](https://github.com/Nodlik/StPageFlip/pull/45) | 取込済み | CSS `scaleX(-1)` と利用者側inner wrapperを要求する案ではなく、論理ページ順・物理配置・入力・イベントを一貫して反転するRTL実装で包含した。                                  |
| [42](https://github.com/Nodlik/StPageFlip/pull/42) | 取込済み | PR #30と同じ `flipPrev()` left座標修正を適用済み。                                                                                                                         |
| [37](https://github.com/Nodlik/StPageFlip/pull/37) | 取込済み | 循環importを作る `forceDisplayMode` をそのまま移植せず、設定層だけで完結する `displayMode` として実装した。                                                                |
| [30](https://github.com/Nodlik/StPageFlip/pull/30) | 取込済み | `disableFlipByClick` 時の `flipPrev()` 座標修正を適用済み。                                                                                                                |
|   [6](https://github.com/Nodlik/StPageFlip/pull/6) | 取込済み | `showPageCorners` は上流masterとpage-flip-2の双方へ取り込み済み。                                                                                                          |

## 継続時の方針

上流に新しいIssueまたはPRが増えた場合は、GitHub APIで差分番号を取得し、この表へ追記してから実装可否を判断します。質問や別製品相当の機能要求を無理にコードへ混ぜず、再現可能な不具合、後方互換な設定、テスト可能な改善を優先します。
