/* =========================================================================
 * scripts/build-history.mjs
 *   蓄積したライブ実測 data/waits-YYYY-MM.csv から、指定 JST 日の
 *   当日時系列 data/day-YYYY-MM-DD.json を組み立てる（＋days-index.json更新）。
 *
 *   ねらい: 履歴を「別途スクレイプ(attrWait)」ではなく、15分ごとに確実に貯まる
 *   ライブ収集(collect-info)の積み上げから生成する。これにより履歴がライブと
 *   同じ信頼性になり、スクレイプや別cronの取りこぼしに左右されない。
 *
 *   実行: node scripts/build-history.mjs            （今日JSTを生成）
 *         node scripts/build-history.mjs 2026-06-21 （日付指定）
 *
 *   冪等: 同じ日に何度実行しても、その時点までのCSVから上書き再生成する。
 * ========================================================================= */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";

const DIR = "data";
const UA = "Mozilla/5.0 (compatible; tdr-wait-time/1.0; +https://tdr-wait-time.com)";
const pad2 = (n) => String(n).padStart(2, "0");

/* JST(UTC+9) の YYYY-MM-DD（今日） */
function jstToday() {
  const j = new Date(Date.now() + 9 * 3600 * 1000);
  return j.toISOString().slice(0, 10);
}
/* UTC ISO 文字列 → JST の {date:'YYYY-MM-DD', h, m} */
function toJst(iso) {
  const j = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  if (isNaN(j.getTime())) return null;
  return { date: j.toISOString().slice(0, 10), h: j.getUTCHours(), m: j.getUTCMinutes() };
}

/* 舞浜の天候(Open-Meteo)。WMOコード→sunny/cloudy/rain。失敗時 null。
 * ※ forecast.js / collect-history.mjs と同一マッピング。 */
const WEATHER_LAT = 35.6329, WEATHER_LON = 139.8804;
function codeToWeather(code) {
  if (code <= 1) return "sunny";
  if (code === 2 || code === 3 || code === 45 || code === 48) return "cloudy";
  return "rain";
}
async function fetchWeather(dateStr) {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}` +
      `&daily=weather_code&timezone=Asia%2FTokyo&start_date=${dateStr}&end_date=${dateStr}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const d = await res.json();
    const code = d?.daily?.weather_code?.[0];
    return code == null ? null : codeToWeather(code);
  } catch {
    return null;
  }
}

async function main() {
  const date = process.argv[2] || jstToday();
  const ym = date.slice(0, 7);
  const csvPath = `${DIR}/waits-${ym}.csv`;
  if (!existsSync(csvPath)) {
    console.error(`CSVが見つかりません: ${csvPath}（ライブ収集が未蓄積）`);
    process.exit(0); // 失敗にはしない（生成すべきものが無いだけ）
  }

  const lines = readFileSync(csvPath, "utf8").split(/\r?\n/);
  const byId = {};
  let points = 0;
  for (let i = 1; i < lines.length; i++) { // 1行目はヘッダ
    const line = lines[i];
    if (!line) continue;
    // timestamp,park,infoId,status,wait
    const c = line.split(",");
    if (c.length < 5) continue;
    const [ts, , infoId, , waitStr] = c;
    const jst = toJst(ts);
    if (!jst || jst.date !== date) continue;
    if (waitStr === "" || waitStr == null) continue; // 待ち時間なし(休止/案内終了等)は除外
    const wait = Number(waitStr);
    if (isNaN(wait)) continue;
    const key = `${jst.h}:${pad2(jst.m)}`; // JST の H:MM
    (byId[infoId] ||= {})[key] = wait;     // 同分の重複は後勝ち
    points++;
  }

  if (points === 0) {
    console.error(`${date} のライブ実測がCSVに見つかりません（収集前 or 休園日）。day-json は更新しません。`);
    process.exit(0);
  }

  const weather = await fetchWeather(date);
  const day = {
    date,
    weather,
    updatedAt: new Date().toISOString(),
    source: "tokyodisneyresort.info (live snapshots)",
    byId,
  };

  await mkdir(DIR, { recursive: true });
  await writeFile(`${DIR}/day-${date}.json`, JSON.stringify(day));

  // 日付インデックスを更新（降順）
  const idxPath = `${DIR}/days-index.json`;
  let dates = [];
  if (existsSync(idxPath)) {
    try { dates = JSON.parse(await readFile(idxPath, "utf8")); } catch {}
  }
  if (!dates.includes(date)) dates.push(date);
  dates.sort().reverse();
  await writeFile(idxPath, JSON.stringify(dates));

  console.log(`day-${date}.json を生成（${Object.keys(byId).length} アトラクション / ${points} 点 / 天候=${weather ?? "不明"}）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
