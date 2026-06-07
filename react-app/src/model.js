/* =========================================================================
 * model.js — 待ち時間の予測モデル（ESモジュール版）
 * ========================================================================= */
import { ATTRACTIONS, PARK_HOURS, SPECIAL_DAYS } from "./data.js";

/* ---- 決定論的乱数 (mulberry32) ---- */
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* 標準正規乱数 (Box-Muller) */
function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ---- 環境要因 ---- */
const DOW_FACTOR = [1.35, 0.80, 0.78, 0.80, 0.85, 1.05, 1.55];

const MONTH_FACTOR = [
  1.20, 0.95, 1.10, 1.05, 1.15, 0.90,
  1.10, 1.20, 1.05, 1.15, 1.05, 1.25,
];

const WEATHER_FACTOR = { sunny: 1.0, cloudy: 0.95, rain: 0.75 };
export const WEATHER_LABEL = { sunny: "晴れ", cloudy: "くもり", rain: "雨" };

function specialDayFactor(date) {
  const key = String(date.getMonth() + 1).padStart(2, "0") + "-" +
              String(date.getDate()).padStart(2, "0");
  return SPECIAL_DAYS[key] || 1.0;
}

export function computeCrowdIndex(date, weather) {
  const dow = DOW_FACTOR[date.getDay()];
  const mon = MONTH_FACTOR[date.getMonth()];
  const wx  = WEATHER_FACTOR[weather] ?? 1.0;
  const sp  = specialDayFactor(date);
  return dow * mon * wx * sp;
}

function timeCurve(hour) {
  const g1 = Math.exp(-Math.pow(hour - 11.5, 2) / 6);
  const g2 = 0.9 * Math.exp(-Math.pow(hour - 15.5, 2) / 8);
  return 0.30 + 0.70 * g1 + 0.60 * g2;
}

function trueWait(att, crowd, tc) {
  const base = att.popularity * 100;
  const cap  = 1.35 - att.capacity;
  let w = base * crowd * tc * cap;
  return Math.max(3, w);
}

function features(att, crowd, tc) {
  const pop = att.popularity;
  const lowCap = 1 - att.capacity;
  return [
    1, pop, lowCap, crowd, tc,
    pop * crowd, pop * tc, crowd * tc, pop * crowd * tc, lowCap * crowd,
  ];
}
const N_FEAT = 10;

export const WaitModel = {
  weights: null, mean: null, std: null, metrics: null, trained: false,

  train(seed = 12345) {
    const rng = makeRng(seed);
    const allAtt = [...ATTRACTIONS.TDL, ...ATTRACTIONS.TDS];
    const weathers = ["sunny", "sunny", "cloudy", "rain"];

    const X = [], y = [];
    const SAMPLES = 6000;
    for (let i = 0; i < SAMPLES; i++) {
      const att = allAtt[Math.floor(rng() * allAtt.length)];
      const month = Math.floor(rng() * 12);
      const day = 1 + Math.floor(rng() * 28);
      const date = new Date(2025, month, day);
      const hour = PARK_HOURS.open + rng() * (PARK_HOURS.close - PARK_HOURS.open);
      const weather = weathers[Math.floor(rng() * weathers.length)];

      const crowd = computeCrowdIndex(date, weather);
      const tc = timeCurve(hour);
      const noise = 1 + gauss(rng) * 0.12;
      const wait = Math.max(0, trueWait(att, crowd, tc) * noise);

      X.push(features(att, crowd, tc));
      y.push(wait);
    }

    this.mean = new Array(N_FEAT).fill(0);
    this.std = new Array(N_FEAT).fill(1);
    for (let j = 1; j < N_FEAT; j++) {
      let m = 0;
      for (let i = 0; i < X.length; i++) m += X[i][j];
      m /= X.length;
      let s = 0;
      for (let i = 0; i < X.length; i++) s += (X[i][j] - m) ** 2;
      s = Math.sqrt(s / X.length) || 1;
      this.mean[j] = m; this.std[j] = s;
    }
    const Xn = X.map(row => row.map((v, j) => (j === 0 ? 1 : (v - this.mean[j]) / this.std[j])));

    let w = new Array(N_FEAT).fill(0);
    const lr = 0.05;
    const epochs = 600;
    const n = Xn.length;
    for (let e = 0; e < epochs; e++) {
      const grad = new Array(N_FEAT).fill(0);
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let j = 0; j < N_FEAT; j++) pred += w[j] * Xn[i][j];
        const err = pred - y[i];
        for (let j = 0; j < N_FEAT; j++) grad[j] += err * Xn[i][j];
      }
      for (let j = 0; j < N_FEAT; j++) w[j] -= (lr / n) * grad[j];
    }
    this.weights = w;

    let sae = 0, sse = 0, sst = 0, ybar = y.reduce((a, b) => a + b, 0) / n;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < N_FEAT; j++) pred += w[j] * Xn[i][j];
      sae += Math.abs(pred - y[i]);
      sse += (pred - y[i]) ** 2;
      sst += (y[i] - ybar) ** 2;
    }
    this.metrics = { samples: n, mae: sae / n, r2: 1 - sse / sst };
    this.trained = true;
    return this.metrics;
  },

  predict(att, date, hour, weather) {
    if (!this.trained) this.train();
    const crowd = computeCrowdIndex(date, weather);
    const tc = timeCurve(hour);
    const raw = features(att, crowd, tc);
    const xn = raw.map((v, j) => (j === 0 ? 1 : (v - this.mean[j]) / this.std[j]));
    let pred = 0;
    for (let j = 0; j < N_FEAT; j++) pred += this.weights[j] * xn[j];
    return Math.max(0, Math.round(pred / 5) * 5);
  },

  dayCurve(att, date, weather) {
    const out = [];
    for (let h = PARK_HOURS.open; h <= PARK_HOURS.close; h++) {
      out.push({ hour: h, wait: this.predict(att, date, h, weather) });
    }
    return out;
  },
};
