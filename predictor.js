/* =========================================================================
 * predictor.js — 予測の統合レイヤ
 *   実測プロファイル(Empirical)を最優先し、実測がまだ無いアトラクション/
 *   時間帯だけ合成モデル(WaitModel)で補完する。
 *   app.js は予測モードでこの Predictor を呼ぶ（WaitModel は内部フォールバック）。
 * ========================================================================= */

const Predictor = {
  /* 単一条件の待ち時間（分, 5分刻み） */
  predict(att, date, hour, weather) {
    if (Empirical.has(att)) {
      const h = Math.max(PARK_HOURS.open, Math.min(PARK_HOURS.close, Math.round(hour)));
      const norm = Empirical.normWait(att.infoId, h);
      if (norm != null && isFinite(norm)) {
        const crowd = computeCrowdIndex(date, weather); // 対象日の混雑に合わせて戻す
        return Math.max(0, Math.round((norm * crowd) / 5) * 5);
      }
    }
    return WaitModel.predict(att, date, hour, weather); // 実測が無ければ合成モデル
  },

  /* 1日分(開園〜閉園)の予測カーブ: [{hour, wait}] */
  dayCurve(att, date, weather) {
    const out = [];
    for (let h = PARK_HOURS.open; h <= PARK_HOURS.close; h++) {
      out.push({ hour: h, wait: this.predict(att, date, h, weather) });
    }
    return out;
  },

  /* この予測の出どころ: "empirical"（実測ベース）/ "model"（合成モデル） */
  source(att) { return Empirical.has(att) ? "empirical" : "model"; },
};
