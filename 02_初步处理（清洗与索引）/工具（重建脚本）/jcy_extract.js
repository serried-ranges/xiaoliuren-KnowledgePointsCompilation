const fs = require('fs');
if (!fs.existsSync('jcy_txt')) fs.mkdirSync('jcy_txt');
for (const i of [383, 382, 381, 379, 377, 375, 369, 365, 384]) {
  const h = fs.readFileSync(`jcy_post_${i}.html`, 'utf8');
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
  const cut = body.indexOf('当前位置');
  if (cut > 0) body = body.slice(cut);
  fs.writeFileSync(`jcy_txt/post_${i}.txt`, body, 'utf8');
  console.log(i, body.length, (body.split('\n')[1] || '').slice(0, 50));
}
