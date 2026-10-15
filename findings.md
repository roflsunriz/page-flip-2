# page-flip-2 の実現手段と調査知見

作業着手前にこの文書を全文読む。共通方針と目的・行動義務・禁止事項は [AGENTS.md](AGENTS.md) を参照する。

## 共通方針に対する固有の実現手段

- 対象の共通ルール: 検証の書式コマンドと梱包。
- 理由: 既存formatは書き換えを行うため、確認にはformat:checkを使う。ライブラリの公開APIとnpm梱包も検査対象になるため。
- 適用範囲: package.jsonに定義したライブラリ検証。
- 代替手段・検証: bun run release:checkでlint、書式、型、テスト、監査と梱包dry-runを行う。
- 文書構成: 実現手段・環境・過去の調査知見はこの文書を正本とする。利用者向け導入・使用法はREADME、更新の入口はhow-to-update、実測結果はverification、変更意図はCHANGELOGに残す。共通方針の品質・秘密情報保護・ユーザー指示を免除しない。
- 移行基準: 2026-10-16の既定ブランチ `53e5a8ddd89c54f4c0edadae36a359360d885a80`。以下は出典の本文を移動したもので、過去の確認日時・適用条件・未検証事項を維持する。

<a id="agents-3"></a>

移動元: [AGENTS.md](AGENTS.md)。

## Environment

<必要に応じて適宜書き足すこと。>

<a id="agents-4"></a>

移動元: [AGENTS.md](AGENTS.md)。

## 依存更新時の注意

- 2026-10-11 時点で `source-map-js` は `jsdom` から `css-tree` を経由する間接依存。`bun audit` が GHSA-68fv-2mgg-jv7q で失敗する場合、`bun.lock` の版を確認して修正版へ更新する。手順は `how-to-update.md` と `verification.md` を参照する。
- 2026-10-11 時点で `tr46` は `whatwg-url` 経由で 7.0.0 が解決され、旧 `tr46@6.0.0` 用パッチは適用されない。間接依存を更新した際は `bun.lock` の解決版と不要になったパッチを確認する。

<a id="readme-4"></a>

移動元: [README.md](README.md)。

## 開発時の確認

```powershell
bun run lint
bun run format:check
bun run type-check
bun test
bun run build
```

公開前の全検査は `bun run release:check` でまとめて実行できます。配布パッケージの作成には `bun run pack:release` を使います。このコマンドは `scripts/pack.mjs` でBunビルドを再実行し、新しい `dist` を梱包します。

ビルド成果物は `dist/page-flip-2.js` に生成されます。CSSはbundle内から一度だけ注入されるため、別のCSSファイルを読み込む必要はありません。

`bun run demo` でLTRとRTLを並べた動作確認用ページを起動できます。`readingDirection` の既定値は `ReadingDirection.LTR` です。

<a id="readme-6"></a>

移動元: [README.md](README.md)。

## 上流Issue / PRの監査

上流へ報告された項目の取込状況と、対象外にした理由は [docs/upstream-audit.md](docs/upstream-audit.md) に全件記録しています。

<a id="readme-8"></a>

移動元: [README.md](README.md)。

## 依存更新の自動処理

Dependabot は対象の依存関係を毎週確認します。更新 PR はチェック（CI）が成功した後に自動で squash merge されます。CI の失敗ジョブは 1 回だけ再実行します。再失敗時は指定した lockfile を再生成し、CI を再実行します。major 更新も CI が成功した場合に取り込みます。

<a id="update-1"></a>

移動元: [how-to-update.md](how-to-update.md)。

## 前提

- Bun 1.3.14以上を使用する。
- 作業前に `git status --short --branch` で既存差分を確認する。
- `COMMON-AGENTS.md` と `AGENTS.md` を全文確認する。

<a id="update-2"></a>

移動元: [how-to-update.md](how-to-update.md)。

## 依存関係の更新

1. npm公式レジストリで候補版と `peerDependencies` を確認する。
2. `package.json` の直接依存を明示的な版へ更新する。
3. 次を実行して `bun.lock` を更新する。

```powershell
bun install
```

4. lockfileの差分を確認し、意図しない依存追加がないことを確認する。

`@zumer/snapdom` を更新する場合は、HTMLページの背景、画像、疑似要素、Shadow DOM内のページがテクスチャ化できることと、失敗時に従来描画へ切り替わることを実ブラウザで確認する。

<a id="update-3"></a>

移動元: [how-to-update.md](how-to-update.md)。

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

<a id="update-4"></a>

移動元: [how-to-update.md](how-to-update.md)。

## 上流Issue / PRの再監査

1. `Nodlik/StPageFlip` のIssueとPRをGitHub APIで `state=all` として取得する。
2. [docs/upstream-audit.md](docs/upstream-audit.md) の番号一覧と比較し、新規・更新項目の本文、コメント、PR差分を確認する。
3. 再現可能で後方互換な修正は回帰テストとともに取り込み、既取込または対象外なら根拠を監査表へ追記する。
4. 上流PRのbuild設定を取り込む場合も、RollupやWebpackへ戻さず `Bun.build()` の単一経路を維持する。

<a id="update-5"></a>

移動元: [how-to-update.md](how-to-update.md)。

## リリース

1. `package.json` のversionと `CHANGELOG.md` の見出し・日付を一致させる。
2. `bun run release:check` と実ブラウザ確認を完了する。
3. `git status --short --branch` で意図しない差分がないことを確認する。
4. リリース用コミットを作成する。
5. push、タグ作成、GitHub Release作成、package公開は、対象versionと送信先を確認してから個別に実行する。

<a id="update-6"></a>

移動元: [how-to-update.md](how-to-update.md)。

## 復旧

- 未コミット変更で問題が起きた場合は、対象差分を確認してから、変更したファイルだけをGitの直前状態へ戻す。
- コミット後に問題が判明した場合は履歴を書き換えず、原因を修正する新しいコミットを作成する。
- `dist` は生成物なので、ソースと設定を復旧した後に `bun run build` で再生成する。

<a id="update-7"></a>

移動元: [how-to-update.md](how-to-update.md)。

## Dependabot PR の更新

前提は `.github/dependabot.yml` と PR 用 CI（CI）です。更新 PR の head SHA と `gh pr checks <PR番号>` の結果を確認してください。major を含む更新は全チェック成功後に自動取り込みされます。初回 CI 失敗は failed jobs のみを 1 回再実行し、再失敗時は指定した lockfile を再生成し、CI を再実行します。脆弱性検査が間接依存の古い lockfile により失敗した場合は、脆弱性情報で修正版を確認し、`bun update <パッケージ名>@<修正版> --lockfile-only --ignore-scripts` で lockfile を更新してから再検証します。

設定を変えたときは `actionlint .github/workflows/dependabot-automation.yml` と実際の PR の Actions 結果を確認します。問題があれば呼び出し先の共通 workflow SHA を直前の検証済み値へ戻すコミットを push します。取り込まれた依存更新に問題があれば通常の revert コミットで復旧します。

CI 完了より Dependabot の分類が遅れる場合は、`callback_workflow_file` が指す呼び出し側 workflow を `workflow_dispatch` し、同じ PR 番号・head SHA・全チェックを再確認する。呼び出し側のファイル名を変える際はこの入力も一緒に更新する。

<a id="agents-history"></a>

移動元: [AGENTS.md](AGENTS.md)。

## 過去の不具合調査の参照先

- バグとの格闘の履歴はC:\Users\UserName\Documents\web-page-enhancement-scripts（https://github.com/roflsunriz/web-page-enhancement-scripts）のbook-style-manga-viewerのコミット履歴にあるので詳しく調査すること
