/* =========================================================================
 * realtime.js — themeparks.wiki API から実待ち時間を取得（非公式API）
 *
 *  エンドポイント:
 *    https://api.themeparks.wiki/v1/entity/{parkId}/live
 *  ※ CORS は "*" 許可済み。サーバー不要でブラウザから直接取得できる。
 *  ※ 非公式APIのため将来仕様変更の可能性あり。取得失敗時は予測へフォールバック。
 * ========================================================================= */

const RealTime = {
  byApiId: {},      // apiId -> { wait:Number|null, status:String, lastUpdated:String }
  updatedAt: null,  // 取得時刻(Date)
  ok: false,
  error: null,

  STATUS_LABEL: {
    OPERATING: "運営中",
    CLOSED: "休止中",
    DOWN: "一時中断",
    REFURBISHMENT: "リハブ中",
  },

  /* 両パークのライブデータを取得してマップ化 */
  async fetchAll() {
    this.byApiId = {};
    this.ok = false;
    this.error = null;
    try {
      const parks = Object.values(PARK_ENTITY);
      const results = await Promise.all(
        parks.map((pid) =>
          fetch(`https://api.themeparks.wiki/v1/entity/${pid}/live`).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
        )
      );
      for (const data of results) {
        for (const e of data.liveData || []) {
          if (e.entityType !== "ATTRACTION") continue;
          const wait = e.queue && e.queue.STANDBY ? (e.queue.STANDBY.waitTime ?? null) : null;
          this.byApiId[e.id] = {
            wait,
            status: e.status || "CLOSED",
            lastUpdated: e.lastUpdated || null,
          };
        }
      }
      this.updatedAt = new Date();
      this.ok = true;
    } catch (err) {
      this.error = err.message || String(err);
      this.ok = false;
    }
    return this.ok;
  },

  /* アトラクション(マスター)に対応する実データを返す。無ければ null */
  get(att) {
    if (!att || !att.apiId) return null;
    return this.byApiId[att.apiId] || null;
  },

  statusLabel(status) {
    return this.STATUS_LABEL[status] || status || "不明";
  },
};
