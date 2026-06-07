/* =========================================================================
 * history.js — 過去の待ち時間データ（data/history-YYYY-MM.csv）の一覧表示
 * ========================================================================= */

const $ = (id) => document.getElementById(id);

const state = { park: "TDL", date: null, sort: "avg" };
let allRows = [];     // {tsMs, dateKey, hour, park, infoId, status, wait}
let byDate = {};      // dateKey -> rows[]

/* 直近 n か月分のファイル名 (YYYY-MM) */
function recentMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function parseCsv(text) {
  if (!text) return;
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const [ts, park, infoId, status, wait] = line.split(",");
    if (!ts || !infoId) continue;
    const tsMs = Date.parse(ts);
    if (isNaN(tsMs)) continue;
    const jst = new Date(tsMs + 9 * 3600 * 1000); // UTC→JST
    const dateKey =
      `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
    const w = (wait === undefined || wait === "") ? null : Number(wait);
    allRows.push({ tsMs, dateKey, hour: jst.getUTCHours(), park, infoId, status, wait: w });
  }
}

async function loadAll() {
  const months = recentMonths(6);
  const texts = await Promise.all(
    months.map((ym) =>
      fetch(`data/waits-${ym}.csv`, { cache: "no-store" })
        .then((r) => (r.ok ? r.text() : ""))
        .catch(() => "")
    )
  );
  texts.forEach(parseCsv);

  byDate = {};
  for (const r of allRows) (byDate[r.dateKey] ||= []).push(r);
}

function fmtDateLabel(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dow = "日月火水木金土"[new Date(y, m - 1, d).getDay()];
  return `${m}月${d}日(${dow})`;
}

function init() {
  // イベント
  $("parkTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.park = btn.dataset.park;
    [...$("parkTabs").children].forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
  $("dateSelect").addEventListener("change", (e) => { state.date = e.target.value; render(); });
  $("sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  loadAll().then(() => {
    const dates = Object.keys(byDate).sort().reverse(); // 新しい順
    const sel = $("dateSelect");
    if (dates.length === 0) {
      $("info").textContent = "まだ収集データがありません（自動収集が貯まると表示されます）。";
      $("tableWrap").innerHTML = "";
      return;
    }
    sel.innerHTML = dates.map((d) => `<option value="${d}">${fmtDateLabel(d)}</option>`).join("");
    state.date = dates[0];
    render();
  });
}

function render() {
  if (!state.date) return;
  const dayRows = (byDate[state.date] || []).filter((r) => r.park === state.park);

  // apiId ごとに集計
  const agg = {};
  for (const r of dayRows) {
    const a = (agg[r.infoId] ||= { count: 0, waits: [], peak: null });
    a.count++;
    if (r.wait != null && !isNaN(r.wait)) {
      a.waits.push(r.wait);
      if (!a.peak || r.wait > a.peak.wait) a.peak = { wait: r.wait, hour: r.hour };
    }
  }

  // マスターのアトラクション順に行を作る（実データ対象のみ）
  const rows = ATTRACTIONS[state.park]
    .filter((att) => att.infoId)
    .map((att) => {
      const a = agg[att.infoId];
      if (!a || a.waits.length === 0) {
        return { att, hasData: !!a, avg: null, max: null, min: null, peakHour: null, n: a ? a.count : 0 };
      }
      const sum = a.waits.reduce((x, y) => x + y, 0);
      return {
        att,
        hasData: true,
        avg: Math.round(sum / a.waits.length),
        max: Math.max(...a.waits),
        min: Math.min(...a.waits),
        peakHour: a.peak ? a.peak.hour : null,
        n: a.waits.length,
      };
    });

  // 並び替え（データ無しは末尾）
  const val = (r, k) => (r[k] == null ? -1 : r[k]);
  if (state.sort === "avg") rows.sort((a, b) => val(b, "avg") - val(a, "avg"));
  else if (state.sort === "max") rows.sort((a, b) => val(b, "max") - val(a, "max"));
  else rows.sort((a, b) => a.att.name.localeCompare(b.att.name, "ja"));

  // 情報バッジ
  const opCount = dayRows.filter((r) => r.wait != null).length;
  $("info").innerHTML =
    `<span><b>${fmtDateLabel(state.date)}</b> の記録</span>` +
    `<span>収集回数(のべ): <b>${dayRows.length.toLocaleString()}</b></span>` +
    `<span>運営中の記録: <b>${opCount.toLocaleString()}</b></span>`;
  $("sectionTitle").textContent = `${PARK_LABELS[state.park]} ／ ${fmtDateLabel(state.date)} の待ち時間（実績）`;

  // テーブル描画
  const body = rows.map((r) => {
    if (!r.avg && r.avg !== 0) {
      return `<tr class="nodata"><td class="nm">${r.att.name}</td><td colspan="4">記録なし（休止など）</td></tr>`;
    }
    return `<tr>
      <td class="nm">${r.att.name}</td>
      <td class="num">${r.avg}<small>分</small></td>
      <td class="num">${r.max}<small>分</small>${r.peakHour != null ? ` <span class="muted">(${r.peakHour}時)</span>` : ""}</td>
      <td class="num">${r.min}<small>分</small></td>
      <td class="num">${r.n}</td>
    </tr>`;
  }).join("");

  $("tableWrap").innerHTML = `
    <table class="hist-table">
      <thead><tr>
        <th>アトラクション</th><th>平均</th><th>最大(ピーク)</th><th>最小</th><th>記録数</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

document.addEventListener("DOMContentLoaded", init);
