/* =========================================================================
 * scripts/collect.mjs — ライブ待ち時間を取得して CSV に追記
 *   GitHub Actions（cron）から実行される。ローカル Node でも動作。
 *   出力: data/history-YYYY-MM.csv （月ごと）
 *   列:   timestamp(UTC ISO), park, apiId, status, wait
 * ========================================================================= */
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const PARKS = {
  TDL: "3cc919f1-d16d-43e0-8c3f-1dd269bd1a42",
  TDS: "67b290d5-3478-4f23-b601-2f8fb71ba803",
};

const DIR = "data";
const HEADER = "timestamp,park,apiId,status,wait\n";

async function main() {
  const iso = new Date().toISOString();      // 例: 2026-06-06T05:30:00.000Z
  const ym = iso.slice(0, 7);                 // YYYY-MM
  const file = `${DIR}/history-${ym}.csv`;

  const rows = [];
  for (const [park, pid] of Object.entries(PARKS)) {
    const res = await fetch(`https://api.themeparks.wiki/v1/entity/${pid}/live`);
    if (!res.ok) {
      console.error(`[${park}] HTTP ${res.status}`);
      continue;
    }
    const data = await res.json();
    for (const e of data.liveData || []) {
      if (e.entityType !== "ATTRACTION") continue;
      const wait = e.queue?.STANDBY?.waitTime ?? "";
      const status = e.status || "";
      rows.push(`${iso},${park},${e.id},${status},${wait}`);
    }
  }

  if (rows.length === 0) {
    console.error("収集できたレコードが 0 件のため中止します");
    process.exit(1);
  }

  await mkdir(DIR, { recursive: true });
  if (!existsSync(file)) await writeFile(file, HEADER);
  await appendFile(file, rows.join("\n") + "\n");
  console.log(`${rows.length} 件を ${file} に追記しました`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
