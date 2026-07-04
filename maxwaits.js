/* =========================================================================
 * maxwaits.js — 各アトラクションの「全期間の最大待ち時間」を読む
 *   data/max-waits.json は収集ワークフローが全 day-*.json から算出・生成する。
 *   ライブモードで「現在待ち <= 過去最大 × QUEUE_THRESHOLD」なら『並び時』と判定。
 * ========================================================================= */

const QUEUE_THRESHOLD = 0.8; // 現在 <= 過去最大 × 0.8 なら並び時

const MaxWaits = {
  byId: {},   // infoId -> 過去最大(分)
  ok: false,

  async load() {
    try {
      const r = await fetch(`/data/max-waits.json?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      this.byId = d.byId || {};
      this.ok = true;
    } catch {
      this.ok = false;
    }
    return this.ok;
  },

  /* アトラクションの過去最大(分)。無ければ null */
  get(att) {
    if (!att || !att.infoId) return null;
    const v = this.byId[att.infoId];
    return typeof v === "number" ? v : null;
  },

  /* 現在待ち current が過去最大の QUEUE_THRESHOLD 倍以下なら true（＝並び時） */
  isQueueTime(att, current) {
    const max = this.get(att);
    return typeof current === "number" && max != null && max > 0 && current <= max * QUEUE_THRESHOLD;
  },
};
