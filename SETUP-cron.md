# 確実な定時収集の設定（外部cron → GitHub Actions）

GitHub 内蔵の cron はベストエフォート（実行保証なし・数分遅延や間引きあり）のため、
**外部スケジューラ [cron-job.org](https://cron-job.org/)（無料・正確）** から各ワークフローを
`workflow_dispatch` で起動します。

```
cron-job.org
  ├─ 15分ごと(JST 9〜22) → collect-live.yml         … ライブ直近値(live-latest.json)を更新
  └─ 毎時1回(JST 9〜22)  → collect-wait-times.yml   … 当日履歴(day-*.json)を収集
       → GitHub API (workflow_dispatch) → 各ワークフロー実行 → data/ にコミット
```

どちらのワークフローも手動起動(workflow_dispatch)対応済みなので、外部から POST するだけです。
収集は冪等なので、内蔵cronと重複しても問題ありません。

---

## ① GitHub の個人アクセストークン(PAT)を作る

1. GitHub → 右上アイコン → **Settings** → 一番下 **Developer settings**
2. **Personal access tokens → Fine-grained tokens** → **Generate new token**
3. 設定:
   - **Token name**: `cron-tdr-waiting`（任意）
   - **Expiration**: 1年など（**切れると収集が止まる**ので、失効日をカレンダー等に控える）
   - **Repository access**: **Only select repositories** → `tdr-waiting` を選択
   - **Permissions** → **Repository permissions** → **Actions** を **Read and write** に設定
4. **Generate token** → 表示された `github_pat_...` を**コピー**（再表示されないので注意）

---

## ② cron-job.org でジョブを作る

両ジョブで **Advanced settings は共通**（メソッド・ヘッダ・ボディ）。URL と Schedule だけ変えます。

### 共通の Advanced settings
- **Request method**: **POST**
- **Request headers**:

  | Key | Value |
  |---|---|
  | `Authorization` | `Bearer ` + ①のトークン（例: `Bearer github_pat_11AB...`） |
  | `Accept` | `application/vnd.github+json` |
  | `X-GitHub-Api-Version` | `2022-11-28` |
  | `Content-Type` | `application/json` |

  ⚠️ `Bearer ` の後ろにトークン**全文をそのまま**。`github_pat_` が二重にならないよう注意。
- **Request body**:
  ```json
  {"ref":"main"}
  ```

### ジョブA（必須・15分ごとのライブ更新）
- **Title**: `tdr live (15min)`
- **URL**:
  ```
  https://api.github.com/repos/hinaxts516-create/tdr-waiting/actions/workflows/collect-live.yml/dispatches
  ```
- **Schedule**:
  - Timezone: **Asia/Tokyo**
  - minutes = `0,15,30,45`、hours = `9-22`、days/months/weekdays = `*`
    （＝開園中、15分ごと）

### ジョブB（推奨・毎時の履歴収集）
- **Title**: `tdr history (hourly)`
- **URL**:
  ```
  https://api.github.com/repos/hinaxts516-create/tdr-waiting/actions/workflows/collect-wait-times.yml/dispatches
  ```
- **Schedule**:
  - Timezone: **Asia/Tokyo**
  - minutes = `40`、hours = `9-22`、days/months/weekdays = `*`
    （＝開園中、毎時1回。当日履歴は1回で全体取得できるため毎時で十分）

各ジョブ保存後、**「TEST RUN」** で実行 → 応答 **204** なら成功。
GitHub の **Actions** タブに対象ワークフローが `workflow_dispatch` で動けばOK。

---

## 確認
- cron-job.org の各ジョブ実行履歴が **204**（成功）になっているか
- GitHub の **Actions** に「Collect live snapshot」が15分間隔、「Collect wait times」が毎時で増えているか
- サイトの「ライブ」モードの最終更新時刻が15分以内に更新されているか
- 過去データページの日付プルダウンが毎日増えているか

## 注意
- PAT は cron-job.org に保存されます。権限は **このリポジトリの Actions のみ**に絞っているので影響は限定的です。漏れた場合は GitHub の Developer settings から **Revoke** できます。
- **PAT 失効＝収集停止**の最大要因です。失効前に再発行してください（過去に収集が数日止まった原因の可能性大）。
- GitHub 内蔵 cron（各 yml の `schedule`）は**バックアップ**として残してあります。さらに `data-freshness-check.yml` が閉園前後に当日履歴の取りこぼしを検知・自己修復します。
