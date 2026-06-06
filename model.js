/* =========================================================================
 * model.js — 待ち時間の予測モデル
 *
 *  方針:
 *   1) 環境要因(曜日/季節/天候/祝日)から「混雑指数 crowdIndex」を算出
 *   2) 時間帯ごとの来園カーブ timeCurve(hour) を定義
 *   3) アトラクション属性(人気/さばける量)＋上記から “正解の待ち時間” を
 *      合成し、ノイズを加えて大量の擬似過去データを生成
 *   4) その過去データを特徴量化し、勾配降下法で線形回帰を学習
 *   5) 学習済みの重みで任意条件の待ち時間を予測
 *
 *  ※ 乱数は seed 固定の決定論的生成（Date.now/Math.random を使わない）
 * ========================================================================= */

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

// 曜日係数 (0=日 ... 6=土)
const DOW_FACTOR = [1.35, 0.80, 0.78, 0.80, 0.85, 1.05, 1.55];

// 月ごとの季節係数 (1〜12月)
const MONTH_FACTOR = [
  1.20, // 1月 (正月・冬休み)
  0.95, // 2月
  1.10, // 3月 (春休み)
  1.05, // 4月
  1.15, // 5月 (GW)
  0.90, // 6月 (梅雨で閑散)
  1.10, // 7月 (夏休み)
  1.20, // 8月 (夏休みピーク)
  1.05, // 9月
  1.15, // 10月 (ハロウィン)
  1.05, // 11月
  1.25, // 12月 (クリスマス)
];

// 天候係数（来園者数への影響）
const WEATHER_FACTOR = { sunny: 1.0, cloudy: 0.95, rain: 0.75 };
const WEATHER_LABEL  = { sunny: "晴れ", cloudy: "くもり", rain: "雨" };

/* 指定日の特別日係数を返す */
function specialDayFactor(date) {
  const key = String(date.getMonth() + 1).padStart(2, "0") + "-" +
              String(date.getDate()).padStart(2, "0");
  return SPECIAL_DAYS[key] || 1.0;
}

/* 混雑指数: 環境要因の合成（おおむね 0.5〜2.0 の範囲） */
function computeCrowdIndex(date, weather) {
  const dow = DOW_FACTOR[date.getDay()];
  const mon = MONTH_FACTOR[date.getMonth()];
  const wx  = WEATHER_FACTOR[weather] ?? 1.0;
  const sp  = specialDayFactor(date);
  return dow * mon * wx * sp;
}

/* 時間帯カーブ: 開園直後は低く、昼前と午後にピーク、閉園に向け減少 */
function timeCurve(hour) {
  const g1 = Math.exp(-Math.pow(hour - 11.5, 2) / 6);   // 昼前ピーク
  const g2 = 0.9 * Math.exp(-Math.pow(hour - 15.5, 2) / 8); // 午後ピーク
  return 0.30 + 0.70 * g1 + 0.60 * g2;                  // ≒ 0.3〜1.3
}

/* “正解”待ち時間（分）: 学習データ生成用の隠れ関数 */
function trueWait(att, crowd, tc) {
  const base = att.popularity * 100;          // 人気で基礎値
  const cap  = 1.35 - att.capacity;           // さばける量が小さいほど待つ
  let w = base * crowd * tc * cap;
  return Math.max(3, w);
}

/* 特徴量ベクトル（線形回帰の入力） */
function features(att, crowd, tc) {
  const pop = att.popularity;
  const lowCap = 1 - att.capacity;
  return [
    1,                    // バイアス
    pop,
    lowCap,
    crowd,
    tc,
    pop * crowd,          // 人気×混雑
    pop * tc,             // 人気×時間帯
    crowd * tc,           // 混雑×時間帯
    pop * crowd * tc,     // 三重交互作用
    lowCap * crowd,       // さばけにくさ×混雑
  ];
}
const N_FEAT = 10;

/* =========================================================================
 * WaitModel: 擬似データ生成 → 学習 → 予測
 * ========================================================================= */
const WaitModel = {
  weights: null,
  mean: null,
  std: null,
  metrics: null,
  trained: false,

  /* 全アトラクションをまとめて学習（パーク横断で1モデル） */
  train(seed = 12345) {
    const rng = makeRng(seed);
    const allAtt = [...ATTRACTIONS.TDL, ...ATTRACTIONS.TDS];
    const weathers = ["sunny", "sunny", "cloudy", "rain"]; // 出現頻度の重み付け

    const X = [], y = [];
    const SAMPLES = 6000;
    for (let i = 0; i < SAMPLES; i++) {
      const att = allAtt[Math.floor(rng() * allAtt.length)];
      // ランダムな日付（年内）と時刻
      const month = Math.floor(rng() * 12);
      const day = 1 + Math.floor(rng() * 28);
      const date = new Date(2025, month, day);
      const hour = PARK_HOURS.open + rng() * (PARK_HOURS.close - PARK_HOURS.open);
      const weather = weathers[Math.floor(rng() * weathers.length)];

      const crowd = computeCrowdIndex(date, weather);
      const tc = timeCurve(hour);
      const noise = 1 + gauss(rng) * 0.12;           // ±12% 程度の観測ノイズ
      const wait = Math.max(0, trueWait(att, crowd, tc) * noise);

      X.push(features(att, crowd, tc));
      y.push(wait);
    }

    // 特徴量の標準化（バイアス列は除く）
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

    // 勾配降下法（MSE 最小化）
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

    // 学習評価 (MAE, R²)
    let sae = 0, sse = 0, sst = 0, ybar = y.reduce((a, b) => a + b, 0) / n;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < N_FEAT; j++) pred += w[j] * Xn[i][j];
      sae += Math.abs(pred - y[i]);
      sse += (pred - y[i]) ** 2;
      sst += (y[i] - ybar) ** 2;
    }
    this.metrics = {
      samples: n,
      mae: sae / n,
      r2: 1 - sse / sst,
    };
    this.trained = true;
    return this.metrics;
  },

  /* 単一条件の予測（分） */
  predict(att, date, hour, weather) {
    if (!this.trained) this.train();
    const crowd = computeCrowdIndex(date, weather);
    const tc = timeCurve(hour);
    const raw = features(att, crowd, tc);
    const xn = raw.map((v, j) => (j === 0 ? 1 : (v - this.mean[j]) / this.std[j]));
    let pred = 0;
    for (let j = 0; j < N_FEAT; j++) pred += this.weights[j] * xn[j];
    return Math.max(0, Math.round(pred / 5) * 5); // 5分刻みに丸め
  },

  /* 1日分(開園〜閉園)の予測カーブを返す: [{hour, wait}] */
  dayCurve(att, date, weather) {
    const out = [];
    for (let h = PARK_HOURS.open; h <= PARK_HOURS.close; h++) {
      out.push({ hour: h, wait: this.predict(att, date, h, weather) });
    }
    return out;
  },
};
