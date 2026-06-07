/* =========================================================================
 * scripts/collect-info.mjs
 *   tokyodisneyresort.info（公式サイトをスクレイピングした第三者サイト）から
 *   待ち時間を取得・解析し、
 *     - data/live-latest.json   … 最新スナップショット（ライブ表示用）
 *     - data/waits-YYYY-MM.csv  … 月別の履歴（過去データ用）
 *   を出力する。GitHub Actions（サーバー側）から実行する想定。
 *
 *   ※ 公式は公開APIが無く、データセンターIPからの直接アクセスを拒否するため、
 *      公式に近い値を出すこのサイトを情報源とする（非公式・構造変化に注意）。
 *   ※ アトラクションは安定した attr_id（= data.js の infoId）で識別する。
 * ========================================================================= */
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const PARKS = { land: "TDL", sea: "TDS" };
const DIR = "data";
const UA = "Mozilla/5.0 (compatible; tdr-wait-time/1.0; +https://tdr-wait-time.com)";

/* HTML から [{id, name, wait, status}] を抽出 */
function parsePark(html) {
  const out = [];
  const blockRe = /<a href="attrWait\.php\?attr_id=(\d+)&park=\w+">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = blockRe.exec(html))) {
    const id = m[1];
    const block = m[2];
    const nameM = block.match(/realtime-attr-name">([^<]*)</);
    const condM = block.match(/realtime-attr-condition">([\s\S]*?)<\/div>/);
    if (!nameM || !condM) continue;
    const name = nameM[1].replace(/&amp;/g, "&").trim();
    const cond = condM[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const numM = cond.match(/(\d+)\s*分/);
    if (numM) out.push({ id, name, wait: Number(numM[1]), status: "運営中" });
    else out.push({ id, name, wait: null, status: cond || "不明" });
  }
  return out;
}

async function fetchPark(parkParam) {
  const url = `https://tokyodisneyresort.info/realtime.php?park=${parkParam}&order=name`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${parkParam}`);
  return parsePark(await res.text());
}

async function main() {
  const iso = new Date().toISOString();
  const snapshot = { updatedAt: iso, source: "tokyodisneyresort.info", byId: {} };
  const csvRows = [];

  for (const [param, park] of Object.entries(PARKS)) {
    const list = await fetchPark(param);
    if (list.length === 0) throw new Error(`${park}: 0 件（構造変化の可能性）`);
    for (const a of list) {
      snapshot.byId[a.id] = { park, name: a.name, wait: a.wait, status: a.status };
      const w = a.wait == null ? "" : a.wait;
      csvRows.push(`${iso},${park},${a.id},${a.status},${w}`);
    }
    console.log(`${park}: ${list.length} 件`);
  }

  await mkdir(DIR, { recursive: true });
  await writeFile(`${DIR}/live-latest.json`, JSON.stringify(snapshot));

  const ym = iso.slice(0, 7);
  const file = `${DIR}/waits-${ym}.csv`;
  if (!existsSync(file)) await writeFile(file, "timestamp,park,infoId,status,wait\n");
  await appendFile(file, csvRows.join("\n") + "\n");

  console.log(`live-latest.json と ${file} を更新しました`);
}

main().catch((e) => { console.error(e); process.exit(1); });
