# 更新手順

## 前提

- Bun 1.3.14以上を使用する。
- 作業前に `git status --short --branch` で既存差分を確認する。
- `COMMON-AGENTS.md` と `AGENTS.md` を全文確認する。

## 依存関係の更新

1. npm公式レジストリで候補版と `peerDependencies` を確認する。
2. `package.json` の直接依存を明示的な版へ更新する。
3. 次を実行して `bun.lock` を更新する。

```powershell
bun install
```

4. lockfileの差分を確認し、意図しない依存追加がないことを確認する。

## ソース更新後の検証

```powershell
bun run lint
bun run format
bun run type-check
bun run test
bun run build
bun audit
bun pm pack --dry-run
```

`bun run build` は `dist` を安全確認後に再生成し、実装、CSS注入、公開APIがbundleへ含まれることまで検証する。

公開前は個別コマンドと同じ検査をまとめた次のコマンドを使用する。

```powershell
bun run release:check
```

`bun pm pack` は `prepack` 経由でBunビルドを再実行する。dry-runのファイル一覧に `dist/page-flip-2.js`、`dist/index.d.ts`、`LICENSE`、`README.md` が含まれることを確認する。

ブラウザ挙動を変更した場合は、HTMLページと画像ページの両モードについてLTR/RTL、横長・縦長、リサイズ、連続操作、更新、破棄を実ブラウザで確認する。

## 上流Issue / PRの再監査

1. `Nodlik/StPageFlip` のIssueとPRをGitHub APIで `state=all` として取得する。
2. [docs/upstream-audit.md](docs/upstream-audit.md) の番号一覧と比較し、新規・更新項目の本文、コメント、PR差分を確認する。
3. 再現可能で後方互換な修正は回帰テストとともに取り込み、既取込または対象外なら根拠を監査表へ追記する。
4. 上流PRのbuild設定を取り込む場合も、RollupやWebpackへ戻さず `Bun.build()` の単一経路を維持する。

## リリース

1. `package.json` のversionと `CHANGELOG.md` の見出し・日付を一致させる。
2. `bun run release:check` と実ブラウザ確認を完了する。
3. `git status --short --branch` で意図しない差分がないことを確認する。
4. リリース用コミットを作成する。
5. push、タグ作成、GitHub Release作成、package公開は、対象versionと送信先を確認してから個別に実行する。

## 復旧

- 未コミット変更で問題が起きた場合は、対象差分を確認してから、変更したファイルだけをGitの直前状態へ戻す。
- コミット後に問題が判明した場合は履歴を書き換えず、原因を修正する新しいコミットを作成する。
- `dist` は生成物なので、ソースと設定を復旧した後に `bun run build` で再生成する。
