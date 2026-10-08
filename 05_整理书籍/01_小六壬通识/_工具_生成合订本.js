// 《小六壬通识》合订本生成脚本（书稿常设工具）
// 用法：在本文件夹（05_整理书籍/01_小六壬通识）运行  node _工具_生成合订本.js
// 顺序：卷首（00 书名页／00a 自序／00b 凡例／00c 总目录）→ 01—35 章 → 附录 A—G → 99 后记；输出《小六壬通识·合订本.md》（覆盖式）
// 特色：为卷首/各章/附录/卷末注入 <a name="..."> 锚点，并把目录链接改写为合订本内跳转（#chNN／#appX／#pre／#fanli／#post）
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const all = fs.readdirSync(DIR).filter(f => f.endsWith('.md'));
const front = all.filter(f => /^00/.test(f)).sort();
const chapters = all.filter(f => /^\d{2}_第\d{2}章/.test(f)).sort();
const appendices = all.filter(f => /^附录[A-G]_/.test(f)).sort();
const back = all.filter(f => /^99_/.test(f)).sort();
const ordered = [...front, ...chapters, ...appendices, ...back];

if (!ordered.length) {
  console.error('未找到可合并的书稿文件。');
  process.exit(1);
}

const header = [
  '# 《小六壬通识：源流·体系·诸派》· 合订本',
  '',
  '> 作者：万重山',
  '> 本文件由书稿各文件自动合并生成（共 ' + ordered.length + ' 件：卷首 ' + front.length + ' 件 ＋ ' + chapters.length + ' 章 ＋ 附录 A—G ＋ 后记）。',
  '> 单章增改后，运行 `_工具_生成合订本.js` 重新生成；合订本不含《书稿审计记录》。',
  '> 卷首/章节/附录/卷末均设锚点、目录为**文档内跳转链接**，章末有 **[↑ 返回目录]**；PDF 版由 `_工具_生成PDF.js` 生成。',
  '> 书稿版本：第 2 稿（2026-10-08）；依据《小六壬资料治理》04 研究成品层（第29版）。',
  '',
  '---',
  '',
  '<a name="top"></a>',
  '',
].join('\n');

const rewriteLinks = (s) => s
  .replace(/\]\((\d{2})_第\d{2}章_[^)]*\.md\)/g, '](#ch$1)')
  .replace(/\]\(附录([A-Ga-g])_[^)]*\.md\)/g, (m, l) => '](#app' + l.toLowerCase() + ')')
  .replace(/\]\(00a_[^)]*\.md\)/g, '](#pre)')
  .replace(/\]\(00b_[^)]*\.md\)/g, '](#fanli)')
  .replace(/\]\(99_[^)]*\.md\)/g, '](#post)');

const body = ordered.map(f => {
  let content = fs.readFileSync(path.join(DIR, f), 'utf8').trim();
  const mCh = /^(\d{2})_第\d{2}章/.exec(f);
  const mA = /^附录([A-G])_/.exec(f);
  if (mCh) {
    content = '<a name="ch' + mCh[1] + '" id="ch' + mCh[1] + '"></a>\n\n' + content + '\n\n> [↑ 返回目录](#top)';
  } else if (mA) {
    content = '<a name="app' + mA[1].toLowerCase() + '" id="app' + mA[1].toLowerCase() + '"></a>\n\n' + content + '\n\n> [↑ 返回目录](#top)';
  } else if (/^00a_/.test(f)) {
    content = '<a name="pre" id="pre"></a>\n\n' + content + '\n\n> [↑ 返回目录](#top)';
  } else if (/^00b_/.test(f)) {
    content = '<a name="fanli" id="fanli"></a>\n\n' + content + '\n\n> [↑ 返回目录](#top)';
  } else if (/^99_/.test(f)) {
    content = '<a name="post" id="post"></a>\n\n' + content + '\n\n> [↑ 返回目录](#top)';
  }
  if (/^00/.test(f)) content = rewriteLinks(content);
  return content;
}).join('\n\n---\n\n');

const outFile = path.join(DIR, '小六壬通识·合订本.md');
fs.writeFileSync(outFile, header + body + '\n', 'utf8');
const size = fs.statSync(outFile).size;
console.log('合订本已生成：' + ordered.length + ' 个文件 → ' + path.basename(outFile) + '（' + (size / 1024).toFixed(0) + ' KB）');
console.log('文件顺序：' + ordered.join(' | '));
