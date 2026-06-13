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
    { id: "tdl-haunted", name: "ホーンテッドマンション", area: "ファンタジーランド", type: "ライド", popularity: 0.68, capacity: 0.85, infoId: "120" },
    { id: "tdl-pirates", name: "カリブの海賊", area: "アドベンチャーランド", type: "ライド", popularity: 0.55, capacity: 0.92, infoId: "102" },
    { id: "tdl-jungle", name: "ジャングルクルーズ", area: "アドベンチャーランド", type: "ライド", popularity: 0.6, capacity: 0.7, infoId: "366" },
    { id: "tdl-star", name: "スター・ツアーズ", area: "トゥモローランド", type: "シミュレーター", popularity: 0.58, capacity: 0.74, infoId: "132" },
    { id: "tdl-auto-1", name: "シンデレラのフェアリーテイル･ホール", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "167" },
    { id: "tdl-auto-2", name: "ピーターパン空の旅", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "114" },
    { id: "tdl-auto-3", name: "チップとデールのツリーハウス", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "127" },
    { id: "tdl-auto-4", name: "ドナルドのボート", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "129" },
    { id: "tdl-auto-5", name: "ミニーの家", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "125" },
    { id: "tdl-auto-6", name: "ロジャーラビットのカートゥーンスピン", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "124" },
    { id: "tdl-auto-7", name: "ビーバーブラザーズのカヌー探険", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "113" },
    { id: "tdl-auto-8", name: "ウエスタンランド・シューティングギャラリー", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "107" },
    { id: "tdl-auto-9", name: "蒸気船マークトウェイン号", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "109" },
    { id: "tdl-auto-10", name: "カントリーベア・シアター", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "108" },
    { id: "tdl-auto-11", name: "トムソーヤ島いかだ", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "111" },
    { id: "tdl-auto-12", name: "ウエスタンリバー鉄道", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "104" },
    { id: "tdl-auto-13", name: "魅惑のチキルーム：スティッチ・プレゼンツ“アロハ・エ・コモ・マイ！”", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "106" },
    { id: "tdl-auto-14", name: "スイスファミリー・ツリーハウス", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "105" },
    { id: "tdl-auto-15", name: "オムニバス", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "101" },
    { id: "tdl-auto-16", name: "ペニーアーケード", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "300" },
    { id: "tdl-auto-17", name: "ミニーのスタイルスタジオ", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "409" },
    { id: "tdl-auto-18", name: "ウッドチャック・グリーティングトレイル", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "407" },
    { id: "tdl-auto-19", name: "キャッスルカルーセル", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "119" },
    { id: "tdl-auto-20", name: "ピノキオの冒険旅行", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "117" },
    { id: "tdl-auto-21", name: "ガジェットのゴーコースター", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "128" },
    { id: "tdl-auto-22", name: "ミッキーの家とミート・ミッキー", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "126" },
    { id: "tdl-auto-23", name: "白雪姫と七人のこびと", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "115" },
    { id: "tdl-auto-24", name: "空飛ぶダンボ", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "118" },
    { id: "tdl-auto-25", name: "アリスのティーパーティー", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "122" },
    { id: "tdl-auto-26", name: "ミッキーのフィルハーマジック", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "116" },
    { id: "tdl-auto-27", name: "グーフィーのペイント＆プレイハウス", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "174" },
    { id: "tdl-auto-28", name: "スティッチ・エンカウンター", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "392" },
    { id: "tdl-auto-29", name: "イッツ・ア・スモールワールド", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "121" },
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
    { id: "tds-auto-30", name: "ディズニーシー・トランジットスチーマーライン", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "151" },
    { id: "tds-auto-31", name: "ミッキー&フレンズ･グリーティングトレイル(ミニーマウス)", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "169" },
    { id: "tds-auto-32", name: "ミッキー&フレンズ･グリーティングトレイル(ミッキーマウス)", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "168" },
    { id: "tds-auto-33", name: "ヴェネツィアン・ゴンドラ", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "139" },
    { id: "tds-auto-34", name: "フォートレス・エクスプロレーション", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "140" },
    { id: "tds-auto-35", name: "アクアトピア", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "148" },
    { id: "tds-auto-37", name: "ワールプール", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "158" },
    { id: "tds-auto-38", name: "キャラバンカルーセル", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "161" },
    { id: "tds-auto-39", name: "アリエルのプレイグラウンド", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "350" },
    { id: "tds-auto-40", name: "フランダーのフライングフィッシュコースター", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "153" },
    { id: "tds-auto-41", name: "ヴィレッジ・グリーティングプレイス", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "171" },
    { id: "tds-auto-42", name: "ディズニーシー・エレクトリックレールウェイ", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "142" },
    { id: "tds-auto-43", name: "ビッグシティ・ヴィークル", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "141" },
    { id: "tds-auto-44", name: "海底2万マイル", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "146" },
    { id: "tds-auto-45", name: "スカットルのスクーター", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "154" },
    { id: "tds-auto-46", name: "フェアリー・ティンカーベルのビジーバギー", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "463" },
    { id: "tds-auto-47", name: "ジャスミンのフライングカーペット", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "172" },
    { id: "tds-auto-48", name: "ブローフィッシュ・バルーンレース", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "157" },
    { id: "tds-auto-49", name: "ジャンピン・ジェリーフィッシュ", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "156" },
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
