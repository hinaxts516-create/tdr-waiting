/* =========================================================================
 * scripts/probe-dpa.mjs  （調査用・一時）
 *   ディズニー・プレミアアクセス(DPA)の販売状況データが、非公式サイト
 *   tokyodisneyresort.info のどのページにどんな形で載っているかを調べる。
 *   ※ 公式(tokyodisneyresort.jp)はデータセンターIPを403拒否するため使えない。
 *   GitHub Actions 上で実行し、ログを見て収集方法を設計する。
 * ========================================================================= */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const KEYWORDS = ["プレミアアクセス", "プレミア", "ＤＰＡ", "DPA", "PremierAccess", "premier", "販売終了", "販売中", "発売", "完売", "売り切れ", "有料", "standby", "operating", "dpa", "fpStatus", "TicketStore"];

async function get(url, extraHeaders) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json,text/html,*/*", ...(extraHeaders || {}) } });
    const body = r.ok ? await r.text() : "";
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: "", err: e.message };
  }
}

function keywordHits(html) {
  const out = [];
  for (const k of KEYWORDS) {
    const i = html.indexOf(k);
    if (i >= 0) {
      const ctx = html.slice(Math.max(0, i - 80), i + 100).replace(/\s+/g, " ");
      out.push(`   [${k}] …${ctx}…`);
    }
  }
  return out;
}

async function main() {
  // 公式が使う realtime JSON エンドポイント候補（DPA/スタンバイパスを含む可能性）
  const officialHeaders = { "Referer": "https://www.tokyodisneyresort.jp/tdl/attraction.html", "X-Requested-With": "XMLHttpRequest" };
  const targets = [
    ["https://www.tokyodisneyresort.jp/_/realtime/tdl_attraction.json", officialHeaders],
    ["https://www.tokyodisneyresort.jp/_/realtime/tds_attraction.json", officialHeaders],
    ["https://www.tokyodisneyresort.jp/_/realtime/tdl.json", officialHeaders],
    ["https://api.tokyodisneyresort.jp/rt/tdl/attraction", officialHeaders],
    ["https://www.tokyodisneyresort.jp/tdl/attraction.html", officialHeaders],
  ];

  for (const [url, h] of targets) {
    const r = await get(url, h);
    console.log(`\n===== ${url}`);
    console.log(`   HTTP ${r.status}  length=${r.body.length}${r.err ? "  err=" + r.err : ""}`);
    if (!r.ok) continue;
    console.log("   先頭300字: " + r.body.slice(0, 300).replace(/\s+/g, " "));
    const hits = keywordHits(r.body);
    console.log(hits.length ? "   キーワード出現:\n" + hits.join("\n") : "   （DPA関連キーワードなし）");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
