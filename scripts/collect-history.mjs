/* =========================================================================
 * scripts/collect-history.mjs
 *   tokyodisneyresort.info の attrWait.php（当日の30分刻み時系列）から
 *   “その日1日分”の待ち時間をまとめて取得し、
 *     - data/day-YYYY-MM-DD.json   … その日の時系列（JST）
 *     - data/days-index.json       … 収集済み日付の一覧
 *   を出力する（冪等：同じ日に何度実行しても上書きで自己修復）。
 *
 *   1回の実行で当日全体を取得できるため、GitHub の cron が多少間引かれても
 *   1日1回でも成功すれば当日の履歴が埋まる（高頻度cron依存を排除）。
 * ========================================================================= */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const UA = "Mozilla/5.0 (compatible; tdr-wait-time/1.0; +https://tdr-wait-time.com)";
const DIR = "data";

// 収集対象（infoId と park パラメータ）。data.js の infoId と一致。
const TARGETS = [
  ["100", "land"], ["414", "land"], ["123", "land"], ["112", "land"], ["110", "land"],
  ["133", "land"], ["163", "land"], ["134", "land"], ["120", "land"], ["102", "land"],
  ["366", "land"], ["132", "land"],
  ["405", "sea"], ["465", "sea"], ["464", "sea"], ["173", "sea"], ["144", "sea"],
  ["145", "sea"], ["150", "sea"], ["152", "sea"], ["466", "sea"], ["398", "sea"],
  ["159", "sea"], ["160", "sea"], ["164", "sea"],
];

/* attrWait.php の HTML から { "9:15": 160, ... } を抽出 */
function parseSeries(html) {
  const times = [...html.matchAll(/<th[^>]*>\s*(\d{1,2}:\d{2})\s*<\/th>/g)].map((m) => m[1]);
  const waits = [...html.matchAll(/<td[^>]*>\s*(\d{1,3})\s*分\s*<\/td>/g)].map((m) => Number(m[1]));
  const series = {};
  const n = Math.min(times.length, waits.length);
  for (let i = 0; i < n; i++) series[times[i]] = waits[i];
  return series;
}

async function fetchSeries(infoId, park) {
  const url = `https://tokyodisneyresort.info/attrWait.php?attr_id=${infoId}&park=${park}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${infoId}`);
  return parseSeries(await res.text());
}

/* JST(UTC+9) の YYYY-MM-DD */
function jstDate() {
  const j = new Date(Date.now() + 9 * 3600 * 1000);
  return j.toISOString().slice(0, 10);
}

/* 舞浜の天候を取得（Open-Meteo・無料/キー不要）。
 * WMO weather_code を sunny/cloudy/rain に変換して返す。取得失敗時は null。
 * ※ forecast.js の codeToWeather と同一マッピング（予測と整合させる）。 */
const WEATHER_LAT = 35.6329, WEATHER_LON = 139.8804;
function codeToWeather(code) {
  if (code <= 1) return "sunny";                                   // 0:快晴 1:晴れ
  if (code === 2 || code === 3 || code === 45 || code === 48) return "cloudy"; // 雲・霧
  return "rain";                                                   // 51以上: 雨/雪/雷雨
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
  const date = jstDate();
  const weather = await fetchWeather(date); // その日の実天候（取得できなければ null）
  const day = { date, weather, updatedAt: new Date().toISOString(), source: "tokyodisneyresort.info", byId: {} };

  let totalPoints = 0;
  for (const [infoId, park] of TARGETS) {
    try {
      const series = await fetchSeries(infoId, park);
      if (Object.keys(series).length) {
        day.byId[infoId] = series;
        totalPoints += Object.keys(series).length;
      }
    } catch (e) {
      console.error(`infoId ${infoId}: ${e.message}`);
    }
  }

  if (totalPoints === 0) {
    console.error("時系列を1点も取得できませんでした（休園日 or 構造変化）");
    process.exit(1);
  }

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

  console.log(`day-${date}.json を更新（${Object.keys(day.byId).length} アトラクション / ${totalPoints} 点 / 天候=${weather ?? "不明"}）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
