# ✨ ディズニー アトラクション待ち時間 予測サイト

東京ディズニーランド / シーのアトラクション待ち時間を、学習済みモデルで予測するデモサイトです。
ビルド不要の純 HTML / CSS / JavaScript で動作します。

> ⚠️ 学習用デモです。待ち時間は実データではなく、合成データで学習したモデルによる予測値です。
> 東京ディズニーリゾート公式とは関係ありません。

## 機能
- 東京ディズニーランド / シーの切り替え
- **予測モード**: 日付・時刻・天候・並び替えに応じた待ち時間予測（ブラウザ内で線形回帰モデルを学習）
- **ライブモード**: [themeparks.wiki](https://themeparks.wiki/)（非公式API）から現在の実待ち時間・運営状況を取得して表示
- 詳細モーダルで 1 日のカーブ、昼間・夜間それぞれの狙い目時間を表示
  （ライブモードでは実測値を起点にモデル形状を当てはめた「実データ補正カーブ」を表示）

## データ源（実データ連携）
- ライブの待ち時間: `https://api.themeparks.wiki/v1/entity/{parkId}/live`（CORS 許可済み・サーバー不要）
- パーク entity ID は `data.js` の `PARK_ENTITY`、各アトラクションの対応IDは `apiId` で管理
- 非公式APIのため将来の仕様変更に注意。取得失敗時は予測値へ自動フォールバック

## 過去データの蓄積（自動収集）
- `.github/workflows/collect-wait-times.yml` が GitHub Actions で 10 分おきに実行
- `scripts/collect.mjs` がライブ待ち時間を取得し `data/history-YYYY-MM.csv` に追記・自動コミット
- 形式の詳細は [`data/README.md`](data/README.md)
- 手動テスト: リポジトリの **Actions** タブ → 「Collect wait times」→ **Run workflow**
- 注意: スケジュール実行は workflow ファイルが `main` に push されてから有効になります

## 使い方（ローカル）
`index.html` をブラウザで開くだけで動作します。

## ファイル構成
| ファイル | 役割 |
|---|---|
| `index.html` | 画面構造 |
| `styles.css` | デザイン（ホワイト基調） |
| `data.js` | 両パークのアトラクション定義・祝日係数 |
| `model.js` | 合成データ生成＋学習＋予測 |
| `app.js` | UI・一覧描画・チャート |
| `serve.ps1` | 確認用の簡易静的サーバー（Node/Python 不要環境向け） |

## 公開（GitHub Pages）
1. このリポジトリを GitHub に push
2. GitHub の **Settings → Pages** を開く
3. **Build and deployment** で「Deploy from a branch」を選び、`main` ブランチ / `/ (root)` を指定して保存
4. 数十秒後、`https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される
