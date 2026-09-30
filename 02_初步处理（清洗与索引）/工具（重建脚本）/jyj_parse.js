// Parse a jiangyangjun.com article HTML → title + plain text + excerpt
const fs = require('fs');
const file = process.argv[2];
const h = fs.readFileSync(file, 'utf8');
const t = (h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
let body = h
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
  .replace(/[ \t\r]+/g, ' ')
  .replace(/\n{2,}/g, '\n')
  .trim();
console.log('TITLE:', t.trim());
console.log('TEXT LEN:', body.length);
const keywords = ['起课', '落', '断', '反馈', '卦主', '用神', '六神', '六亲', '结果'];
const counts = keywords.map(k => k + ':' + (body.split(k).length - 1)).join(' ');
console.log('KEYWORDS:', counts);
console.log('--- TEXT (first 1800) ---');
console.log(body.slice(0, 1800));
