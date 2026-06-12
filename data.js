/* =========================================================================
 * data.js — アトラクションのマスターデータ
 *  - 各アトラクションは「予測モデルの特徴量」として使う属性を持つ
 *    popularity : 0.0〜1.0  人気度（高いほど混む）
 *    capacity   : 0.3〜1.0  さばける量（高いほど待ちが減る）
 *    type       : 表示用カテゴリ
 *    openTime/closeTime : そのアトラクションの運営時間（24h）
 *  ※ 待ち時間そのものは持たず、model.js が属性＋条件から生成・予測する
 * ========================================================================= */

const PARK_HOURS = { open: 9, close: 21 }; // パーク全体の運営時間（簡略化）

/* infoId: tokyodisneyresort.info の attr_id（実データ取得・履歴のキー）
 * dpa   : ディズニー・プレミアアクセスの目安価格(円)。設定があるアトラクションが対象。
 *         価格は変動するため概算（DPA判定の主要因は待ち時間）。 */
/* >>> ATTRACTIONS:GENERATED — scripts/sync-attractions.mjs がスプレッドシートから生成。手動編集しないでください >>> */
const ATTRACTIONS = {
  TDL: [
    { id: "tdl-beauty", name: "美女と野獣“魔法のものがたり”", area: "ファンタジーランド", type: "ライド", popularity: 0.98, capacity: 0.45, infoId: "100", dpa: 2500 },
    { id: "tdl-baymax", name: "ベイマックスのハッピーライド", area: "トゥモローランド", type: "ライド", popularity: 0.9, capacity: 0.55, infoId: "414", dpa: 1500 },
    { id: "tdl-pooh", name: "プーさんのハニーハント", area: "ファンタジーランド", type: "ライド", popularity: 0.85, capacity: 0.6, infoId: "123" },
    { id: "tdl-splash", name: "スプラッシュ・マウンテン", area: "クリッターカントリー", type: "絶叫", popularity: 0.88, capacity: 0.7, infoId: "112", dpa: 2000 },
    { id: "tdl-bigthunder", name: "ビッグサンダー・マウンテン", area: "ウエスタンランド", type: "絶叫", popularity: 0.82, capacity: 0.75, infoId: "110" },
    { id: "tdl-space", name: "スペース・マウンテン", area: "トゥモローランド", type: "絶叫", popularity: 0.8, capacity: 0.72, infoId: "133" },
    { id: "tdl-monsters", name: "モンスターズ・インク“ライド&ゴーシーク!”", area: "トゥモローランド", type: "ライド", popularity: 0.83, capacity: 0.58, infoId: "163" },
    { id: "tdl-buzz", name: "バズ・ライトイヤーのアストロブラスター", area: "トゥモローランド", type: "ライド", popularity: 0.7, capacity: 0.78, infoId: "134" },
    { id: "tdl-haunted", name: "ホーンテッドマンション", area: "ファンタジーランド", type: "ライド", popularity: 0.68, capacity: 0.85, infoId: "120" },
    { id: "tdl-pirates", name: "カリブの海賊", area: "アドベンチャーランド", type: "ライド", popularity: 0.55, capacity: 0.92, infoId: "102" },
    { id: "tdl-jungle", name: "ジャングルクルーズ", area: "アドベンチャーランド", type: "ライド", popularity: 0.6, capacity: 0.7, infoId: "366" },
    { id: "tdl-star", name: "スター・ツアーズ", area: "トゥモローランド", type: "シミュレーター", popularity: 0.58, capacity: 0.74, infoId: "132" },
  ],
  TDS: [
    { id: "tds-soaring", name: "ソアリン:ファンタスティック・フライト", area: "メディテレーニアンハーバー", type: "ライド", popularity: 0.99, capacity: 0.62, infoId: "405", dpa: 2500 },
    { id: "tds-frozen", name: "アナとエルサのフローズンジャーニー", area: "ファンタジースプリングス", type: "ライド", popularity: 0.99, capacity: 0.4, infoId: "465", dpa: 2500 },
    { id: "tds-rapunzel", name: "ラプンツェルのランタンフェスティバル", area: "ファンタジースプリングス", type: "ライド", popularity: 0.96, capacity: 0.52, infoId: "464", dpa: 2000 },
    { id: "tds-toystory", name: "トイ・ストーリー・マニア!", area: "アメリカンウォーターフロント", type: "ライド", popularity: 0.93, capacity: 0.55, infoId: "173", dpa: 2000 },
    { id: "tds-tot", name: "タワー・オブ・テラー", area: "アメリカンウォーターフロント", type: "絶叫", popularity: 0.88, capacity: 0.7, infoId: "144", dpa: 2000 },
    { id: "tds-center", name: "センター・オブ・ジ・アース", area: "ミステリアスアイランド", type: "絶叫", popularity: 0.9, capacity: 0.68, infoId: "145", dpa: 2000 },
    { id: "tds-indy", name: "インディ・ジョーンズ“・アドベンチャー”", area: "ロストリバーデルタ", type: "ライド", popularity: 0.84, capacity: 0.72, infoId: "150" },
    { id: "tds-raging", name: "レイジングスピリッツ", area: "ロストリバーデルタ", type: "絶叫", popularity: 0.72, capacity: 0.66, infoId: "152" },
    { id: "tds-peter", name: "ピーターパンのネバーランドアドベンチャー", area: "ファンタジースプリングス", type: "ライド", popularity: 0.95, capacity: 0.5, infoId: "466", dpa: 2000 },
    { id: "tds-nimo", name: "ニモ&フレンズ・シーライダー", area: "ポートディスカバリー", type: "シミュレーター", popularity: 0.66, capacity: 0.8, infoId: "398" },
    { id: "tds-sindbad", name: "シンドバッド・ストーリーブック・ヴォヤッジ", area: "アラビアンコースト", type: "ライド", popularity: 0.4, capacity: 0.95, infoId: "159" },
    { id: "tds-magic", name: "マジックランプシアター", area: "アラビアンコースト", type: "シアター", popularity: 0.45, capacity: 0.88, infoId: "160" },
    { id: "tds-turtle", name: "タートル・トーク", area: "アメリカンウォーターフロント", type: "シアター", popularity: 0.5, capacity: 0.85, infoId: "164" },
  ],
};
/* <<< ATTRACTIONS:GENERATED end <<< */

const PARK_LABELS = { TDL: "東京ディズニーランド", TDS: "東京ディズニーシー" };

/* 簡易の祝日・繁忙日カレンダー（月-日 をキーに係数）。1.0 が通常、>1 が混雑要因 */
const SPECIAL_DAYS = {
  "01-01": 1.5, "01-02": 1.4, "01-03": 1.3,
  "03-20": 1.2, "03-21": 1.25,
  "04-29": 1.3, "05-03": 1.4, "05-04": 1.4, "05-05": 1.45,
  "07-20": 1.2, "08-11": 1.3,
  "09-21": 1.2, "09-22": 1.2, "09-23": 1.2,
  "11-03": 1.25, "11-23": 1.25,
  "12-24": 1.5, "12-25": 1.5, "12-30": 1.4, "12-31": 1.45,
};
