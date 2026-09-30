// v2: proper titles from HTML; wider 'lin' regex
const fs = require('fs');
const rows = [];
for (let i = 76; i <= 205; i++) {
  const f = `jyj_txt/post_${i}.txt`;
  const hf = `jyj_post_${i}.html`;
  if (!fs.existsSync(f) || !fs.existsSync(hf)) continue;
  let t = fs.readFileSync(f, 'utf8');
  const cut = t.indexOf('标签:');
  if (cut > 0) t = t.slice(0, cut);
  let title = ((fs.readFileSync(hf, 'utf8').match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').split('-')[0].trim();
  const m = title.match(/教程\s*(\d+)/) || t.match(/第\s*(\d+)\s*篇/);
  const no = m ? +m[1] : 0;
  const topic = title.replace(/^江氏小六壬教程\s*\d+[：:]\s*/, '');
  const qm = t.match(/起卦(?:方式|的方法是|方式为|用的是)[^。\n]{0,40}/);
  const bs = t.match(/报数[了个]?\s*(\d{1,3})/);
  const ys = t.match(/以([^，。\n]{1,12})为用神/);
  const lin = t.match(/临(大安|留连|留恋|速喜|赤口|小吉|空亡|青龙|朱雀|勾陈|白虎|玄武|腾蛇)/);
  const fk = t.match(/[：:，,]?(?:卦主)?反馈[：:]?([^。\n]{4,140})。?/) || t.match(/（?结果[：:]?([^。\n]{4,140})）?。/) || t.match(/最后([^。\n]{4,140})。/);
  rows.push({ no, post: i, title, topic, qm: qm ? qm[0].replace(/^起卦(方式|的方法是|方式为|用的是)/, '') : '', bs: bs ? bs[1] : '', ys: ys ? ys[1] : '', lin: lin ? lin[1] : '', fb: fk ? fk[1].trim() : '', len: t.length });
}
// dedupe: prefer the post whose title is exactly '教程N：'
const best = {};
for (const r of rows) {
  if (!r.no) continue;
  const exact = new RegExp('教程\\s*' + r.no + '[：:]').test(r.title);
  if (!best[r.no] || (exact && !best[r.no]._exact)) best[r.no] = Object.assign({}, r, { _exact: exact });
}
const list = Object.values(best).sort((a, b) => a.no - b.no);
const esc = x => `"${String(x).replace(/"/g, '""')}"`;
fs.writeFileSync('jyj_cases.csv', list.map(r => [r.no, r.post, r.title, r.topic, r.qm, r.bs, r.ys, r.lin, r.fb].map(esc).join(',')).join('\n'), 'utf8');
let md = '| 篇 | post | 标题 | 起卦 | 用神 | 临 | 反馈 |\n|---|---|---|---|---|---|---|\n';
for (const r of list) md += `| ${r.no} | ${r.post} | ${r.topic} | ${(r.qm + (r.bs ? '·报' + r.bs : '')).slice(0, 26)} | ${r.ys} | ${r.lin} | ${r.fb.slice(0, 72)} |\n`;
fs.writeFileSync('jyj_cases.md', md, 'utf8');
console.log('deduped rows:', list.length);
const missing = [];
for (let n = 1; n <= 120; n++) if (!best[n]) missing.push(n);
console.log('missing numbers:', missing.join(',') || 'none');
console.log('withFeedback:', list.filter(r => r.fb).length);
// show duplicates info
const counts = {};
for (const r of rows) if (r.no) counts[r.no] = (counts[r.no] || 0) + 1;
console.log('multi-post numbers:', Object.entries(counts).filter(([k, v]) => v > 1).map(([k, v]) => k + '(' + v + ')').join(', ') || 'none');
