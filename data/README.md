# data/ — 待ち時間の蓄積データ

GitHub Actions（`.github/workflows/collect-wait-times.yml`）が 10 分おきに
`tokyodisneyresort.info`（公式情報を元にした非公式サイト）から待ち時間を取得し、
以下を出力します。

## ファイル
- `live-latest.json` … 最新スナップショット（サイトのライブ表示が読む）
- `waits-YYYY-MM.csv` … その月の履歴（過去データページが読む）
- `history-YYYY-MM.csv` … 【旧】themeparks.wiki 時代の記録（現在は未使用・参考）

## waits-*.csv の列
| 列 | 内容 |
|---|---|
| `timestamp` | 取得時刻（UTC, ISO8601）。JST へは +9 時間 |
| `park` | `TDL` / `TDS` |
| `infoId` | tokyodisneyresort.info の attr_id（`data.js` の `infoId` と対応） |
| `status` | `運営中` / `案内終了` / `休止` など（日本語） |
| `wait` | スタンバイ待ち時間（分）。空欄は値なし（休止等） |

## live-latest.json の形式
```json
{ "updatedAt": "ISO8601(UTC)", "source": "tokyodisneyresort.info",
  "byId": { "100": { "park": "TDL", "name": "...", "wait": 40, "status": "運営中" } } }
```

このデータが貯まると、合成データではなく実測の履歴で予測モデルを再学習できます。
