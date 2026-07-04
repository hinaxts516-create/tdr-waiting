/* =========================================================================
 * scripts/build-maxwaits.mjs
 *   蓄積済みの全 data/day-*.json を走査し、アトラクション(infoId)別の
 *   「全期間の最大待ち時間」を data/max-waits.json に書き出す。
 *
 *   フロント（静的サイト）は現在の待ち時間がこの最大の80%以下のとき
 *   「並び時」と判定する（Firestore不要・収集データから算出）。
 *
 *   実行: node scripts/build-maxwaits.mjs
 *   冪等: 毎回すべての day-json から再計算して上書き。
 * ========================================================================= */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const DIR = "data";

async function main() {
  const idxPath = `${DIR}/days-index.json`;
  let dates = [];
  if (existsSync(idxPath)) {
    try { dates = JSON.parse(await readFile(idxPath, "utf8")); } catch {}
  }
  if (!Array.isArray(dates)) dates = [];

  const max = {};
  for (const d of dates) {
    const f = `${DIR}/day-${d}.json`;
    if (!existsSync(f)) continue;
    let day;
    try { day = JSON.parse(await readFile(f, "utf8")); } catch { continue; }
    for (const [id, series] of Object.entries(day.byId || {})) {
      for (const w of Object.values(series || {})) {
        const v = Number(w);
        if (!isNaN(v) && (max[id] == null || v > max[id])) max[id] = v;
      }
    }
  }

  await mkdir(DIR, { recursive: true });
  await writeFile(
    `${DIR}/max-waits.json`,
    JSON.stringify({ updatedAt: new Date().toISOString(), byId: max })
  );
  console.log(`max-waits.json を更新（${Object.keys(max).length} アトラクション / ${dates.length} 日分から算出）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
