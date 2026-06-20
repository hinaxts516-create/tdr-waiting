/* =========================================================================
 * history.js — 過去の待ち時間データ（data/day-YYYY-MM-DD.json）の一覧表示
 *   日付一覧は data/days-index.json から取得。文言は i18n.js の L 経由。
 * ========================================================================= */

const $ = (id) => document.getElementById(id);
const state = { park: "TDL", date: null, sort: "avg" };
let dayData = null; // 現在表示中の日のデータ

function fmtDateLabel(key) {
  const [y, m, d] = key.split("-").map(Number);
  return L.histDateLabel(y, m, d);
}

async function loadDay(date) {
  try {
    const res = await fetch(`/data/day-${date}.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    dayData = await res.json();
  } catch {
    dayData = null;
  }
}

function init() {
  $("parkTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.park = btn.dataset.park;
    [...$("parkTabs").children].forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
  $("dateSelect").addEventListener("change", async (e) => {
    state.date = e.target.value;
    await loadDay(state.date);
    render();
  });
  $("sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  fetch(`/data/days-index.json?t=${Date.now()}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])
    .then(async (dates) => {
      if (!dates || dates.length === 0) {
        $("info").textContent = L.histEmpty;
        $("tableWrap").innerHTML = "";
        return;
      }
      $("dateSelect").innerHTML = dates.map((d) => `<option value="${d}">${fmtDateLabel(d)}</option>`).join("");
      state.date = dates[0];
      await loadDay(state.date);
      render();
    });
}

/* 営業時間内(9〜21時)の時系列だけを対象に統計を出す */
function statsFor(series) {
  const pts = Object.entries(series || {})
    .map(([t, w]) => ({ hour: Number(t.split(":")[0]), t, w: Number(w) }))
    .filter((p) => p.hour >= 9 && p.hour <= 21 && !isNaN(p.w));
  if (pts.length === 0) return null;
  const waits = pts.map((p) => p.w);
  const sum = waits.reduce((a, b) => a + b, 0);
  const peak = pts.reduce((a, b) => (b.w > a.w ? b : a));
  return {
    avg: Math.round(sum / waits.length),
    max: Math.max(...waits),
    min: Math.min(...waits),
    peakTime: peak.t,
    n: waits.length,
  };
}

function render() {
  if (!state.date) return;
  const byId = (dayData && dayData.byId) || {};

  const rows = ATTRACTIONS[state.park]
    .filter((att) => att.infoId)
    .map((att) => ({ att, st: statsFor(byId[att.infoId]) }));

  const val = (r, k) => (r.st ? r.st[k] : -1);
  if (state.sort === "avg") rows.sort((a, b) => val(b, "avg") - val(a, "avg"));
  else if (state.sort === "max") rows.sort((a, b) => val(b, "max") - val(a, "max"));
  else rows.sort((a, b) => attName(a.att).localeCompare(attName(b.att), LANG));

  const withData = rows.filter((r) => r.st).length;
  const upd = dayData && dayData.updatedAt ? new Date(dayData.updatedAt) : null;
  $("info").innerHTML =
    L.histActual(fmtDateLabel(state.date)) +
    L.histWithData(withData) +
    (upd ? L.histUpdated(String(upd.getHours()).padStart(2, "0"), String(upd.getMinutes()).padStart(2, "0")) : "");
  $("sectionTitle").textContent = L.histSectionTitle(parkLabel(state.park), fmtDateLabel(state.date));

  const body = rows.map((r) => {
    if (!r.st) {
      return `<tr class="nodata"><td class="nm">${attName(r.att)}</td><td colspan="4">${L.histNoData}</td></tr>`;
    }
    const s = r.st;
    return `<tr>
      <td class="nm">${attName(r.att)}</td>
      <td class="num">${s.avg}<small>${L.unit}</small></td>
      <td class="num">${s.max}<small>${L.unit}</small> <span class="muted">(${s.peakTime})</span></td>
      <td class="num">${s.min}<small>${L.unit}</small></td>
      <td class="num">${s.n}</td>
    </tr>`;
  }).join("");

  $("tableWrap").innerHTML = `
    <table class="hist-table">
      <thead><tr>
        <th>${L.histCols.name}</th><th>${L.histCols.avg}</th><th>${L.histCols.max}</th><th>${L.histCols.min}</th><th>${L.histCols.n}</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

document.addEventListener("DOMContentLoaded", init);
