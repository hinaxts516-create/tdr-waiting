import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ATTRACTIONS, PARK_LABELS, PARK_HOURS } from "./data.js";
import { WaitModel, computeCrowdIndex, WEATHER_LABEL } from "./model.js";
import { RealTime } from "./realtime.js";
import { reportMaxWaits, isQueueTime, QUEUE_THRESHOLD } from "./firebase.js";

/* ---- ヘルパー ---- */
function level(wait) {
  if (wait <= 20) return { cls: "lv-low", text: "空いている" };
  if (wait <= 45) return { cls: "lv-mid", text: "やや混雑" };
  if (wait <= 80) return { cls: "lv-high", text: "混雑" };
  return { cls: "lv-vhigh", text: "大変混雑" };
}
const fmtDow = (date) => "日月火水木金土"[date.getDay()];
const clampHour = (h) => Math.min(PARK_HOURS.close, Math.max(PARK_HOURS.open, h));
const toDateInput = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* 実測値を起点にモデル形状を当てはめた補正カーブ */
function calibratedCurve(att, weather) {
  const today = new Date();
  const base = WaitModel.dayCurve(att, today, weather);
  const live = RealTime.get(att);
  if (live && live.status === "OPERATING" && live.wait != null) {
    const nowHour = clampHour(today.getHours());
    const p = WaitModel.predict(att, today, nowHour, weather);
    const scale = p > 0 ? live.wait / p : 1;
    return {
      curve: base.map((c) => ({ hour: c.hour, wait: Math.max(0, Math.round((c.wait * scale) / 5) * 5) })),
      anchorHour: nowHour,
      calibrated: true,
    };
  }
  return { curve: base, anchorHour: clampHour(today.getHours()), calibrated: false };
}

/* ---- Canvas チャート描画 ---- */
function drawChart(canvas, curve, curHour) {
  if (!canvas) return;
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

  ctx.strokeStyle = "rgba(31,42,68,.10)";
  ctx.fillStyle = "#6b7794";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";
  for (let w = 0; w <= maxWait; w += 30) {
    const yy = y(w);
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(cssW - padR, yy); ctx.stroke();
    ctx.fillText(`${w}`, padL - 6, yy + 4);
  }
  ctx.textAlign = "center";
  for (let h = PARK_HOURS.open; h <= PARK_HOURS.close; h += 2) {
    ctx.fillText(`${h}`, x(h), cssH - 10);
  }

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

  ctx.beginPath();
  curve.forEach((c, i) => {
    const px = x(c.hour), py = y(c.wait);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.strokeStyle = "#2f6bff";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const cur = curve.find((c) => c.hour === curHour) || curve[0];
  const cx = x(cur.hour), cy = y(cur.wait);
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#2f6bff";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#1f2a44";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${cur.wait}分`, cx, cy - 12);
}

/* ---- 詳細モーダル ---- */
function Modal({ att, mode, weather, hour, date, onClose }) {
  const canvasRef = useRef(null);

  const view = useMemo(() => {
    const live = RealTime.get(att);
    let curve, markerHour, nowLabel, nowVal, metaExtra;
    if (mode === "live") {
      const cal = calibratedCurve(att, weather);
      curve = cal.curve;
      markerHour = cal.anchorHour;
      const operating = live && live.status === "OPERATING" && live.wait != null;
      nowVal = operating ? live.wait : (live ? RealTime.statusLabel(live.status) : "—");
      nowLabel = "現在の実待ち時間";
      metaExtra = cal.calibrated ? "本日の予測（実データで補正）" : "本日の予測";
    } else {
      curve = WaitModel.dayCurve(att, date, weather);
      markerHour = hour;
      nowVal = WaitModel.predict(att, date, hour, weather);
      nowLabel = "指定時刻の予測";
      metaExtra = `${date.getMonth() + 1}/${date.getDate()}(${fmtDow(date)})・${WEATHER_LABEL[weather]}`;
    }
    const max = curve.reduce((a, b) => (b.wait > a.wait ? b : a));
    const minIn = (lo, hi) =>
      curve.filter((c) => c.hour >= lo && c.hour <= hi).reduce((a, b) => (b.wait < a.wait ? b : a));
    return { curve, markerHour, nowLabel, nowVal, metaExtra, max, bestDay: minIn(PARK_HOURS.open, 15), bestNight: minIn(16, 20) };
  }, [att, mode, weather, hour, date]);

  useEffect(() => {
    drawChart(canvasRef.current, view.curve, view.markerHour);
  }, [view]);

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target.classList.contains("modal-backdrop")) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>{att.name}</h2>
        <div className="meta">{att.area}・{att.type}　|　{view.metaExtra}</div>
        <div className="now-box">
          <div className="item">
            <div className="k">{view.nowLabel}</div>
            <div className="v">{view.nowVal}{typeof view.nowVal === "number" && <small>分</small>}</div>
          </div>
          <div className="item"><div className="k">本日の最大予測</div><div className="v">{view.max.wait}<small>分</small></div></div>
          <div className="item"><div className="k">昼間の狙い目<small>（〜15時）</small></div><div className="v" style={{ fontSize: 22 }}>{view.bestDay.hour}:00 ({view.bestDay.wait}分)</div></div>
          <div className="item"><div className="k">夜間の狙い目<small>（16〜20時）</small></div><div className="v" style={{ fontSize: 22 }}>{view.bestNight.hour}:00 ({view.bestNight.wait}分)</div></div>
        </div>
        <div className="chart-wrap">
          <canvas ref={canvasRef} />
          <div className="legend">青線=1日の予測待ち時間カーブ／<span className="cur">●</span> 現在選択中の時刻</div>
        </div>
      </div>
    </div>
  );
}

/* ---- メイン ---- */
export default function App() {
  const [park, setPark] = useState("TDL");
  const [date, setDate] = useState(() => new Date());
  const [hour, setHour] = useState(12);
  const [weather, setWeather] = useState("sunny");
  const [sort, setSort] = useState("wait");
  const [mode, setMode] = useState("predict");
  const [selected, setSelected] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [liveTick, setLiveTick] = useState(0);
  const [liveState, setLiveState] = useState("idle"); // idle|loading|ok|err
  const [maxWaits, setMaxWaits] = useState({}); // { att.id: 過去最大待ち分 }（Firestore）

  // モデル学習（初回マウント時）
  useEffect(() => {
    setMetrics(WaitModel.train());
  }, []);

  const loadLive = useCallback(async () => {
    setLiveState("loading");
    await RealTime.fetchAll();
    setLiveState(RealTime.ok ? "ok" : "err");
    // 全アトラクションの現在待ち時間を集め、Firestore の過去最大を更新＆取得
    if (RealTime.ok) {
      const currentById = {};
      for (const p of ["TDL", "TDS"]) {
        for (const att of ATTRACTIONS[p]) {
          const live = RealTime.get(att);
          if (live && live.status === "OPERATING" && live.wait != null) {
            currentById[att.id] = live.wait;
          }
        }
      }
      reportMaxWaits(currentById).then((m) => setMaxWaits(m || {}));
    }
    setLiveTick((t) => t + 1);
  }, []);

  // 起動時に実データ取得
  useEffect(() => { loadLive(); }, [loadLive]);

  // Esc でモーダルを閉じる
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const switchMode = (m) => {
    setMode(m);
    if (m === "live" && !RealTime.ok) loadLive();
  };

  const crowd = computeCrowdIndex(date, weather);

  // 一覧データ
  const rows = useMemo(() => {
    void liveTick; // liveTick が変わったら再計算
    if (mode === "live") {
      const r = ATTRACTIONS[park].map((att) => {
        const live = RealTime.get(att);
        const operating = live && live.status === "OPERATING" && live.wait != null;
        return { att, live, operating, sortVal: operating ? live.wait : -1 };
      });
      if (sort === "wait") r.sort((a, b) => b.sortVal - a.sortVal);
      else if (sort === "waitAsc")
        r.sort((a, b) => (a.operating ? a.sortVal : 1e9) - (b.operating ? b.sortVal : 1e9));
      else r.sort((a, b) => a.att.name.localeCompare(b.att.name, "ja"));
      return r;
    }
    const r = ATTRACTIONS[park].map((att) => ({ att, wait: WaitModel.predict(att, date, hour, weather) }));
    if (sort === "wait") r.sort((a, b) => b.wait - a.wait);
    else if (sort === "waitAsc") r.sort((a, b) => a.wait - b.wait);
    else r.sort((a, b) => a.att.name.localeCompare(b.att.name, "ja"));
    return r;
  }, [park, date, hour, weather, sort, mode, liveTick]);

  const modeStatus = () => {
    if (mode !== "live") return RealTime.ok ? "実データ利用可（ライブに切替できます）" : "";
    if (liveState === "loading") return "実データ取得中…";
    if (liveState === "err") return null;
    if (RealTime.updatedAt) {
      const t = RealTime.updatedAt;
      return `LIVE ・ 最終更新 ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")} ・ 提供: themeparks.wiki（非公式）`;
    }
    return "";
  };

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1><span className="spark">✨</span> ディズニー アトラクション待ち時間 予測</h1>
          <div className="subtitle">学習済みモデルが日時・天候から待ち時間を予測します（React版）</div>
        </div>
        <div className="park-tabs">
          {["TDL", "TDS"].map((p) => (
            <button key={p} className={park === p ? "active" : ""} onClick={() => setPark(p)}>
              {p === "TDL" ? "ランド" : "シー"}
            </button>
          ))}
        </div>
      </header>

      <section className="controls">
        <div className="field">
          <label>日付</label>
          <input type="date" value={toDateInput(date)} onChange={(e) => {
            const [y, mo, da] = e.target.value.split("-").map(Number);
            if (y) setDate(new Date(y, mo - 1, da));
          }} />
        </div>
        <div className="field">
          <label>時刻 <span className="time-val">{String(hour).padStart(2, "0")}:00</span></label>
          <input type="range" min={9} max={21} step={1} value={hour} onChange={(e) => setHour(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>天候</label>
          <select value={weather} onChange={(e) => setWeather(e.target.value)}>
            <option value="sunny">晴れ</option>
            <option value="cloudy">くもり</option>
            <option value="rain">雨</option>
          </select>
        </div>
        <div className="field">
          <label>並び替え</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="wait">待ち時間が長い順</option>
            <option value="waitAsc">待ち時間が短い順</option>
            <option value="name">名前順</option>
          </select>
        </div>
      </section>

      <div className="mode-row">
        <div className="mode-tabs">
          <button data-mode="predict" className={mode === "predict" ? "active" : ""} onClick={() => switchMode("predict")}>📊 予測（モデル）</button>
          <button data-mode="live" className={mode === "live" ? "active" : ""} onClick={() => switchMode("live")}>🔴 ライブ（実データ）</button>
        </div>
        <div className={"mode-status" + (liveState === "err" && mode === "live" ? " err" : "")}>
          {mode === "live" && liveState === "err"
            ? "⚠ 実データの取得に失敗しました（予測値で代替表示）"
            : (mode === "live" && RealTime.ok
              ? <><span className="live-dot"></span>{modeStatus()}</>
              : modeStatus())}
        </div>
      </div>

      <div className="model-badge">
        <span><span className="dot"></span><b>予測モデル稼働中</b></span>
        <span>学習データ: <b>{metrics ? metrics.samples.toLocaleString() : "—"}</b> 件</span>
        <span>平均誤差(MAE): <b>{metrics ? metrics.mae.toFixed(1) : "—"}</b> 分</span>
        <span>決定係数(R²): <b>{metrics ? metrics.r2.toFixed(3) : "—"}</b></span>
        <span>混雑指数: <b>{crowd.toFixed(2)}</b>（{WEATHER_LABEL[weather]}・{fmtDow(date)}曜）</span>
      </div>

      <div className="section-title">
        {mode === "live"
          ? `${PARK_LABELS[park]} ／ 現在のリアルタイム待ち時間`
          : `${PARK_LABELS[park]} ／ ${date.getMonth() + 1}月${date.getDate()}日(${fmtDow(date)}) ${String(hour).padStart(2, "0")}:00 の予測`}
      </div>

      <div className="grid">
        {rows.map((row) => {
          const { att } = row;
          let body;
          let dim = false;
          if (mode === "live") {
            if (row.operating) {
              const lv = level(row.live.wait);
              const max = maxWaits[att.id];
              const queue = isQueueTime(row.live.wait, max);
              body = <>
                <div className="wait"><span className="num">{row.live.wait}</span><span className="unit">分</span></div>
                <span className={"badge " + lv.cls}>{lv.text}</span>
                {queue && <span className="badge lv-low">🎯 並び時</span>}
                {typeof max === "number" && <div className="meta">過去最大 {max}分</div>}
              </>;
            } else if (row.live) {
              dim = true;
              body = <div className="status-txt">{RealTime.statusLabel(row.live.status)}</div>;
            } else {
              dim = true;
              body = <div className="status-txt">実データなし</div>;
            }
          } else {
            const lv = level(row.wait);
            body = <><div className="wait"><span className="num">{row.wait}</span><span className="unit">分</span></div><span className={"badge " + lv.cls}>{lv.text}</span></>;
          }
          return (
            <div key={att.id} className={"card" + (dim ? " dim" : "")} onClick={() => setSelected(att)}>
              <div className="name">{att.name}</div>
              <div className="meta">{att.area}・{att.type}</div>
              {body}
            </div>
          );
        })}
      </div>

      <footer className="note">
        ※「予測」モードは合成データで学習したモデルによる予測値、「ライブ」モードは実際の待ち時間です。<br />
        ライブの待ち時間データ提供: <a href="https://themeparks.wiki/" target="_blank" rel="noopener">themeparks.wiki</a>（非公式API）。本サイトは東京ディズニーリゾート公式とは関係ありません。
      </footer>

      {selected && (
        <Modal att={selected} mode={mode} weather={weather} hour={hour} date={date} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
