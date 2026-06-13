/* =========================================================================
 * app.js — UI ロジック（パーク切替・一覧描画・詳細モーダル・チャート）
 * ========================================================================= */

const state = {
  park: "TDL",
  date: new Date(), // 常に今日を初期値にする
  hour: 12,
  sort: "wait",
  mode: "predict", // "predict" | "live"
  selected: null,
};

// 天候は選択させず自動決定する。
//  直近数日は実天気予報(Forecast/Open-Meteo)、それ以降は平年気候(predictWeather)。
const WEATHER_EMOJI = { sunny: "☀️ 晴れ", cloudy: "☁️ くもり", rain: "🌧️ 雨" };
const SOURCE_LABEL = { forecast: "予報", climatology: "平年" };

/* 指定日の天候を決定: 実予報があれば優先、無ければ平年気候 */
function resolveWeather(date) {
  const f = Forecast.get(date);
  if (f) return { weather: f, source: "forecast" };
  return { weather: predictWeather(date), source: "climatology" };
}

/* 時刻をパーク運営時間内にクランプ */
function clampHour(h) {
  return Math.min(PARK_HOURS.close, Math.max(PARK_HOURS.open, h));
}

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

/* DPA（プレミアアクセス）を買うべきか判定。
 * 判定の主要因は待ち時間。価格と合わせ「1分あたりの節約コスト(円/分)」で評価。 */
function dpaVerdict(att, wait) {
  if (!att.dpa) return null;        // DPA対象外
  if (wait == null) return null;    // 待ち時間データなし（休止等）
  if (wait < 30) return { lv: "dpa-no", label: "不要", ypm: null, reason: "待ちが短く、並んでも十分です" };
  const ypm = Math.round(att.dpa / wait); // 円/分（小さいほどお得）
  if (ypm <= 30) return { lv: "dpa-buy", label: "買う価値大", ypm, reason: "時間効率が高く、購入の価値が大きいです" };
  if (ypm <= 50) return { lv: "dpa-maybe", label: "検討", ypm, reason: "予算と相談。混雑が増すなら購入価値が上がります" };
  return { lv: "dpa-no", label: "割高", ypm, reason: "今は並んだ方がお得かもしれません" };
}

/* カード用の小さなDPAチップ */
function dpaChipHtml(att, wait) {
  const v = dpaVerdict(att, wait);
  if (!v) return "";
  return `<span class="dpa-chip ${v.lv}">DPA ${v.label}</span>`;
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

  $("sortInput").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  $("modeTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.mode = btn.dataset.mode;
    [...$("modeTabs").children].forEach((b) => b.classList.toggle("active", b === btn));
    if (state.mode === "live" && !RealTime.ok) loadLive();
    setModeStatus();
    render();
  });

  $("modalClose").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  render();
  loadEmpirical(); // 蓄積した実測履歴で予測プロファイルを構築
  loadLive();      // 起動時にバックグラウンドで実データ取得
  loadForecast();  // 直近数日の実天気予報を取得
}

/* ---- 実測履歴の取り込み（予測の土台にする） ---- */
async function loadEmpirical() {
  await Empirical.load();
  const el = $("mEmp");
  if (el) {
    el.innerHTML = Empirical.daysLoaded > 0
      ? `実測反映: <b>${Empirical.daysLoaded}</b> 日分`
      : "実測反映: <b>蓄積中</b>";
  }
  render(); // 実測が入った状態で予測を再描画
}

/* ---- 天気予報の取得 ---- */
async function loadForecast() {
  await Forecast.fetchAll();
  render(); // 取得後に予測天候表示・予測値を更新
}

/* ---- 実データの取得と状態表示 ---- */
async function loadLive() {
  setModeStatus("loading");
  await RealTime.fetchAll();
  setModeStatus();
  if (state.mode === "live") render();
}

function setModeStatus(stateStr) {
  const el = $("modeStatus");
  el.className = "mode-status";
  if (stateStr === "loading") { el.textContent = "実データ取得中…"; return; }
  if (state.mode !== "live") {
    el.textContent = RealTime.ok ? "実データ利用可（ライブに切替できます）" : "";
    return;
  }
  if (RealTime.ok) {
    const t = RealTime.updatedAt;
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    el.innerHTML = `<span class="live-dot"></span>LIVE ・ 最終更新 ${hh}:${mm} ・ 提供: ${RealTime.source}`;
  } else {
    el.className = "mode-status err";
    el.textContent = "⚠ 実データの取得に失敗しました（予測値で代替表示）";
  }
}

/* ---- 一覧描画 ---- */
function render() {
  // 予測天候の表示を更新（直近は実予報、以降は平年）
  const { weather: w, source } = resolveWeather(state.date);
  $("weatherPred").textContent = `${WEATHER_EMOJI[w]}（${SOURCE_LABEL[source]}）`;
  state.mode === "live" ? renderLive() : renderPredict();
}

/* 予測モード */
function renderPredict() {
  const weather = resolveWeather(state.date).weather;
  const list = ATTRACTIONS[state.park].map((att) => ({
    att,
    closed: !!att.closed,
    wait: att.closed ? null : Predictor.predict(att, state.date, state.hour, weather),
  }));

  // 休止中は常に末尾。その上で選択中の基準で並べる。
  const closedLast = (a, b) => (a.closed ? 1 : 0) - (b.closed ? 1 : 0);
  if (state.sort === "wait") list.sort((a, b) => closedLast(a, b) || b.wait - a.wait);
  else if (state.sort === "waitAsc") list.sort((a, b) => closedLast(a, b) || a.wait - b.wait);
  else list.sort((a, b) => closedLast(a, b) || a.att.name.localeCompare(b.att.name, "ja"));

  const crowd = computeCrowdIndex(state.date, weather);
  $("mCrowd").innerHTML = `混雑指数: <b>${crowd.toFixed(2)}</b>（${WEATHER_LABEL[weather]}・${fmtDow(state.date)}曜）`;
  $("sectionTitle").textContent =
    `${PARK_LABELS[state.park]} ／ ${state.date.getMonth() + 1}月${state.date.getDate()}日(${fmtDow(state.date)}) ${String(state.hour).padStart(2, "0")}:00 の予測`;

  const grid = $("grid");
  grid.innerHTML = "";
  for (const { att, wait, closed } of list) {
    const card = document.createElement("div");
    card.className = "card";
    if (closed) {
      card.classList.add("dim");
      card.innerHTML = `
        <div class="name">${att.name}</div>
        <div class="meta">${att.area}・${att.type}</div>
        <div class="status-txt">休止中</div>
      `;
    } else {
      const lv = level(wait);
      card.innerHTML = `
        <div class="name">${att.name}</div>
        <div class="meta">${att.area}・${att.type}</div>
        <div class="wait"><span class="num">${wait}</span><span class="unit">分</span></div>
        <span class="badge ${lv.cls}">${lv.text}</span>
        ${dpaChipHtml(att, wait)}
      `;
    }
    card.addEventListener("click", () => openModal(att));
    grid.appendChild(card);
  }
}

/* ライブモード（実データ） */
function renderLive() {
  $("sectionTitle").textContent = `${PARK_LABELS[state.park]} ／ 現在のリアルタイム待ち時間`;

  // 並び替え用のソートキー: 運営中=待ち時間, それ以外=-1(末尾)
  const rows = ATTRACTIONS[state.park].map((att) => {
    const live = RealTime.get(att);
    const operating = !!(live && live.wait != null);
    return { att, live, operating, sortVal: operating ? live.wait : -1 };
  });
  if (state.sort === "wait") rows.sort((a, b) => b.sortVal - a.sortVal);
  else if (state.sort === "waitAsc")
    rows.sort((a, b) => (a.operating ? a.sortVal : 1e9) - (b.operating ? b.sortVal : 1e9));
  else rows.sort((a, b) => a.att.name.localeCompare(b.att.name, "ja"));

  const grid = $("grid");
  grid.innerHTML = "";
  for (const { att, live, operating } of rows) {
    const card = document.createElement("div");
    card.className = "card";
    let body;
    if (operating) {
      const lv = level(live.wait);
      body = `<div class="wait"><span class="num">${live.wait}</span><span class="unit">分</span></div>
              <span class="badge ${lv.cls}">${lv.text}</span>${dpaChipHtml(att, live.wait)}`;
    } else if (live) {
      card.classList.add("dim");
      body = `<div class="status-txt">${RealTime.statusLabel(live.status)}</div>`;
    } else {
      card.classList.add("dim");
      body = `<div class="status-txt">実データなし</div>`;
    }
    card.innerHTML = `
      <div class="name">${att.name}</div>
      <div class="meta">${att.area}・${att.type}</div>
      ${body}
    `;
    card.addEventListener("click", () => openModal(att));
    grid.appendChild(card);
  }

  if (!RealTime.ok && !rows.some((r) => r.live)) {
    grid.innerHTML = `<div class="status-txt" style="padding:20px">実データを取得できませんでした。「予測」モードをご利用ください。</div>`;
  }
}

/* ライブの実測値を起点にモデルの形状を当てはめた「補正済みカーブ」を返す */
function calibratedCurve(att) {
  const today = new Date();
  const weather = resolveWeather(today).weather;
  const base = Predictor.dayCurve(att, today, weather);
  const live = RealTime.get(att);
  if (live && live.wait != null) {
    const nowHour = clampHour(today.getHours());
    const p = Predictor.predict(att, today, nowHour, weather);
    const scale = p > 0 ? live.wait / p : 1;
    return {
      curve: base.map((c) => ({ hour: c.hour, wait: Math.max(0, Math.round((c.wait * scale) / 5) * 5) })),
      anchorHour: nowHour,
      calibrated: true,
    };
  }
  return { curve: base, anchorHour: clampHour(today.getHours()), calibrated: false };
}

/* 休止中の施設のモーダル（予測は表示しない） */
function openClosedModal(att) {
  $("mTitle").textContent = att.name;
  $("mMeta").textContent = `${att.area}・${att.type}　|　休止中`;
  $("nowLabel").textContent = "状態";
  $("nowWait").textContent = "休止中";
  $("nowUnit").style.display = "none";
  $("maxWait").textContent = "—";
  $("bestDay").textContent = "—";
  $("bestNight").textContent = "—";
  $("dpaBox").style.display = "none";
  const c = $("chart");
  c.getContext("2d").clearRect(0, 0, c.width, c.height);
  $("modal").classList.add("open");
}

/* ---- 詳細モーダル ---- */
function openModal(att) {
  state.selected = att;
  const live = RealTime.get(att);

  // 予測モードで休止中の施設は予測を出さない
  if (state.mode !== "live" && att.closed) { openClosedModal(att); return; }

  let curve, markerHour, nowLabel, nowVal, metaExtra;
  if (state.mode === "live") {
    const cal = calibratedCurve(att);
    curve = cal.curve;
    markerHour = cal.anchorHour;
    const operating = live && live.wait != null;
    nowVal = operating ? live.wait : (live ? RealTime.statusLabel(live.status) : "—");
    nowLabel = "現在の実待ち時間";
    metaExtra = cal.calibrated ? "本日の予測（実データで補正）" : "本日の予測";
  } else {
    const weather = resolveWeather(state.date).weather;
    curve = Predictor.dayCurve(att, state.date, weather);
    markerHour = state.hour;
    nowVal = Predictor.predict(att, state.date, state.hour, weather);
    const src = Predictor.source(att, state.date);
    nowLabel = src === "actual" ? "指定時刻の実測" : "指定時刻の予測";
    const basis = src === "actual" ? "実測値"
                : src === "empirical" ? `実測${Empirical.coverage(att)}日反映`
                : "モデル予測";
    metaExtra = `${state.date.getMonth() + 1}/${state.date.getDate()}(${fmtDow(state.date)})・${WEATHER_LABEL[weather]}・${basis}`;
  }

  const max = curve.reduce((a, b) => (b.wait > a.wait ? b : a));
  const minIn = (lo, hi) =>
    curve.filter((c) => c.hour >= lo && c.hour <= hi)
         .reduce((a, b) => (b.wait < a.wait ? b : a));
  const bestDay = minIn(PARK_HOURS.open, 15);
  const bestNight = minIn(16, 20);

  $("mTitle").textContent = att.name;
  $("mMeta").textContent = `${att.area}・${att.type}　|　${metaExtra}`;
  $("nowLabel").textContent = nowLabel;
  $("nowWait").textContent = nowVal;
  $("nowUnit").style.display = (typeof nowVal === "number") ? "" : "none";
  $("maxWait").textContent = max.wait;
  $("bestDay").textContent = `${bestDay.hour}:00 (${bestDay.wait}分)`;
  $("bestNight").textContent = `${bestNight.hour}:00 (${bestNight.wait}分)`;

  // DPA判定（その時の待ち時間 nowVal を使用）
  const dpaBox = $("dpaBox");
  const dpaWait = (typeof nowVal === "number") ? nowVal : null;
  const v = dpaVerdict(att, dpaWait);
  if (v) {
    dpaBox.style.display = "";
    dpaBox.innerHTML =
      `<div class="dpa-title">🎫 DPA判定: <span class="dpa-chip ${v.lv}">${v.label}</span></div>` +
      `<div class="dpa-detail">価格 約¥${att.dpa.toLocaleString()}　／　想定待ち ${dpaWait}分` +
      `${v.ypm != null ? `　／　約${v.ypm}円/分` : ""}<br>${v.reason}</div>`;
  } else if (att.dpa) {
    dpaBox.style.display = "";
    dpaBox.innerHTML =
      `<div class="dpa-title">🎫 DPA対象</div>` +
      `<div class="dpa-detail">待ち時間データがないため判定できません（休止中など）。価格 約¥${att.dpa.toLocaleString()}</div>`;
  } else {
    dpaBox.style.display = "none";
  }

  drawChart(curve, markerHour);
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
