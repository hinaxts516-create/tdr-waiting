/* =========================================================================
 * data.js — アトラクションのマスターデータ（ESモジュール版）
 * ========================================================================= */

export const PARK_HOURS = { open: 9, close: 21 };

/* apiId: themeparks.wiki の entity ID。null は実データ未提供（予測のみ） */
export const ATTRACTIONS = {
  TDL: [
    { id: "tdl-beauty",   name: "美女と野獣“魔法のものがたり”", area: "ファンタジーランド", type: "ライド",       popularity: 0.98, capacity: 0.45, apiId: "e76670f0-9f5f-4918-8491-9bf51e73a596" },
    { id: "tdl-baymax",   name: "ベイマックスのハッピーライド",         area: "トゥモローランド",   type: "ライド",       popularity: 0.90, capacity: 0.55, apiId: "ca00a0e8-f069-4d0a-9d5e-10cb63010956" },
    { id: "tdl-pooh",     name: "プーさんのハニーハント",               area: "ファンタジーランド", type: "ライド",       popularity: 0.85, capacity: 0.60, apiId: "a88464b5-2cf5-4ef1-b38f-96e07b233bf2" },
    { id: "tdl-splash",   name: "スプラッシュ・マウンテン",             area: "クリッターカントリー", type: "絶叫",       popularity: 0.88, capacity: 0.70, apiId: "dfe25d8e-e234-4020-a261-30c6825d0680" },
    { id: "tdl-bigthunder", name: "ビッグサンダー・マウンテン",         area: "ウエスタンランド",   type: "絶叫",         popularity: 0.82, capacity: 0.75, apiId: "e3577b4a-f1d9-4ec5-aacf-b99977ea88c9" },
    { id: "tdl-space",    name: "スペース・マウンテン",                 area: "トゥモローランド",   type: "絶叫",         popularity: 0.80, capacity: 0.72, apiId: null },
    { id: "tdl-monsters", name: "モンスターズ・インク“ライド&ゴーシーク!”", area: "トゥモローランド", type: "ライド", popularity: 0.83, capacity: 0.58, apiId: "4ed6a812-df04-4aa8-acb9-c6b164dbb706" },
    { id: "tdl-buzz",     name: "バズ・ライトイヤーのアストロブラスター", area: "トゥモローランド", type: "ライド",       popularity: 0.70, capacity: 0.78, apiId: null },
    { id: "tdl-haunted",  name: "ホーンテッドマンション",               area: "ファンタジーランド", type: "ライド",       popularity: 0.68, capacity: 0.85, apiId: "8fce6b54-e3e4-40bb-a574-93c8327c3fab" },
    { id: "tdl-pirates",  name: "カリブの海賊",                         area: "アドベンチャーランド", type: "ライド",     popularity: 0.55, capacity: 0.92, apiId: "52eb0fc9-5853-49c8-8c72-1e5e83aae1c1" },
    { id: "tdl-jungle",   name: "ジャングルクルーズ",                   area: "アドベンチャーランド", type: "ライド",     popularity: 0.60, capacity: 0.70, apiId: "e0887415-3da2-458c-8b88-0691e6b8ab63" },
    { id: "tdl-star",     name: "スター・ツアーズ",                     area: "トゥモローランド",   type: "シミュレーター", popularity: 0.58, capacity: 0.74, apiId: "512fd34c-2f0a-4e0a-bcc1-ef4d15c5f803" },
  ],
  TDS: [
    { id: "tds-soaring",  name: "ソアリン:ファンタスティック・フライト", area: "メディテレーニアンハーバー", type: "ライド", popularity: 0.99, capacity: 0.62, apiId: "3407ebac-c575-4c31-b794-1d271014d303" },
    { id: "tds-frozen",   name: "アナとエルサのフローズンジャーニー",   area: "ファンタジースプリングス", type: "ライド", popularity: 0.99, capacity: 0.40, apiId: "9fb0c97c-ebf7-4c25-8ea7-a3f4fe2aa9ec" },
    { id: "tds-toystory", name: "トイ・ストーリー・マニア!",           area: "アメリカンウォーターフロント", type: "ライド", popularity: 0.93, capacity: 0.55, apiId: "abb5d6ec-469e-4ab0-8685-5f04e9749653" },
    { id: "tds-tot",      name: "タワー・オブ・テラー",                 area: "アメリカンウォーターフロント", type: "絶叫", popularity: 0.88, capacity: 0.70, apiId: "4ca7254c-7abc-4e52-82e0-9c562c096494" },
    { id: "tds-center",   name: "センター・オブ・ジ・アース",           area: "ミステリアスアイランド", type: "絶叫",     popularity: 0.90, capacity: 0.68, apiId: "c8526be3-e82c-4692-ae44-e8f2d1142c8a" },
    { id: "tds-indy",     name: "インディ・ジョーンズ“・アドベンチャー”", area: "ロストリバーデルタ", type: "ライド", popularity: 0.84, capacity: 0.72, apiId: "f66e072d-8bab-48e5-b8cf-6d1947bd291b" },
    { id: "tds-raging",   name: "レイジングスピリッツ",                 area: "ロストリバーデルタ", type: "絶叫",         popularity: 0.72, capacity: 0.66, apiId: "dd942cd2-b364-4262-af12-ca1a5012528b" },
    { id: "tds-peter",    name: "ピーターパンのネバーランドアドベンチャー", area: "ファンタジースプリングス", type: "ライド", popularity: 0.95, capacity: 0.50, apiId: "e8c15bc6-aaab-44ef-8285-1d92ebd2c47d" },
    { id: "tds-nimo",     name: "ニモ&フレンズ・シーライダー",         area: "ポートディスカバリー", type: "シミュレーター", popularity: 0.66, capacity: 0.80, apiId: "179e4e82-26ed-4b04-bf21-f03808b61df4" },
    { id: "tds-sindbad",  name: "シンドバッド・ストーリーブック・ヴォヤッジ", area: "アラビアンコースト", type: "ライド", popularity: 0.40, capacity: 0.95, apiId: "63ef07eb-9bfb-4782-885e-cfd08ced82f0" },
    { id: "tds-magic",    name: "マジックランプシアター",               area: "アラビアンコースト", type: "シアター",     popularity: 0.45, capacity: 0.88, apiId: "dcad67fe-76bb-4df2-bf5b-aaf70e8efc12" },
    { id: "tds-turtle",   name: "タートル・トーク",                     area: "アメリカンウォーターフロント", type: "シアター", popularity: 0.50, capacity: 0.85, apiId: "71943126-e4ac-49c5-ac61-ac1687ad33af" },
  ],
};

export const PARK_LABELS = { TDL: "東京ディズニーランド", TDS: "東京ディズニーシー" };

/* 簡易の祝日・繁忙日カレンダー（月-日 をキーに係数）。1.0 が通常、>1 が混雑要因 */
export const SPECIAL_DAYS = {
  "01-01": 1.5, "01-02": 1.4, "01-03": 1.3,
  "03-20": 1.2, "03-21": 1.25,
  "04-29": 1.3, "05-03": 1.4, "05-04": 1.4, "05-05": 1.45,
  "07-20": 1.2, "08-11": 1.3,
  "09-21": 1.2, "09-22": 1.2, "09-23": 1.2,
  "11-03": 1.25, "11-23": 1.25,
  "12-24": 1.5, "12-25": 1.5, "12-30": 1.4, "12-31": 1.45,
};

/* themeparks.wiki のパーク entity ID（ライブデータ取得用） */
export const PARK_ENTITY = {
  TDL: "3cc919f1-d16d-43e0-8c3f-1dd269bd1a42",
  TDS: "67b290d5-3478-4f23-b601-2f8fb71ba803",
};
