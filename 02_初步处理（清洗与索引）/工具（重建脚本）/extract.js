const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const file = process.argv[2];
const outTxt = process.argv[3] || 'full.txt';
const keywords = process.argv.slice(4);

(async () => {
  const data = fs.readFileSync(file);
  const parser = new PDFParse({ data });
  let text = '';
  let pages = 'n/a';
  if (typeof parser.getText === 'function') {
    const res = await parser.getText();
    text = res.text || '';
    pages = res.total || (res.pages && res.pages.length) || 'n/a';
  } else if (typeof parser.load === 'function') {
    await parser.load();
    const res = await parser.getText();
    text = res.text || '';
    pages = res.total || (res.pages && res.pages.length) || 'n/a';
  }
  console.log('PAGES:', pages);
  console.log('TEXT_LENGTH:', text.length);
  fs.writeFileSync(outTxt, text, 'utf8');
  console.log('SAVED:', outTxt);
  for (const kw of keywords) {
    let idx = 0, count = 0;
    while ((idx = text.indexOf(kw, idx)) !== -1 && count < 30) {
      count++;
      const start = Math.max(0, idx - 100);
      const end = Math.min(text.length, idx + 260);
      console.log('--- HIT [' + kw + '] #' + count + ' ---');
      console.log(text.slice(start, end).replace(/\s+/g, ' '));
      idx += kw.length;
    }
    console.log('== TOTAL HITS', kw, '=', count, '==');
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
