/* =========================================================================
 * scripts/probe-dpa.mjs  （調査用・一時）
 *   ディズニー・プレミアアクセス(DPA)の販売状況データが、非公式サイト
 *   tokyodisneyresort.info のどのページにどんな形で載っているかを調べる。
 *   ※ 公式(tokyodisneyresort.jp)はデータセンターIPを403拒否するため使えない。
 *   GitHub Actions 上で実行し、ログを見て収集方法を設計する。
 * ========================================================================= */
const UA = "Mozilla/5.0 (compatible; tdr-wait-time/1.0; +https://tdr-wait-time.com)";
const KEYWORDS = ["プレミアアクセス", "プレミア", "ＤＰＡ", "DPA", "販売終了", "販売中", "発売", "完売", "売り切れ", "有料", "Premier", "アクセス", "円", "¥", "対象"];

async function get(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
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
  const targets = [
    "https://tokyodisneyresort.info/realtime.php?park=land&order=name",
    "https://tokyodisneyresort.info/realtime.php?park=sea&order=name",
    "https://tokyodisneyresort.info/",
    "https://tokyodisneyresort.info/premieraccess.php",
    "https://tokyodisneyresort.info/dpa.php",
    "https://tokyodisneyresort.info/pa.php",
  ];

  for (const url of targets) {
    const r = await get(url);
    console.log(`\n===== ${url}`);
    console.log(`   HTTP ${r.status}  length=${r.body.length}${r.err ? "  err=" + r.err : ""}`);
    if (!r.ok) continue;
    const hits = keywordHits(r.body);
    console.log(hits.length ? "   キーワード出現:\n" + hits.join("\n") : "   （DPA関連キーワードなし）");
  }

  // realtime.php の最初のアトラクション1件のHTMLブロックを丸ごと出力（構造確認用）
  const rt = await get(targets[0]);
  if (rt.ok) {
    const m = rt.body.match(/<a href="attrWait\.php\?attr_id=(\d+)&park=\w+">([\s\S]*?)<\/a>/);
    console.log("\n===== realtime.php 先頭アトラクションの生HTMLブロック =====");
    console.log(m ? m[0].replace(/\s+/g, " ").slice(0, 1200) : "（ブロック抽出できず）");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
