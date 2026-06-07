/* =========================================================================
 * forecast.js — 直近数日の実天気予報を取得（Open-Meteo・無料/キー不要/CORS可）
 *   舞浜（東京ディズニーリゾート周辺）の日別予報を取得し、
 *   WMO天気コードを sunny/cloudy/rain に変換して日付ごとに保持する。
 *   ※ forecast_days=4 → 本日＋3日分（直近3日を実予報でカバー）
 * ========================================================================= */

const Forecast = {
  byDate: {},        // 'YYYY-MM-DD' -> 'sunny' | 'cloudy' | 'rain'
  ok: false,
  error: null,
  updatedAt: null,
  LAT: 35.6329,      // 舞浜付近
  LON: 139.8804,

  /* WMO weather code → 天候ラベル */
  codeToWeather(code) {
    if (code <= 1) return "sunny";                                  // 0:快晴 1:晴れ
    if (code === 2 || code === 3 || code === 45 || code === 48) return "cloudy"; // 雲・霧
    return "rain";                                                  // 51以上: 霧雨/雨/雪/雷雨
  },

  dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },

  async fetchAll() {
    this.ok = false;
    this.error = null;
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${this.LAT}&longitude=${this.LON}` +
        `&daily=weather_code&timezone=Asia%2FTokyo&forecast_days=4`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const times = d.daily?.time || [];
      const codes = d.daily?.weather_code || [];
      const map = {};
      for (let i = 0; i < times.length; i++) map[times[i]] = this.codeToWeather(codes[i]);
      this.byDate = map;
      this.updatedAt = new Date();
      this.ok = true;
    } catch (e) {
      this.error = e.message || String(e);
      this.ok = false;
    }
    return this.ok;
  },

  /* 指定日に実予報があれば返す。無ければ null（→ 平年気候で代替） */
  get(date) {
    return this.byDate[this.dateKey(date)] || null;
  },
};
