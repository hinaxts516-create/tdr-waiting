/* =========================================================================
 * firebase.js — Firebase / Firestore 連携
 *   各アトラクションの「過去最大待ち時間」を Firestore に蓄積し、
 *   現在待ち時間が過去最大の QUEUE_THRESHOLD 倍以下になったら「並び時」と判定する。
 *
 *   データモデル: コレクション "stats" / ドキュメント "maxWaits"
 *     { "<att.id>": <過去最大の待ち分>, ... }
 *
 *   ■ セットアップ（利用者側で1回だけ）
 *     1. https://console.firebase.google.com/ でプロジェクト作成
 *     2. 「Firestore Database」を作成（本番/テストどちらでも可）
 *     3. プロジェクト設定 → マイアプリ →「ウェブアプリ」を追加し、表示される
 *        firebaseConfig の値を下の FIREBASE_CONFIG に貼り付け（この値は公開情報で秘匿不要）
 *        ※ もしくは react-app/.env に VITE_FIREBASE_* を設定してもよい（そちらが優先）
 *     4. Firestore のセキュリティルール（この1ドキュメントだけ読み書き許可する例）:
 *        rules_version = '2';
 *        service cloud.firestore {
 *          match /databases/{db}/documents {
 *            match /stats/maxWaits {
 *              allow read: if true;
 *              allow write: if true;   // ← 公開書き込み。厳しくするなら App Check 等を検討
 *            }
 *          }
 *        }
 * ========================================================================= */
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, runTransaction } from "firebase/firestore";

/* 「並び時」判定のしきい値: 現在 <= 過去最大 × この値 なら並び時 */
export const QUEUE_THRESHOLD = 0.8;

/* ここを Firebase コンソールの値に置き換えてください（.env の VITE_FIREBASE_* があればそちら優先） */
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const env = import.meta.env || {};
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || FIREBASE_CONFIG.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || FIREBASE_CONFIG.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || FIREBASE_CONFIG.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || FIREBASE_CONFIG.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || FIREBASE_CONFIG.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || FIREBASE_CONFIG.appId,
};

/* 未設定（プレースホルダのまま）なら Firestore を初期化せず no-op で動く */
export const isFirebaseConfigured =
  !!config.projectId && config.projectId !== "YOUR_PROJECT_ID";

let db = null;
if (isFirebaseConfigured) {
  try {
    db = getFirestore(initializeApp(config));
  } catch (e) {
    console.warn("[firebase] 初期化に失敗:", e?.message || e);
    db = null;
  }
}

const MAX_DOC = () => doc(db, "stats", "maxWaits");

/* 過去最大待ち時間マップ { id: max } を取得（未設定時は {}） */
export async function fetchMaxWaits() {
  if (!db) return {};
  try {
    const snap = await getDoc(MAX_DOC());
    return snap.exists() ? snap.data() : {};
  } catch (e) {
    console.warn("[firebase] fetchMaxWaits 失敗:", e?.message || e);
    return {};
  }
}

/* 現在の待ち時間 { id: wait } を受け取り、過去最大を超えた分だけ Firestore を更新。
 * 更新後（＝既存とマージ済み）の最大マップを返す。未設定時は {} を返す。 */
export async function reportMaxWaits(currentById) {
  if (!db) return {};
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(MAX_DOC());
      const cur = snap.exists() ? snap.data() : {};
      const next = { ...cur };
      let changed = false;
      for (const [id, w] of Object.entries(currentById || {})) {
        if (typeof w === "number" && isFinite(w) && (!(id in cur) || w > cur[id])) {
          next[id] = w;
          changed = true;
        }
      }
      if (changed) tx.set(MAX_DOC(), next, { merge: true });
      return next;
    });
  } catch (e) {
    console.warn("[firebase] reportMaxWaits 失敗:", e?.message || e);
    return fetchMaxWaits();
  }
}

/* 現在待ち time が過去最大 max の QUEUE_THRESHOLD 倍以下なら true（＝並び時） */
export function isQueueTime(current, max) {
  return (
    typeof current === "number" && typeof max === "number" && max > 0 &&
    current <= max * QUEUE_THRESHOLD
  );
}
