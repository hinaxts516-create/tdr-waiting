/* =========================================================================
 * empirical.js — 蓄積した実測履歴(data/day-*.json)から
 *   「アトラクション別・時間帯別の待ち時間プロファイル」を構築する。
 *
 *  考え方:
 *   - 各収集日の待ち時間を、その日の混雑指数 crowdIndex で割って正規化する
 *     （= “混雑1単位あたりの待ち時間”。曜日/季節/特別日の差を吸収する）
 *   - アトラクション×時間帯ごとに、全収集日で平均した正規化待ち時間を持つ
 *   - 予測時は normWait × 対象日の crowdIndex に戻すことで、
 *     収集していない日付にも実測の“形と水準”を反映できる
 *
 *  これにより、合成モデル(model.js)ではなく実測データが予測の土台になる。
 *  実測の無いアトラクション/時間帯だけ Predictor が合成モデルで補完する。
 * ========================================================================= */

const Empirical = {
  ready: false,
  daysLoaded: 0,          // 読み込めた日数
  prof: {},               // infoId -> { hour -> {s:正規化待ちの和, n:件数} }
  daysById: {},           // infoId -> Set(日付文字列)  … カバレッジ表示用
  MAX_DAYS: 60,           // 直近何日分まで取り込むか（負荷とメモリの上限）

  /* 30分刻み series {"9:15":160,...} を 時(hour) 平均 {9: 160, ...} に集約 */
  hourly(series) {
    const acc = {};
    for (const [t, w] of Object.entries(series || {})) {
      const hr = Number(String(t).split(":")[0]);
      const v = Number(w);
      if (isNaN(hr) || isNaN(v)) continue;
      if (hr < PARK_HOURS.open || hr > PARK_HOURS.close) continue; // 営業時間内のみ
      (acc[hr] ||= { s: 0, n: 0 });
      acc[hr].s += v;
      acc[hr].n += 1;
    }
    const out = {};
    for (const [hr, a] of Object.entries(acc)) out[hr] = a.s / a.n;
    return out;
  },

  /* days-index.json → 各 day-*.json を取得してプロファイルを構築 */
  async load() {
    try {
      const idxRes = await fetch(`data/days-index.json?t=${Date.now()}`, { cache: "no-store" });
      if (!idxRes.ok) throw new Error(`HTTP ${idxRes.status}`);
      let dates = await idxRes.json();
      if (!Array.isArray(dates) || dates.length === 0) { this.ready = true; return false; }
      dates = dates.slice(0, this.MAX_DAYS); // index は新しい順

      const days = await Promise.all(dates.map(async (d) => {
        try {
          const r = await fetch(`data/day-${d}.json?t=${Date.now()}`, { cache: "no-store" });
          return r.ok ? await r.json() : null;
        } catch { return null; }
      }));

      for (const day of days) {
        if (!day || !day.byId || !day.date) continue;
        const [y, mo, da] = day.date.split("-").map(Number);
        const date = new Date(y, mo - 1, da);
        // 過去の実天候は保存していないため、正規化は天候を除いた環境要因
        // (曜日×季節×特別日)のみで行う。computeCrowdIndex は weather 省略時に
        // 天候係数=1.0 となるのでこれが基準混雑(baseCrowd)になる。
        // 天候の影響は予測時に対象日の予報/平年から掛ける（Predictor 側）。
        const crowd = computeCrowdIndex(date) || 1;

        for (const [id, series] of Object.entries(day.byId)) {
          const hourly = this.hourly(series);
          const hrs = Object.keys(hourly);
          if (hrs.length === 0) continue;
          (this.prof[id] ||= {});
          for (const hr of hrs) {
            (this.prof[id][hr] ||= { s: 0, n: 0 });
            this.prof[id][hr].s += hourly[hr] / crowd; // 混雑で正規化
            this.prof[id][hr].n += 1;
          }
          (this.daysById[id] ||= new Set()).add(day.date);
        }
        this.daysLoaded++;
      }
      this.ready = true;
      return this.daysLoaded > 0;
    } catch (e) {
      this.ready = true;
      return false;
    }
  },

  /* そのアトラクションに実測プロファイルがあるか */
  has(att) { return !!(att && att.infoId && this.prof[att.infoId]); },

  /* 実測した日数（カバレッジ） */
  coverage(att) {
    const s = att && att.infoId ? this.daysById[att.infoId] : null;
    return s ? s.size : 0;
  },

  /* 指定時(hour)の「混雑1単位あたり」実測待ち時間。
     その時刻の実測が無ければ前後の実測時刻から線形補間/最近傍で補う。 */
  normWait(infoId, hour) {
    const p = this.prof[infoId];
    if (!p) return null;
    const val = (h) => p[h].s / p[h].n;
    if (p[hour]) return val(hour);

    const hrs = Object.keys(p).map(Number).sort((a, b) => a - b);
    if (hrs.length === 0) return null;
    let lo = null, hi = null;
    for (const h of hrs) {
      if (h <= hour) lo = h;
      if (h >= hour && hi === null) hi = h;
    }
    if (lo !== null && hi !== null && lo !== hi) {
      const t = (hour - lo) / (hi - lo);
      return val(lo) * (1 - t) + val(hi) * t;
    }
    return val(lo !== null ? lo : hi);
  },
};
