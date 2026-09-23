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

`@zumer/snapdom` を更新する場合は、HTMLページの背景、画像、疑似要素、Shadow DOM内のページがテクスチャ化できることと、失敗時に従来描画へ切り替わることを実ブラウザで確認する。

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

`bun pm pack` は `prepack` 経由でBunビルドを再実行する。dry-runのファイル一覧に `dist/page-flip-2.js`、`dist/index.d.ts`、`LICENSE`、`README.md`、`THIRD_PARTY_NOTICES.md` が含まれることを確認する。

ブラウザ挙動を変更した場合は、HTMLページと画像ページの両モードについてLTR/RTL、横長・縦長、リサイズ、ドラッグのキャンセル・完了、WebGLフォールバック、連続操作、更新、破棄を実ブラウザで確認する。3Dカールは `bun run scripts/curl-browser-check.mjs <demo-url> <screenshot-directory> <cdp-url>` で確認できる。

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

## Dependabot PR の更新

前提は `.github/dependabot.yml` と PR 用 CI（CI）です。更新 PR の head SHA と `gh pr checks <PR番号>` の結果を確認してください。patch／minor は全チェック成功後に自動取り込みされます。初回 CI 失敗は failed jobs のみを 1 回再実行し、再失敗時は指定した lockfile を再生成し、CI を再実行します。

設定を変えたときは `actionlint .github/workflows/dependabot-automation.yml` と実際の PR の Actions 結果を確認します。問題があれば呼び出し先の共通 workflow SHA を直前の検証済み値へ戻すコミットを push します。取り込まれた依存更新に問題があれば通常の revert コミットで復旧します。

CI 完了より Dependabot の分類が遅れる場合は、`callback_workflow_file` が指す呼び出し側 workflow を `workflow_dispatch` し、同じ PR 番号・head SHA・全チェックを再確認する。呼び出し側のファイル名を変える際はこの入力も一緒に更新する。
