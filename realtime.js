/* =========================================================================
 * realtime.js — 最新の待ち時間スナップショット(data/live-latest.json)を読む
 *   このJSONは GitHub Actions が tokyodisneyresort.info から取得・生成する。
 *   （公式は公開APIが無く直接取得不可のため、サーバー側で収集して静的配信）
 *   アトラクションは infoId で対応付ける。
 * ========================================================================= */

const RealTime = {
  byId: {},          // infoId -> { wait, status, name, park }
  updatedAt: null,   // スナップショットの生成時刻(Date)
  ok: false,
  error: null,
  source: "tokyodisneyresort.info",

  async fetchAll() {
    this.byId = {};
    this.ok = false;
    this.error = null;
    try {
      const res = await fetch(`data/live-latest.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.byId = data.byId || {};
      this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
      this.source = data.source || this.source;
      this.ok = true;
    } catch (err) {
      this.error = err.message || String(err);
      this.ok = false;
    }
    return this.ok;
  },

  /* アトラクションに対応する実データ。{wait, status} または null */
  get(att) {
    if (!att || !att.infoId) return null;
    return this.byId[att.infoId] || null;
  },

  /* status は既に日本語（運営中/案内終了/休止 など）なのでそのまま返す */
  statusLabel(status) {
    return status || "不明";
  },
};
