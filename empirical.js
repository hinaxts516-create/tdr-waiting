/* =========================================================================
 * empirical.js — 蓄積した実測履歴(data/day-*.json)から予測の土台を作る。
 *
 *  2段構えで「乖離」を無くす:
 *   (A) 日付別の実測 byDate … 収集済みの“その日”を選んだら実測そのものを返す
 *       （予測モードと実績が完全一致＝乖離ゼロ）
 *   (B) 正規化プロファイル prof … 未収集の日付向け。各日を混雑指数
 *       (曜日×季節×特別日×実天候)で正規化して平均した“混雑1単位あたりの
 *       待ち時間”。予測時に対象日の混雑×天候を掛けて水準を戻す。
 *
 *  各 day-*.json はその日の実天候(weather)を保存している（collect-history.mjs）。
 *  天候未保存の旧データは天候係数1.0(中立)として正規化する。
 * ========================================================================= */

const Empirical = {
  ready: false,
  daysLoaded: 0,          // 読み込めた日数
  prof: {},               // infoId -> { hour -> {s, n} }（正規化待ちの和/件数）
  profMean: {},           // infoId -> { hour -> 正規化待ち平均 }（プロファイル）
  byDate: {},             // 'YYYY-MM-DD' -> { infoId -> { hour -> 実測待ち } }
  daysById: {},           // infoId -> Set(日付)  … カバレッジ表示用
  MAX_DAYS: 60,

  dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },

  /* 30分刻み series {"9:15":160,...} を 時(hour) 平均 {9:160,...} に集約 */
  hourly(series) {
    const acc = {};
    for (const [t, w] of Object.entries(series || {})) {
      const hr = Number(String(t).split(":")[0]);
      const v = Number(w);
      if (isNaN(hr) || isNaN(v)) continue;
      if (hr < PARK_HOURS.open || hr > PARK_HOURS.close) continue;
      (acc[hr] ||= { s: 0, n: 0 });
      acc[hr].s += v;
      acc[hr].n += 1;
    }
    const out = {};
    for (const [hr, a] of Object.entries(acc)) out[hr] = a.s / a.n;
    return out;
  },

  /* {hour->値} のテーブルから指定時(hour)を線形補間/最近傍で取り出す */
  _interp(table, hour) {
    if (!table) return null;
    if (table[hour] != null) return table[hour];
    const hrs = Object.keys(table).map(Number).sort((a, b) => a - b);
    if (hrs.length === 0) return null;
    let lo = null, hi = null;
    for (const h of hrs) {
      if (h <= hour) lo = h;
      if (h >= hour && hi === null) hi = h;
    }
    if (lo !== null && hi !== null && lo !== hi) {
      const t = (hour - lo) / (hi - lo);
      return table[lo] * (1 - t) + table[hi] * t;
    }
    return table[lo !== null ? lo : hi];
  },

  async load() {
    try {
      const idxRes = await fetch(`data/days-index.json?t=${Date.now()}`, { cache: "no-store" });
      if (!idxRes.ok) throw new Error(`HTTP ${idxRes.status}`);
      let dates = await idxRes.json();
      if (!Array.isArray(dates) || dates.length === 0) { this.ready = true; return false; }
      dates = dates.slice(0, this.MAX_DAYS); // 新しい順

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
        // その日の実天候(day.weather)を含めた混雑指数で正規化する。
        // 予測時も computeCrowdIndex(対象日, 予報/平年) で戻すので体系が一致する。
        // 天候未保存の旧データは weather=undefined → 天候係数1.0(中立)で正規化。
        const crowd = computeCrowdIndex(date, day.weather) || 1;
        const dayTable = (this.byDate[day.date] ||= {});

        for (const [id, series] of Object.entries(day.byId)) {
          const hourly = this.hourly(series);
          if (Object.keys(hourly).length === 0) continue;
          dayTable[id] = hourly;                 // (A) 日付別の実測
          (this.prof[id] ||= {});
          for (const [hr, w] of Object.entries(hourly)) {  // (B) 正規化プロファイル
            (this.prof[id][hr] ||= { s: 0, n: 0 });
            this.prof[id][hr].s += w / crowd;
            this.prof[id][hr].n += 1;
          }
          (this.daysById[id] ||= new Set()).add(day.date);
        }
        this.daysLoaded++;
      }

      // プロファイル平均を確定
      for (const [id, byHr] of Object.entries(this.prof)) {
        const m = {};
        for (const [hr, a] of Object.entries(byHr)) m[hr] = a.s / a.n;
        this.profMean[id] = m;
      }

      this.ready = true;
      return this.daysLoaded > 0;
    } catch (e) {
      this.ready = true;
      return false;
    }
  },

  has(att) { return !!(att && att.infoId && this.prof[att.infoId]); },

  coverage(att) {
    const s = att && att.infoId ? this.daysById[att.infoId] : null;
    return s ? s.size : 0;
  },

  /* (A) 収集済みの“その日”の実測待ち時間（分）。無ければ null */
  exact(infoId, dateKey, hour) {
    const day = this.byDate[dateKey];
    if (!day || !day[infoId]) return null;
    return this._interp(day[infoId], hour);
  },

  /* (B) 指定時の「混雑1単位あたり」実測待ち時間（正規化プロファイル） */
  normWait(infoId, hour) {
    return this._interp(this.profMean[infoId], hour);
  },
};
