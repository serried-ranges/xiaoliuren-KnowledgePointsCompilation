const fs = require('fs');
if (!fs.existsSync('jcy_txt')) fs.mkdirSync('jcy_txt');
const jobs = [
  ['jcy_post_372.html', 'post_372.txt'],
  ['jcy_myz1.html', 'myz1.txt'],
  ['jcy_myz2.html', 'myz2.txt'],
  ['jcy_diff.html', 'diff.txt']
];
for (const [src, dst] of jobs) {
  const h = fs.readFileSync(src, 'utf8');
  const title = ((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  let body = h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
    .replace(/[ \t\r]+/g, ' ')
    .replace(/\n\s+/g, '\n').replace(/\n{2,}/g, '\n').trim();
  const cut = body.indexOf('当前位置');
  if (cut > 0) body = body.slice(cut);
  const end = body.indexOf('上一篇');
  fs.writeFileSync('jcy_txt/' + dst, 'TITLE: ' + title + '\n\n' + (end > 0 ? body.slice(0, end) : body), 'utf8');
  console.log(dst, 'title:', title, 'len:', body.length);
}
