# page-flip-2

`page-flip-2` は、ブラウザで本のようなページめくりを実現するTypeScriptライブラリです。Bunを開発・バンドル基盤として使用し、ES Modulesとして配布します。

このリポジトリはMITライセンスの [Nodlik/StPageFlip](https://github.com/Nodlik/StPageFlip) `v2.0.7` を出発点としています。旧名称や旧グローバルAPIの互換維持よりも、LTR/RTL双方で一貫したページ順序、安定した更新・破棄、現行ブラウザでの動作を優先します。

## 状態

現在は初回リリース候補です。LTR/RTL、HTML/Canvas、横長・縦長、親要素のリサイズ、更新・破棄を自動テストと実ブラウザで確認しています。

## 必要環境

- Bun 1.3.14以上

## セットアップ

```powershell
bun install
```

## 開発時の確認

```powershell
bun run lint
bun run format:check
bun run type-check
bun test
bun run build
```

公開前の全検査は `bun run release:check` でまとめて実行できます。package作成時には `prepack` がBunビルドを再実行するため、古い `dist` は梱包されません。

ビルド成果物は `dist/page-flip-2.js` に生成されます。CSSはbundle内から一度だけ注入されるため、別のCSSファイルを読み込む必要はありません。

`bun run demo` でLTRとRTLを並べた動作確認用ページを起動できます。`readingDirection` の既定値は `ReadingDirection.LTR` です。

## 使用例

```ts
import { PageFlip, ReadingDirection, SizeType } from 'page-flip-2';

const root = document.querySelector<HTMLElement>('#book');

if (root === null) {
    throw new Error('Book root was not found');
}

const pageFlip = new PageFlip(root, {
    size: SizeType.STRETCH,
    readingDirection: ReadingDirection.RTL,
    width: 400,
    height: 600,
    minWidth: 280,
    maxWidth: 800,
    minHeight: 420,
    maxHeight: 1200,
});

pageFlip.loadFromHTML(document.querySelectorAll<HTMLElement>('[data-page-flip-2-page]'));
```

`showCover: true` で表紙を単独表示しつつ雑誌のように柔らかくめくる場合は、`coverDensity: 'soft'` を指定します。既定値は従来互換の `'hard'` です。

Canvas画像モードの余白色は `backgroundColor` で指定できます。`drawShadow: false` はめくり中の影に加えて中央の綴じ影も無効にします。

表示を常に片面または見開きへ固定する場合は `displayMode: 'portrait' | 'landscape'` を使います。既定の `'auto'` では `usePortrait` と表示幅から自動選択します。

`pageFlip.destroy()` は生成したDOM、イベント、描画ループを破棄し、渡されたroot要素とHTMLページを初期状態へ戻します。同じrootへ新しいインスタンスを作り直せます。

イベントのdataは型引数で指定できます。`on()` は同じインスタンスを返すため、登録を連結できます。

```ts
pageFlip
    .on<number>('flip', ({ data }) => console.log(`page: ${data}`))
    .on<{ page: number; mode: 'portrait' | 'landscape' }>('init', ({ data }) => {
        console.log(data.page, data.mode);
    });
```

パッケージ入口から `FlipCorner`、`FlipDirection`、`FlippingState`、`Orientation`、`PageDensity`、`PageOrientation` と、イベント関連の型をimportできます。

## 上流Issue / PRの監査

上流へ報告された項目の取込状況と、対象外にした理由は [docs/upstream-audit.md](docs/upstream-audit.md) に全件記録しています。

## ライセンスと由来

MIT Licenseです。原著作者の著作権表示とライセンス全文は [LICENSE](./LICENSE) に保持しています。
