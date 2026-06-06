/* =========================================================================
 * app.js — UI ロジック（パーク切替・一覧描画・詳細モーダル・チャート）
 * ========================================================================= */

const state = {
  park: "TDL",
  date: new Date(2026, 6 - 1, 6), // 既定日（今日）。後で input から上書き
  hour: 12,
  weather: "sunny",
  sort: "wait",
  selected: null,
};

const $ = (id) => document.getElementById(id);

/* 待ち時間 → 混雑レベルのラベル/クラス */
function level(wait) {
  if (wait <= 20) return { cls: "lv-low", text: "空いている" };
  if (wait <= 45) return { cls: "lv-mid", text: "やや混雑" };
  if (wait <= 80) return { cls: "lv-high", text: "混雑" };
  return { cls: "lv-vhigh", text: "大変混雑" };
}

function fmtDow(date) {
  return "日月火水木金土"[date.getDay()];
}

/* ---- 初期化 ---- */
function init() {
  // モデル学習
  const m = WaitModel.train();
  $("mSamples").textContent = m.samples.toLocaleString();
  $("mMae").textContent = m.mae.toFixed(1);
  $("mR2").textContent = m.r2.toFixed(3);

  // 既定の日付を input に反映
  const d = state.date;
  $("dateInput").value =
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // イベント登録
  $("parkTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.park = btn.dataset.park;
    [...$("parkTabs").children].forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });

  $("dateInput").addEventListener("change", (e) => {
    const [y, mo, da] = e.target.value.split("-").map(Number);
    if (y) state.date = new Date(y, mo - 1, da);
    render();
  });

  $("timeInput").addEventListener("input", (e) => {
    state.hour = Number(e.target.value);
    $("timeVal").textContent = `${String(state.hour).padStart(2, "0")}:00`;
    render();
  });

  $("weatherInput").addEventListener("change", (e) => { state.weather = e.target.value; render(); });
  $("sortInput").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  $("modalClose").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  render();
}

/* ---- 一覧描画 ---- */
function render() {
  const list = ATTRACTIONS[state.park].map((att) => ({
    att,
    wait: WaitModel.predict(att, state.date, state.hour, state.weather),
  }));

  if (state.sort === "wait") list.sort((a, b) => b.wait - a.wait);
  else if (state.sort === "waitAsc") list.sort((a, b) => a.wait - b.wait);
  else list.sort((a, b) => a.att.name.localeCompare(b.att.name, "ja"));

  // バッジ更新
  const crowd = computeCrowdIndex(state.date, state.weather);
  $("mCrowd").innerHTML = `混雑指数: <b>${crowd.toFixed(2)}</b>（${WEATHER_LABEL[state.weather]}・${fmtDow(state.date)}曜）`;
  $("sectionTitle").textContent =
    `${PARK_LABELS[state.park]} ／ ${state.date.getMonth() + 1}月${state.date.getDate()}日(${fmtDow(state.date)}) ${String(state.hour).padStart(2, "0")}:00 の予測`;

  const grid = $("grid");
  grid.innerHTML = "";
  for (const { att, wait } of list) {
    const lv = level(wait);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="name">${att.name}</div>
      <div class="meta">${att.area}・${att.type}</div>
      <div class="wait"><span class="num">${wait}</span><span class="unit">分</span></div>
      <span class="badge ${lv.cls}">${lv.text}</span>
    `;
    card.addEventListener("click", () => openModal(att));
    grid.appendChild(card);
  }
}

/* ---- 詳細モーダル ---- */
function openModal(att) {
  state.selected = att;
  const curve = WaitModel.dayCurve(att, state.date, state.weather);
  const nowWait = WaitModel.predict(att, state.date, state.hour, state.weather);
  const max = curve.reduce((a, b) => (b.wait > a.wait ? b : a));
  // 狙い目を「昼間（〜15時）」「夜間（16〜20時）」に分けて算出
  const minIn = (lo, hi) =>
    curve.filter((c) => c.hour >= lo && c.hour <= hi)
         .reduce((a, b) => (b.wait < a.wait ? b : a));
  const bestDay = minIn(PARK_HOURS.open, 15);
  const bestNight = minIn(16, 20);

  $("mTitle").textContent = att.name;
  $("mMeta").textContent =
    `${att.area}・${att.type}　|　${state.date.getMonth() + 1}/${state.date.getDate()}(${fmtDow(state.date)})・${WEATHER_LABEL[state.weather]}`;
  $("nowWait").textContent = nowWait;
  $("maxWait").textContent = max.wait;
  $("bestDay").textContent = `${bestDay.hour}:00 (${bestDay.wait}分)`;
  $("bestNight").textContent = `${bestNight.hour}:00 (${bestNight.wait}分)`;

  drawChart(curve, state.hour);
  $("modal").classList.add("open");
}

function closeModal() {
  $("modal").classList.remove("open");
  state.selected = null;
}

/* ---- Canvas チャート ---- */
function drawChart(curve, curHour) {
  const canvas = $("chart");
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 660;
  const cssH = 240;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const padL = 38, padR = 14, padT = 16, padB = 28;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;
  const maxWait = Math.max(60, Math.ceil(Math.max(...curve.map((c) => c.wait)) / 30) * 30);

  const x = (h) => padL + ((h - PARK_HOURS.open) / (PARK_HOURS.close - PARK_HOURS.open)) * plotW;
  const y = (w) => padT + (1 - w / maxWait) * plotH;

  // グリッド + Y軸ラベル
  ctx.strokeStyle = "rgba(31,42,68,.10)";
  ctx.fillStyle = "#6b7794";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";
  for (let w = 0; w <= maxWait; w += 30) {
    const yy = y(w);
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(cssW - padR, yy); ctx.stroke();
    ctx.fillText(`${w}`, padL - 6, yy + 4);
  }
  // X軸ラベル
  ctx.textAlign = "center";
  for (let h = PARK_HOURS.open; h <= PARK_HOURS.close; h += 2) {
    ctx.fillText(`${h}`, x(h), cssH - 10);
  }

  // エリア塗り
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, "rgba(47,107,255,.28)");
  grad.addColorStop(1, "rgba(47,107,255,.02)");
  ctx.beginPath();
  ctx.moveTo(x(curve[0].hour), y(curve[0].wait));
  curve.forEach((c) => ctx.lineTo(x(c.hour), y(c.wait)));
  ctx.lineTo(x(curve[curve.length - 1].hour), y(0));
  ctx.lineTo(x(curve[0].hour), y(0));
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 折れ線
  ctx.beginPath();
  curve.forEach((c, i) => {
    const px = x(c.hour), py = y(c.wait);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.strokeStyle = "#2f6bff";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 現在時刻マーカー
  const cur = curve.find((c) => c.hour === curHour) || curve[0];
  const cx = x(cur.hour), cy = y(cur.wait);
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#2f6bff";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
  // ラベル
  ctx.fillStyle = "#1f2a44";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${cur.wait}分`, cx, cy - 12);
}

document.addEventListener("DOMContentLoaded", init);
