# page-flip-2

`page-flip-2` は、ブラウザで本のようなページめくりを実現するTypeScriptライブラリです。Bunを開発・バンドル基盤として使用し、ES Modulesとして配布します。

このリポジトリはMITライセンスの [Nodlik/StPageFlip](https://github.com/Nodlik/StPageFlip) `v2.0.7` を出発点としています。旧名称や旧グローバルAPIの互換維持よりも、LTR/RTL双方で一貫したページ順序、安定した更新・破棄、現行ブラウザでの動作を優先します。

## 状態

現在は初回リリースに向けた開発中です。Bun向けのビルド基盤は利用できますが、LTR/RTL対応と既知のページ更新不具合の修正が完了するまでは本番利用を推奨しません。

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
bun run test
bun run build
```

ビルド成果物は `dist/page-flip-2.js` に生成されます。CSSはbundle内から一度だけ注入されるため、別のCSSファイルを読み込む必要はありません。

## 使用例

```ts
import { PageFlip, SizeType } from 'page-flip-2';

const root = document.querySelector<HTMLElement>('#book');

if (root === null) {
    throw new Error('Book root was not found');
}

const pageFlip = new PageFlip(root, {
    size: SizeType.STRETCH,
    width: 400,
    height: 600,
    minWidth: 280,
    maxWidth: 800,
    minHeight: 420,
    maxHeight: 1200,
});

pageFlip.loadFromHTML(document.querySelectorAll<HTMLElement>('[data-page-flip-2-page]'));
```

公開APIは実装の進行に合わせて更新します。未実装のオプションをREADMEへ先行掲載しません。

## ライセンスと由来

MIT Licenseです。原著作者の著作権表示とライセンス全文は [LICENSE](./LICENSE) に保持しています。
