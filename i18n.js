/* =========================================================================
 * i18n.js — UI文言の多言語対応（ja / en）
 *   言語は <html lang="..."> で決定（/en/ ページは lang="en"）。
 *   data.js の直後・他のUIスクリプト(app.js/history.js)より前に読み込む。
 *
 *   - L            : 現在言語の文言・フォーマッタ集
 *   - attName(att) : アトラクション名（enは att.nameEn 優先、無ければ日本語名）
 *   - tArea/tType/tStatus : エリア/種別/運営状況の辞書訳
 *   - parkLabel(park)
 * ========================================================================= */

const LANG =
  (typeof window !== "undefined" && window.SITE_LANG) ||
  (typeof document !== "undefined" && document.documentElement && document.documentElement.lang) ||
  "ja";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_JA = ["日", "月", "火", "水", "木", "金", "土"];

/* エリア（日本語表記→英語） */
const AREA_EN = {
  "ファンタジーランド": "Fantasyland",
  "トゥモローランド": "Tomorrowland",
  "クリッターカントリー": "Critter Country",
  "ウエスタンランド": "Westernland",
  "アドベンチャーランド": "Adventureland",
  "ワールドバザール": "World Bazaar",
  "メディテレーニアンハーバー": "Mediterranean Harbor",
  "ファンタジースプリングス": "Fantasy Springs",
  "アメリカンウォーターフロント": "American Waterfront",
  "ミステリアスアイランド": "Mysterious Island",
  "ロストリバーデルタ": "Lost River Delta",
  "ポートディスカバリー": "Port Discovery",
  "アラビアンコースト": "Arabian Coast",
  "マーメイドラグーン": "Mermaid Lagoon",
};
/* 種別（日本語→英語） */
const TYPE_EN = {
  "ライド": "Ride",
  "絶叫": "Thrill",
  "シミュレーター": "Simulator",
  "シアター": "Theater",
  "アトラクション": "Attraction",
};
/* 運営状況（スクレイプ元の日本語→英語） */
const STATUS_EN = {
  "運営中": "Operating",
  "案内終了": "Closed for today",
  "休止": "Suspended",
  "中止": "Canceled",
  "運営時間外": "Outside hours",
  "点検中": "Under maintenance",
  "不明": "Unknown",
};

function tArea(a) { return LANG === "en" ? (AREA_EN[a] || a) : a; }
function tType(t) { return LANG === "en" ? (TYPE_EN[t] || t) : t; }
function tStatus(s) { return LANG === "en" ? (STATUS_EN[s] || s || "Unknown") : (s || "不明"); }
function attName(att) { return (LANG === "en" && att && att.nameEn) ? att.nameEn : (att ? att.name : ""); }

const I18N_ALL = {
  ja: {
    metaDot: "・",
    metaSep: "　|　",
    unit: "分",
    closed: "休止中",
    statusK: "状態",

    weatherEmoji: { sunny: "☀️ 晴れ", cloudy: "☁️ くもり", rain: "🌧️ 雨" },
    weather: { sunny: "晴れ", cloudy: "くもり", rain: "雨" },
    source: { forecast: "予報", climatology: "平年" },
    level: { low: "空いている", mid: "やや混雑", high: "混雑", vhigh: "大変混雑" },
    parks: { TDL: "東京ディズニーランド", TDS: "東京ディズニーシー" },

    dpa: { no: "不要", buy: "買う価値大", maybe: "検討", pricey: "割高" },
    dpaReason: {
      no: "待ちが短く、並んでも十分です",
      buy: "時間効率が高く、購入の価値が大きいです",
      maybe: "予算と相談。混雑が増すなら購入価値が上がります",
      pricey: "今は並んだ方がお得かもしれません",
    },
    dpaChip: (label) => `DPA ${label}`,
    dpaVerdictTitle: (chip) => `🎫 DPA判定: ${chip}`,
    dpaTargetTitle: "🎫 DPA対象",
    dpaDetail: (price, wait, ypm) =>
      `価格 約¥${price}　／　想定待ち ${wait}分${ypm != null ? `　／　約${ypm}円/分` : ""}`,
    dpaNoData: (price) => `待ち時間データがないため判定できません（休止中など）。価格 約¥${price}`,

    liveLoading: "実データ取得中…",
    liveAvail: "実データ利用可（ライブに切替できます）",
    liveUpdated: (hh, mm, src) => `LIVE ・ 最終更新 ${hh}:${mm} ・ 提供: ${src}`,
    liveFail: "⚠ 実データの取得に失敗しました（予測値で代替表示）",

    weatherPred: (emoji, src) => `${emoji}（${src}）`,
    crowdIndex: (v, weather, dow) => `混雑指数: <b>${v}</b>（${weather}・${dow}曜）`,
    empReflect: (n) => `実測反映: <b>${n}</b> 日分`,
    empAccum: "実測反映: <b>蓄積中</b>",

    predictTitle: (park, dateStr, hh) => `${park} ／ ${dateStr} ${hh}:00 の予測`,
    liveTitle: (park) => `${park} ／ 現在のリアルタイム待ち時間`,
    noLiveData: "実データなし",
    liveFetchFail: "実データを取得できませんでした。「予測」モードをご利用ください。",

    emptyTitle: (park, dateStr) => `${park} ／ ${dateStr} 空き始め予測`,
    emptyStart: "空き始め",
    emptyHour: (h) => `${h}時`,
    emptyPeak: (h, w) => `ピーク ${h}時 (${w}分)`,
    allDayBusy: "終日混雑",
    alwaysEmpty: "ずっと空いている",

    nowLiveWait: "現在の実待ち時間",
    nowActual: "指定時刻の実測",
    nowPredict: "指定時刻の予測",
    todayPredict: "本日の予測",
    todayPredictCal: "本日の予測（実データで補正）",
    basisActual: "実測値",
    basisEmp: (n) => `実測${n}日反映`,
    basisModel: "モデル予測",
    predictMeta: (dateStr, weather, basis) => `${dateStr}・${weather}・${basis}`,
    timeWait: (h, w) => `${h}:00 (${w}分)`,
    chartUnit: (w) => `${w}分`,

    fmtMD: (date) => `${date.getMonth() + 1}月${date.getDate()}日`,
    fmtMDShort: (date) => `${date.getMonth() + 1}/${date.getDate()}`,
    dow: (date) => DOW_JA[date.getDay()],
    fmtMDDow: (date) => `${date.getMonth() + 1}月${date.getDate()}日(${DOW_JA[date.getDay()]})`,

    // history page
    histDateLabel: (y, m, d) => `${m}月${d}日(${DOW_JA[new Date(y, m - 1, d).getDay()]})`,
    histActual: (label) => `<span><b>${label}</b> の実績</span>`,
    histWithData: (n) => `<span>データのあるアトラクション: <b>${n}</b></span>`,
    histUpdated: (hh, mm) => `<span>最終更新: <b>${hh}:${mm}</b></span>`,
    histSectionTitle: (park, label) => `${park} ／ ${label} の待ち時間（実績）`,
    histNoData: "記録なし（休止など）",
    histEmpty: "まだ収集データがありません（自動収集が貯まると表示されます）。",
    histCols: { name: "アトラクション", avg: "平均", max: "最大(ピーク)", min: "最小", n: "記録数" },
  },

  en: {
    metaDot: " · ",
    metaSep: "  |  ",
    unit: "min",
    closed: "Closed",
    statusK: "Status",

    weatherEmoji: { sunny: "☀️ Sunny", cloudy: "☁️ Cloudy", rain: "🌧️ Rain" },
    weather: { sunny: "Sunny", cloudy: "Cloudy", rain: "Rain" },
    source: { forecast: "Forecast", climatology: "Normal" },
    level: { low: "Not busy", mid: "A bit busy", high: "Busy", vhigh: "Very busy" },
    parks: { TDL: "Tokyo Disneyland", TDS: "Tokyo DisneySea" },

    dpa: { no: "Skip", buy: "Great value", maybe: "Consider", pricey: "Overpriced" },
    dpaReason: {
      no: "The wait is short—lining up is fine.",
      buy: "High time efficiency; well worth buying.",
      maybe: "Depends on your budget; better value as it gets busier.",
      pricey: "Lining up may be the better deal right now.",
    },
    dpaChip: (label) => `DPA ${label}`,
    dpaVerdictTitle: (chip) => `🎫 DPA verdict: ${chip}`,
    dpaTargetTitle: "🎫 DPA available",
    dpaDetail: (price, wait, ypm) =>
      `Price ~¥${price}  /  Est. wait ${wait} min${ypm != null ? `  /  ~¥${ypm}/min` : ""}`,
    dpaNoData: (price) => `No wait-time data, so it can't be judged (e.g., suspended). Price ~¥${price}`,

    liveLoading: "Loading live data…",
    liveAvail: "Live data available (switch to Live)",
    liveUpdated: (hh, mm, src) => `LIVE · Updated ${hh}:${mm} · Source: ${src}`,
    liveFail: "⚠ Failed to load live data (showing predictions instead)",

    weatherPred: (emoji, src) => `${emoji} (${src})`,
    crowdIndex: (v, weather, dow) => `Crowd index: <b>${v}</b> (${weather} · ${dow})`,
    empReflect: (n) => `Live data: <b>${n}</b> days`,
    empAccum: "Live data: <b>collecting</b>",

    predictTitle: (park, dateStr, hh) => `${park} / ${dateStr} ${hh}:00 forecast`,
    liveTitle: (park) => `${park} / Current real-time wait times`,
    noLiveData: "No live data",
    liveFetchFail: "Couldn't load live data. Please use Forecast mode.",

    emptyTitle: (park, dateStr) => `${park} / ${dateStr} easing-time forecast`,
    emptyStart: "Eases by",
    emptyHour: (h) => `${h}:00`,
    emptyPeak: (h, w) => `Peak ${h}:00 (${w} min)`,
    allDayBusy: "Busy all day",
    alwaysEmpty: "Always short",

    nowLiveWait: "Current actual wait",
    nowActual: "Actual at selected time",
    nowPredict: "Forecast at selected time",
    todayPredict: "Today's forecast",
    todayPredictCal: "Today's forecast (calibrated with live data)",
    basisActual: "actual",
    basisEmp: (n) => `${n} days of live data`,
    basisModel: "model forecast",
    predictMeta: (dateStr, weather, basis) => `${dateStr} · ${weather} · ${basis}`,
    timeWait: (h, w) => `${h}:00 (${w} min)`,
    chartUnit: (w) => `${w} min`,

    fmtMD: (date) => `${MONTHS_EN[date.getMonth()]} ${date.getDate()}`,
    fmtMDShort: (date) => `${MONTHS_EN[date.getMonth()]} ${date.getDate()}`,
    dow: (date) => DOW_EN[date.getDay()],
    fmtMDDow: (date) => `${DOW_EN[date.getDay()]}, ${MONTHS_EN[date.getMonth()]} ${date.getDate()}`,

    // history page
    histDateLabel: (y, m, d) => `${MONTHS_EN[m - 1]} ${d} (${DOW_EN[new Date(y, m - 1, d).getDay()]})`,
    histActual: (label) => `<span>Actuals for <b>${label}</b></span>`,
    histWithData: (n) => `<span>Attractions with data: <b>${n}</b></span>`,
    histUpdated: (hh, mm) => `<span>Updated: <b>${hh}:${mm}</b></span>`,
    histSectionTitle: (park, label) => `${park} / Wait times on ${label} (actual)`,
    histNoData: "No record (suspended, etc.)",
    histEmpty: "No collected data yet (it will appear as auto-collection accumulates).",
    histCols: { name: "Attraction", avg: "Avg", max: "Max (peak)", min: "Min", n: "Records" },
  },
};

const L = I18N_ALL[LANG] || I18N_ALL.ja;
function parkLabel(park) { return L.parks[park] || park; }
/* アトラクションの「エリア・種別」メタ表記 */
function attMeta(att) { return `${tArea(att.area)}${L.metaDot}${tType(att.type)}`; }
