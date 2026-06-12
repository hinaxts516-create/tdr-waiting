/* =========================================================================
 * scripts/sync-attractions.mjs
 *   Google スプレッドシート（CSV公開）からアトラクション一覧を取得し、
 *   data.js の ATTRACTIONS ブロックを再生成する。
 *   PARK_HOURS / SPECIAL_DAYS など他の定義は維持する（マーカー間のみ置換）。
 *
 *   実行: node scripts/sync-attractions.mjs            （SHEET_CSV_URL を取得）
 *         node scripts/sync-attractions.mjs --csv path （ローカルCSVで検証）
 *
 *   シートは「リンクを知っている全員（閲覧可）」または「ウェブに公開」が必要。
 *   取得に失敗した場合は data.js を変更せず終了（既存データを壊さない）。
 *
 *   列（ヘッダ名で解釈・順不同可）:
 *     id, park(TDL/TDS), name, area, type, popularity(0..1),
 *     capacity(0.3..1), infoId, dpa(任意)
 *   必須は park / name / infoId。popularity・capacity 空欄は推定値で補完。
 * ========================================================================= */
import { readFile, writeFile } from "node:fs/promises";

const SHEET_ID = "1ARqz9S7vaYH3DMFd2RPCMkRblmgwejy7elx7Zmz1Esg";
const DEFAULT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const UA = "Mozilla/5.0 (compatible; tdr-wait-time/1.0; +https://tdr-wait-time.com)";
const DATA_JS = "data.js";

const START = "/* >>> ATTRACTIONS:GENERATED — scripts/sync-attractions.mjs がスプレッドシートから生成。手動編集しないでください >>> */";
const END = "/* <<< ATTRACTIONS:GENERATED end <<< */";

/* ---- 最小CSVパーサ（ダブルクオート/改行/カンマ対応） ---- */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", i = 0, inQuotes = false;
  text = text.replace(/^﻿/, ""); // BOM除去
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/* ヘッダ→列インデックスの辞書を作る（表記ゆれを吸収） */
function headerIndex(header) {
  const norm = (s) => s.trim().toLowerCase().replace(/[\s_-]/g, "");
  const aliases = {
    id: ["id"],
    park: ["park", "パーク"],
    name: ["name", "名前", "名称", "アトラクション", "アトラクション名"],
    area: ["area", "エリア"],
    type: ["type", "種別", "カテゴリ", "タイプ"],
    popularity: ["popularity", "人気", "人気度"],
    capacity: ["capacity", "さばける量", "回転", "回転率"],
    infoId: ["infoid", "attrid", "attr_id"],
    dpa: ["dpa", "価格", "dpa価格"],
  };
  const cells = header.map(norm);
  const idx = {};
  for (const [key, names] of Object.entries(aliases)) {
    idx[key] = cells.findIndex((c) => names.map(norm).includes(c));
  }
  return idx;
}

const slug = (() => {
  let n = 0;
  return (park, name) => `${park.toLowerCase()}-auto-${++n}`;
})();

function toAttraction(cols, idx) {
  const get = (k) => (idx[k] >= 0 && cols[idx[k]] != null ? String(cols[idx[k]]).trim() : "");
  const park = get("park").toUpperCase();
  const name = get("name");
  const infoId = get("infoId");
  if (!name || (park !== "TDL" && park !== "TDS")) return null; // 必須欠落はスキップ

  const num = (k, def) => {
    const v = get(k);
    if (v === "") return def;
    const f = Number(v);
    return isNaN(f) ? def : f;
  };
  const att = {
    id: get("id") || slug(park, name),
    park,
    name,
    area: get("area") || "—",
    type: get("type") || "アトラクション",
    popularity: clamp(num("popularity", 0.6), 0, 1),
    capacity: clamp(num("capacity", 0.7), 0.3, 1),
    infoId: infoId || null,
  };
  const dpa = num("dpa", null);
  if (dpa != null && dpa > 0) att.dpa = Math.round(dpa);
  att._defaults = { popularity: get("popularity") === "", capacity: get("capacity") === "" };
  return att;
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* data.js のオブジェクトリテラルを生成 */
function renderAttractions(list) {
  const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const line = (a) => {
    const parts = [
      `id: "${esc(a.id)}"`,
      `name: "${esc(a.name)}"`,
      `area: "${esc(a.area)}"`,
      `type: "${esc(a.type)}"`,
      `popularity: ${a.popularity}`,
      `capacity: ${a.capacity}`,
      `infoId: ${a.infoId ? `"${esc(a.infoId)}"` : "null"}`,
    ];
    if (a.dpa) parts.push(`dpa: ${a.dpa}`);
    return `    { ${parts.join(", ")} },`;
  };
  const tdl = list.filter((a) => a.park === "TDL").map(line).join("\n");
  const tds = list.filter((a) => a.park === "TDS").map(line).join("\n");
  return `const ATTRACTIONS = {\n  TDL: [\n${tdl}\n  ],\n  TDS: [\n${tds}\n  ],\n};`;
}

async function loadCsv() {
  const fileArg = process.argv.indexOf("--csv");
  if (fileArg >= 0 && process.argv[fileArg + 1]) {
    return await readFile(process.argv[fileArg + 1], "utf8");
  }
  const url = process.env.SHEET_CSV_URL || DEFAULT_URL;
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}（シートが「リンク共有/ウェブ公開」になっているか確認）`);
  const text = await res.text();
  if (/^\s*</.test(text)) throw new Error("CSVではなくHTMLが返却（共有設定が非公開の可能性）");
  return text;
}

async function main() {
  const csv = await loadCsv();
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error("行が足りません（ヘッダ＋1行以上必要）");
  const idx = headerIndex(rows[0]);
  if (idx.name < 0 || idx.park < 0) throw new Error("ヘッダに name / park が見つかりません");

  const list = [];
  const seen = new Set();
  let skipped = 0, noInfo = [], usedDefaults = [];
  for (let r = 1; r < rows.length; r++) {
    const a = toAttraction(rows[r], idx);
    if (!a) { skipped++; continue; }
    const key = `${a.park}:${a.infoId || a.name}`;
    if (seen.has(key)) { skipped++; continue; } // 重複除去
    seen.add(key);
    if (!a.infoId) noInfo.push(a.name);
    if (a._defaults.popularity || a._defaults.capacity) usedDefaults.push(a.name);
    delete a._defaults;
    list.push(a);
  }
  if (list.length === 0) throw new Error("有効なアトラクション行が0件");

  const block = `${START}\n${renderAttractions(list)}\n${END}`;
  const cur = await readFile(DATA_JS, "utf8");
  const re = new RegExp(
    START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  if (!re.test(cur)) throw new Error(`${DATA_JS} に生成マーカーが見つかりません`);
  const next = cur.replace(re, block.replace(/\$/g, "$$$$")); // $ を保護
  if (next === cur) {
    console.log(`変更なし（${list.length}件）`);
  } else {
    await writeFile(DATA_JS, next);
    console.log(`${DATA_JS} を更新: TDL ${list.filter(a=>a.park==="TDL").length} / TDS ${list.filter(a=>a.park==="TDS").length} 件`);
  }
  if (skipped) console.log(`スキップ: ${skipped} 行（必須欠落/重複）`);
  if (noInfo.length) console.log(`⚠ infoId 未設定（実測が紐付かず合成モデルで表示）: ${noInfo.join(", ")}`);
  if (usedDefaults.length) console.log(`ℹ popularity/capacity を既定値で補完: ${usedDefaults.join(", ")}`);
}

main().catch((e) => {
  console.error("同期失敗（data.js は変更しません）:", e.message);
  process.exit(1);
});
