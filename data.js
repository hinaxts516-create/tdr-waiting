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
    { id: "tdl-beauty", name: "美女と野獣“魔法のものがたり”", nameEn: "Enchanted Tale of Beauty and the Beast", area: "ファンタジーランド", type: "ライド", popularity: 0.98, capacity: 0.45, infoId: "100", dpa: 2500 },
    { id: "tdl-baymax", name: "ベイマックスのハッピーライド", nameEn: "The Happy Ride with Baymax", area: "トゥモローランド", type: "ライド", popularity: 0.9, capacity: 0.55, infoId: "414", dpa: 1500 },
    { id: "tdl-pooh", name: "プーさんのハニーハント", nameEn: "Pooh's Hunny Hunt", area: "ファンタジーランド", type: "ライド", popularity: 0.85, capacity: 0.6, infoId: "123" },
    { id: "tdl-splash", name: "スプラッシュ・マウンテン", nameEn: "Splash Mountain", area: "クリッターカントリー", type: "絶叫", popularity: 0.88, capacity: 0.7, infoId: "112", dpa: 2000 },
    { id: "tdl-bigthunder", name: "ビッグサンダー・マウンテン", nameEn: "Big Thunder Mountain", area: "ウエスタンランド", type: "絶叫", popularity: 0.82, capacity: 0.75, infoId: "110" },
    { id: "tdl-space", name: "スペース・マウンテン", nameEn: "Space Mountain", area: "トゥモローランド", type: "絶叫", popularity: 0.8, capacity: 0.72, infoId: "133", closed: true },
    { id: "tdl-monsters", name: "モンスターズ・インク“ライド&ゴーシーク!”", nameEn: "Monsters, Inc. Ride & Go Seek!", area: "トゥモローランド", type: "ライド", popularity: 0.83, capacity: 0.58, infoId: "163" },
    { id: "tdl-haunted", name: "ホーンテッドマンション", nameEn: "Haunted Mansion", area: "ファンタジーランド", type: "ライド", popularity: 0.68, capacity: 0.85, infoId: "120" },
    { id: "tdl-pirates", name: "カリブの海賊", nameEn: "Pirates of the Caribbean", area: "アドベンチャーランド", type: "ライド", popularity: 0.55, capacity: 0.92, infoId: "102", closed: true },
    { id: "tdl-jungle", name: "ジャングルクルーズ", nameEn: "Jungle Cruise", area: "アドベンチャーランド", type: "ライド", popularity: 0.6, capacity: 0.7, infoId: "366" },
    { id: "tdl-star", name: "スター・ツアーズ", nameEn: "Star Tours: The Adventures Continue", area: "トゥモローランド", type: "シミュレーター", popularity: 0.58, capacity: 0.74, infoId: "132" },
    { id: "tdl-auto-1", name: "シンデレラのフェアリーテイル･ホール", nameEn: "Cinderella's Fairy Tale Hall", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "167" },
    { id: "tdl-auto-2", name: "ピーターパン空の旅", nameEn: "Peter Pan's Flight", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "114" },
    { id: "tdl-auto-3", name: "チップとデールのツリーハウス", nameEn: "Chip 'n Dale's Treehouse", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "127", closed: true },
    { id: "tdl-auto-4", name: "ドナルドのボート", nameEn: "Donald's Boat", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "129", closed: true },
    { id: "tdl-auto-5", name: "ミニーの家", nameEn: "Minnie's House", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "125" },
    { id: "tdl-auto-6", name: "ロジャーラビットのカートゥーンスピン", nameEn: "Roger Rabbit's Car Toon Spin", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "124" },
    { id: "tdl-auto-7", name: "ビーバーブラザーズのカヌー探険", nameEn: "Beaver Brothers Explorer Canoes", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "113" },
    { id: "tdl-auto-8", name: "ウエスタンランド・シューティングギャラリー", nameEn: "Westernland Shootin' Gallery", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "107" },
    { id: "tdl-auto-9", name: "蒸気船マークトウェイン号", nameEn: "Mark Twain Riverboat", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "109" },
    { id: "tdl-auto-10", name: "カントリーベア・シアター", nameEn: "Country Bear Theater", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "108" },
    { id: "tdl-auto-11", name: "トムソーヤ島いかだ", nameEn: "Tom Sawyer Island Rafts", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "111" },
    { id: "tdl-auto-12", name: "ウエスタンリバー鉄道", nameEn: "Western River Railroad", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "104" },
    { id: "tdl-auto-13", name: "魅惑のチキルーム：スティッチ・プレゼンツ“アロハ・エ・コモ・マイ！”", nameEn: "The Enchanted Tiki Room: Stitch Presents \"Aloha E Komo Mai!\"", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "106" },
    { id: "tdl-auto-14", name: "スイスファミリー・ツリーハウス", nameEn: "Swiss Faamily Treehouse", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "105", closed: true },
    { id: "tdl-auto-15", name: "オムニバス", nameEn: "Omnibus", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "101" },
    { id: "tdl-auto-16", name: "ペニーアーケード", nameEn: "Penny Arcade", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "300" },
    { id: "tdl-auto-17", name: "ミニーのスタイルスタジオ", nameEn: "Minnie's Style Studio", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "409" },
    { id: "tdl-auto-18", name: "ウッドチャック・グリーティングトレイル", nameEn: "\"Woodchuck Greeting Trail", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "407" },
    { id: "tdl-auto-19", name: "キャッスルカルーセル", nameEn: "Castle Carrousel", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "119" },
    { id: "tdl-auto-20", name: "ピノキオの冒険旅行", nameEn: "Pinocchio's Daring Journey", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "117", closed: true },
    { id: "tdl-auto-21", name: "ガジェットのゴーコースター", nameEn: "Gadget's Go Coaster", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "128", closed: true },
    { id: "tdl-auto-22", name: "ミッキーの家とミート・ミッキー", nameEn: "Mickey's House and Meet Mickey", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "126" },
    { id: "tdl-auto-23", name: "白雪姫と七人のこびと", nameEn: "Snow White's Adventures", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "115" },
    { id: "tdl-auto-24", name: "空飛ぶダンボ", nameEn: "Dumbo The Flying Elephant", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "118", closed: true },
    { id: "tdl-auto-25", name: "アリスのティーパーティー", nameEn: "Alice's Tea Party", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "122" },
    { id: "tdl-auto-26", name: "ミッキーのフィルハーマジック", nameEn: "Mickey's PhilharMagic", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "116" },
    { id: "tdl-auto-27", name: "グーフィーのペイント＆プレイハウス", nameEn: "Goofy's Paint 'n' Play House", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "174" },
    { id: "tdl-auto-28", name: "スティッチ・エンカウンター", nameEn: "Stitch Encounter", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "392" },
    { id: "tdl-auto-29", name: "イッツ・ア・スモールワールド", nameEn: "\"it's a small world\"", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "121" },
  ],
  TDS: [
    { id: "tds-soaring", name: "ソアリン:ファンタスティック・フライト", nameEn: "Soaring: Fantastic Flight", area: "メディテレーニアンハーバー", type: "ライド", popularity: 0.99, capacity: 0.62, infoId: "405", dpa: 2500 },
    { id: "tds-frozen", name: "アナとエルサのフローズンジャーニー", nameEn: "Anna and Elsa's Frozen Journey", area: "ファンタジースプリングス", type: "ライド", popularity: 0.99, capacity: 0.4, infoId: "465", dpa: 2500 },
    { id: "tds-rapunzel", name: "ラプンツェルのランタンフェスティバル", nameEn: "Rapunzel's Lantern Festival", area: "ファンタジースプリングス", type: "ライド", popularity: 0.96, capacity: 0.52, infoId: "464", dpa: 2000 },
    { id: "tds-toystory", name: "トイ・ストーリー・マニア!", nameEn: "Toy Story Mania!", area: "アメリカンウォーターフロント", type: "ライド", popularity: 0.93, capacity: 0.55, infoId: "173", dpa: 2000 },
    { id: "tds-tot", name: "タワー・オブ・テラー", nameEn: "Tower of Terror", area: "アメリカンウォーターフロント", type: "絶叫", popularity: 0.88, capacity: 0.7, infoId: "144", dpa: 2000 },
    { id: "tds-center", name: "センター・オブ・ジ・アース", nameEn: "Journey to the Center of the Earth", area: "ミステリアスアイランド", type: "絶叫", popularity: 0.9, capacity: 0.68, infoId: "145", dpa: 2000 },
    { id: "tds-indy", name: "インディ・ジョーンズ“・アドベンチャー”", nameEn: "Indiana Jones Adventure®: Temple of the Crystal Skull", area: "ロストリバーデルタ", type: "ライド", popularity: 0.84, capacity: 0.72, infoId: "150", closed: true },
    { id: "tds-raging", name: "レイジングスピリッツ", nameEn: "Raging Spirits", area: "ロストリバーデルタ", type: "絶叫", popularity: 0.72, capacity: 0.66, infoId: "152" },
    { id: "tds-peter", name: "ピーターパンのネバーランドアドベンチャー", nameEn: "Peter Pan's Never Land Adventure", area: "ファンタジースプリングス", type: "ライド", popularity: 0.95, capacity: 0.5, infoId: "466", dpa: 2000 },
    { id: "tds-nimo", name: "ニモ&フレンズ・シーライダー", nameEn: "Nemo & Friends SeaRider", area: "ポートディスカバリー", type: "シミュレーター", popularity: 0.66, capacity: 0.8, infoId: "398" },
    { id: "tds-sindbad", name: "シンドバッド・ストーリーブック・ヴォヤッジ", nameEn: "Sindbad's Storybook Voyage", area: "アラビアンコースト", type: "ライド", popularity: 0.4, capacity: 0.95, infoId: "159" },
    { id: "tds-magic", name: "マジックランプシアター", nameEn: "The Magic Lamp Theater", area: "アラビアンコースト", type: "シアター", popularity: 0.45, capacity: 0.88, infoId: "160" },
    { id: "tds-turtle", name: "タートル・トーク", nameEn: "Turtle Talk", area: "アメリカンウォーターフロント", type: "シアター", popularity: 0.5, capacity: 0.85, infoId: "164" },
    { id: "tds-auto-30", name: "ディズニーシー・トランジットスチーマーライン", nameEn: "DisneySea Transit Steamer Line", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "151" },
    { id: "tds-auto-31", name: "ミッキー&フレンズ･グリーティングトレイル(ミニーマウス)", nameEn: "Mickey & Friends' Greeting Trails (Minnie Mouse)", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "169" },
    { id: "tds-auto-32", name: "ミッキー&フレンズ･グリーティングトレイル(ミッキーマウス)", nameEn: "Mickey & Friends' Greeting Trails (Mickey Mouse)", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "168" },
    { id: "tds-auto-33", name: "ヴェネツィアン・ゴンドラ", nameEn: "Venetian Gondolas", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "139" },
    { id: "tds-auto-34", name: "フォートレス・エクスプロレーション", nameEn: "Fortress Explorations", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "140" },
    { id: "tds-auto-35", name: "アクアトピア", nameEn: "Aquatopia", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "148" },
    { id: "tds-auto-36", name: "ワールプール", nameEn: "The Whirlpool", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "158" },
    { id: "tds-auto-37", name: "キャラバンカルーセル", nameEn: "Caravan Carousel", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "161" },
    { id: "tds-auto-38", name: "アリエルのプレイグラウンド", nameEn: "Ariel's Playground", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "350" },
    { id: "tds-auto-39", name: "フランダーのフライングフィッシュコースター", nameEn: "Flounder's Flying Fish Coaster", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "153" },
    { id: "tds-auto-40", name: "ヴィレッジ・グリーティングプレイス", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "171" },
    { id: "tds-auto-41", name: "ディズニーシー・エレクトリックレールウェイ", nameEn: "DisneySea Electric Railway", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "142" },
    { id: "tds-auto-42", name: "ビッグシティ・ヴィークル", nameEn: "Big City Vehicles", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "141" },
    { id: "tds-auto-43", name: "海底2万マイル", nameEn: "20,000 Leagues Under the Sea", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "146" },
    { id: "tds-auto-44", name: "スカットルのスクーター", nameEn: "Scuttle's Scooters", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "154" },
    { id: "tds-auto-45", name: "フェアリー・ティンカーベルのビジーバギー", nameEn: "Fairy Tinker Bell's Busy Buggies", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "463" },
    { id: "tds-auto-46", name: "ジャスミンのフライングカーペット", nameEn: "Jasmine's Flying Carpets", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "172" },
    { id: "tds-auto-47", name: "ブローフィッシュ・バルーンレース", nameEn: "Blowfish Balloon Race", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "157" },
    { id: "tds-auto-48", name: "ジャンピン・ジェリーフィッシュ", nameEn: "Jumpin' Jellyfish", area: "—", type: "アトラクション", popularity: 0.6, capacity: 0.7, infoId: "156" },
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
