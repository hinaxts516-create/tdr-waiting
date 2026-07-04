/* =========================================================================
 * scripts/local-dpa-discover.mjs  （あなたの自宅PCで1回だけ実行）
 *
 *  目的: 公式サイトの「ディズニー・プレミアアクセス(DPA)販売状況」データが
 *        どのURL/JSONで配信されているかを特定する。
 *        （公式はデータセンターIPを拒否するため、住宅IPのPCでのみ取得可能）
 *
 *  使い方:
 *    1) Node.js 18以上をインストール（https://nodejs.org/ の LTS）
 *    2) このファイルがあるフォルダで:  node scripts/local-dpa-discover.mjs
 *    3) コンソール出力を全部コピーして貼り付けてください。
 *       もし ./dpa-sample.json が作られたら、その中身も共有してください。
 *
 *  ※ 取得だけ・保存だけで、外部送信はしません。
 * ========================================================================= */
import { writeFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const KEY = ["プレミアアクセス", "プレミア", "ＤＰＡ", "DPA", "PremierAccess", "premier", "販売終了", "販売中", "発売", "完売", "有料", "standby", "operating", "dpa", "PA"];

async function get(url, headers) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.8", ...(headers || {}) } });
    const body = r.ok ? await r.text() : "";
    return { ok: r.ok, status: r.status, body, ct: r.headers.get("content-type") || "" };
  } catch (e) {
    return { ok: false, status: 0, body: "", err: e.message };
  }
}

function keyHits(s) {
  const out = [];
  for (const k of KEY) {
    const i = s.indexOf(k);
    if (i >= 0) out.push(`     [${k}] …${s.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, " ")}…`);
  }
  return out;
}

/* HTMLから .json / realtime / api を含むURL・パスを抜き出す（配信元の手がかり） */
function findDataUrls(html) {
  const urls = new Set();
  const re = /["'(]((?:https?:\/\/[^"')\s]+|\/[^"')\s]+))["')]/g;
  let m;
  while ((m = re.exec(html))) {
    const u = m[1];
    if (/\.json(\?|$)|realtime|api|standby|premier|attraction/i.test(u)) urls.add(u);
  }
  return [...urls].slice(0, 60);
}

async function main() {
  const PAGE = "https://www.tokyodisneyresort.jp/tdl/attraction.html";
  console.log("=== 1) 公式アトラクションページを取得 ===");
  const page = await get(PAGE);
  console.log(`   HTTP ${page.status}  length=${page.body.length}  type=${page.ct}${page.err ? "  err=" + page.err : ""}`);
  if (!page.ok) {
    console.log("   ⚠ ページが取得できませんでした。自宅のWi-Fi(住宅IP)で実行しているか確認してください。");
  } else {
    const urls = findDataUrls(page.body);
    console.log(`   ページ内で見つかったデータらしきURL/パス（${urls.length}件）:`);
    urls.forEach((u) => console.log("     - " + u));
  }

  // 公式realtimeの推定エンドポイント候補（DPA/スタンバイを含む可能性）
  const candidates = [
    "https://www.tokyodisneyresort.jp/_/realtime/tdl_attraction.json",
    "https://www.tokyodisneyresort.jp/_/realtime/tds_attraction.json",
    "https://www.tokyodisneyresort.jp/_/realtime/tdl_pa.json",
    "https://www.tokyodisneyresort.jp/_/realtime/tdl_standby.json",
  ];
  console.log("\n=== 2) 推定エンドポイントを試す ===");
  let saved = false;
  for (const url of candidates) {
    const r = await get(url, { "Referer": PAGE, "Accept": "application/json,*/*" });
    console.log(`\n   ${url}`);
    console.log(`     HTTP ${r.status}  length=${r.body.length}  type=${r.ct}${r.err ? "  err=" + r.err : ""}`);
    if (!r.ok) continue;
    const hits = keyHits(r.body);
    console.log(hits.length ? "     DPA関連キーワード:\n" + hits.join("\n") : "     （DPA関連キーワードなし）");
    console.log("     先頭400字: " + r.body.slice(0, 400).replace(/\s+/g, " "));
    if (!saved && /json/i.test(r.ct)) {
      await writeFile("dpa-sample.json", r.body);
      console.log("     → ./dpa-sample.json に保存しました（この中身も共有してください）");
      saved = true;
    }
  }

  console.log("\n=== 完了 ===");
  console.log("この出力を全部コピーして貼り付けてください。dpa-sample.json ができていれば、その中身も。");
  console.log("それをもとに、DPA販売状況を定期取得して記録する本スクリプトを作ります。");
}
main().catch((e) => { console.error(e); process.exit(1); });
