# 確実な定時収集の設定（外部cron → GitHub Actions）

GitHub 内蔵の cron はベストエフォート（実行保証なし）のため、**外部スケジューラ
[cron-job.org](https://cron-job.org/)（無料・正確）** から収集ワークフローを起動します。

```
cron-job.org（JST 9〜22 の毎時 0/30分に発火）
  → GitHub API (workflow_dispatch)
    → 「Collect wait times」ワークフロー実行
      → data/day-YYYY-MM-DD.json などに記録
```

ワークフローは手動起動(workflow_dispatch)に対応済みなので、外部から叩くだけです。

---

## 手順

### ① GitHub の個人アクセストークン(PAT)を作る
1. GitHub → 右上アイコン → **Settings** → 一番下 **Developer settings**
2. **Personal access tokens → Fine-grained tokens** → **Generate new token**
3. 設定:
   - **Token name**: `cron-tdr-waiting`（任意）
   - **Expiration**: 1年など（切れたら再発行）
   - **Repository access**: **Only select repositories** → `tdr-waiting` を選択
   - **Permissions** → **Repository permissions** → **Actions** を **Read and write** に設定
4. **Generate token** → 表示された `github_pat_...` を**コピー**（再表示されないので注意）

### ② cron-job.org でジョブを作る
1. [cron-job.org](https://cron-job.org/) に無料登録 → ログイン
2. **CREATE CRONJOB**
3. **URL** に次を入力（POST先）:
   ```
   https://api.github.com/repos/hinaxts516-create/tdr-waiting/actions/workflows/collect-wait-times.yml/dispatches
   ```
4. **Schedule（実行スケジュール）**:
   - Timezone: **Asia/Tokyo**
   - 実行: **毎時 0分 と 30分**、**時間帯 9〜22時**
     （Custom で minutes=`0,30`、hours=`9-22` に相当）
5. **Advanced settings**:
   - **Request method**: **POST**
   - **Request headers**（Key と Value を分けて入力）:

     | Key | Value |
     |---|---|
     | `Authorization` | `Bearer ` + ①のトークン（例: `Bearer github_pat_11AB...`） |
     | `Accept` | `application/vnd.github+json` |
     | `X-GitHub-Api-Version` | `2022-11-28` |
     | `Content-Type` | `application/json` |

     ⚠️ トークンは `github_pat_` で始まります。`Bearer ` の後ろにトークン**全文をそのまま**貼ってください。
     `Bearer github_pat_github_pat_...` のように `github_pat_` が**二重**にならないよう注意。
   - **Request body**:
     ```json
     {"ref":"main"}
     ```
6. 保存 → **「TEST RUN」** で実行 → 成功すると応答 **204**。
   GitHub の **Actions** タブに「Collect wait times」(event: workflow_dispatch) が動けばOK。

---

## 確認
- cron-job.org の各ジョブ実行が **204**（成功）になっているか
- GitHub の **Actions** に定時で実行履歴が増えているか
- 過去データページの日付プルダウンに、日付が毎日増えていくか

## 注意
- PAT は cron-job.org に保存されます。権限は **このリポジトリの Actions のみ**に絞っているので影響は限定的です。漏れた場合は GitHub の Developer settings から **Revoke** できます。
- GitHub 内蔵 cron（`collect-wait-times.yml` の schedule）は**バックアップ**として残してあります（収集は冪等なので重複しても問題なし）。
