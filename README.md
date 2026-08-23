# page-flip-2

`page-flip-2` は、ブラウザで本のようなページめくりを実現するTypeScriptライブラリです。Bunを開発・バンドル基盤として使用し、ES Modulesとして配布します。

このリポジトリはMITライセンスの [Nodlik/StPageFlip](https://github.com/Nodlik/StPageFlip) `v2.0.7` を出発点としています。旧名称や旧グローバルAPIの互換維持よりも、LTR/RTL双方で一貫したページ順序、安定した更新・破棄、現行ブラウザでの動作を優先します。

## 状態

柔らかいページは、指で掴んだ自由端と現在座標から折れ線を算出し、表裏テクスチャを貼ったWebGL2メッシュを円柱状に変形して描画します。LTR/RTL、HTML/Canvas、横長・縦長、ドラッグのキャンセル・完了、親要素のリサイズ、更新・破棄を自動テストと実ブラウザで確認しています。

WebGL2が無効な環境、HTMLページのテクスチャ化に失敗した場合、またはWebGLコンテキストを失った場合は、操作を失わないよう従来のポリゴン描画へ自動的にフォールバックします。hardページは従来どおり剛体の3D回転を使用します。

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

3Dカールの最大半径は `curlRadius` でピクセル指定できます。省略時はページ幅の32%です。小さい値ほど折れが強くなります。ドラッグを離したときにページを確定する進捗は `flipThreshold` で0〜100の範囲から指定でき、既定値は50です。

HTMLページは3D描画中だけ静止画像へ変換するため、別chunkへ同梱した `@zumer/snapdom` を遅延読み込みします。通常表示中のDOMとイベントハンドラーはそのまま維持されます。Canvas画像ページは読み込み済み画像を直接WebGLテクスチャへ渡します。

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

MIT Licenseです。原著作者の著作権表示とライセンス全文は [LICENSE](./LICENSE)、3Dカールの設計参考元と実行時依存の表示は [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) に保持しています。
