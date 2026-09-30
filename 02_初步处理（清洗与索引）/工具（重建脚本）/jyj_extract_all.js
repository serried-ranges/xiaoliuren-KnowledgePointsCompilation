// Extract all jyj posts to text files + build index
const fs = require('fs');
const path = require('path');
const outDir = 'jyj_txt';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
const rows = [];
for (let i = 76; i <= 205; i++) {
  const f = `jyj_post_${i}.html`;
  if (!fs.existsSync(f)) continue;
  const h = fs.readFileSync(f, 'utf8');
  const title = ((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').split('-')[0].trim();
  let body = h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
    .replace(/[ \t\r]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  // cut navigation: find start after the 2nd occurrence of title-ish, fallback keep from '江阳君' + '文是'
  const cutMark = body.indexOf('本文是');
  if (cutMark > 0) body = body.slice(cutMark);
  fs.writeFileSync(path.join(outDir, `post_${i}.txt`), body, 'utf8');
  const m = title.match(/教程\s*(\d+)/);
  const no = m ? +m[1] : '';
  const topic = title.replace(/^.*?：/, '');
  rows.push([no, i, title, body.length, topic]);
}
fs.writeFileSync('jyj_index.csv', rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'), 'utf8');
console.log('done', rows.length, 'posts');
console.log('titles sample: post/205 =>', rows.find(r => r[1] === 205)?.[2]);
console.log('post/125 =>', rows.find(r => r[1] === 125)?.[2]);
console.log('post/126 =>', rows.find(r => r[1] === 126)?.[2]);
