# data/ — 待ち時間の蓄積データ

GitHub Actions（`.github/workflows/collect-wait-times.yml`）が 30 分おきに
ライブ待ち時間を取得し、月ごとの CSV に追記していきます。

## ファイル
- `history-YYYY-MM.csv` … その月の記録

## 列
| 列 | 内容 |
|---|---|
| `timestamp` | 取得時刻（UTC, ISO8601）。JST へは +9 時間 |
| `park` | `TDL` / `TDS` |
| `apiId` | themeparks.wiki の entity ID（`data.js` の `apiId` と対応） |
| `status` | `OPERATING` / `CLOSED` / `DOWN` / `REFURBISHMENT` |
| `wait` | スタンバイ待ち時間（分）。空欄は値なし |

このデータが貯まると、合成データではなく実測の履歴で予測モデルを再学習できます。
