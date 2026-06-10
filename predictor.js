/* =========================================================================
 * predictor.js — 予測の統合レイヤ
 *   優先順位:
 *     1) その日付の実測がある → 実測そのもの（予測=実績で乖離ゼロ）
 *     2) 実測プロファイルがある → 正規化値 × 対象日の混雑×天候
 *     3) いずれも無い → 合成モデル(WaitModel)で補完
 * ========================================================================= */

const Predictor = {
  /* 単一条件の待ち時間（分, 5分刻み） */
  predict(att, date, hour, weather) {
    const h = Math.max(PARK_HOURS.open, Math.min(PARK_HOURS.close, Math.round(hour)));
    if (att && att.infoId && Empirical.has(att)) {
      // 1) 収集済みの当該日 → 実測値そのまま
      const ex = Empirical.exact(att.infoId, Empirical.dateKey(date), h);
      if (ex != null && isFinite(ex)) return Math.max(0, Math.round(ex / 5) * 5);
      // 2) 正規化プロファイル → 対象日の混雑×天候で水準を戻す
      const norm = Empirical.normWait(att.infoId, h);
      if (norm != null && isFinite(norm)) {
        const crowd = computeCrowdIndex(date, weather);
        return Math.max(0, Math.round((norm * crowd) / 5) * 5);
      }
    }
    // 3) 合成モデル
    return WaitModel.predict(att, date, hour, weather);
  },

  /* 1日分(開園〜閉園)の予測カーブ: [{hour, wait}] */
  dayCurve(att, date, weather) {
    const out = [];
    for (let h = PARK_HOURS.open; h <= PARK_HOURS.close; h++) {
      out.push({ hour: h, wait: this.predict(att, date, h, weather) });
    }
    return out;
  },

  /* 予測の出どころ: "actual"（その日の実測）/ "empirical"（実測平均）/ "model" */
  source(att, date) {
    if (!att || !att.infoId || !Empirical.has(att)) return "model";
    if (date && Empirical.byDate[Empirical.dateKey(date)]?.[att.infoId]) return "actual";
    return "empirical";
  },
};
