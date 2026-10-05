// 《小六壬通识》合订本生成脚本（书稿常设工具）
// 用法：在本文件夹（05_整理书籍/34_小六壬通识（书稿））运行  node _工具_生成合订本.js
// 顺序：00 扉页 → 01—34 章 → 附录 A—G；输出《小六壬通识·合订本.md》（覆盖式）
// 特色：为每章/附录注入 <a name="..."> 锚点，并把扉页目录链接改写为合订本内跳转（#chNN／#appX）
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const all = fs.readdirSync(DIR).filter(f => f.endsWith('.md'));
const front = all.filter(f => /^00_/.test(f)).sort();
const chapters = all.filter(f => /^\d{2}_第\d{2}章/.test(f)).sort();
const appendices = all.filter(f => /^附录[A-G]_/.test(f)).sort();
const ordered = [...front, ...chapters, ...appendices];

if (!ordered.length) {
  console.error('未找到可合并的书稿文件。');
  process.exit(1);
}

const header = [
  '# 《小六壬通识：源流·体系·诸派》· 合订本',
  '',
  '> 本文件由书稿各章自动合并生成（共 ' + ordered.length + ' 个文件：扉页 ＋ 34 章 ＋ 附录 A—G）。',
  '> 单章增改后，运行 `_工具_生成合订本.js` 重新生成；合订本不含《书稿审计记录》。',
  '> 章节前设锚点、目录为**文档内跳转链接**；PDF 版由 `_工具_生成PDF.js` 生成。',
  '> 书稿版本：第 1 稿·完整稿（2026-10-05）；依据《小六壬资料治理》04 研究成品层。',
  '',
  '---',
  '',
].join('\n');

const body = ordered.map(f => {
  let content = fs.readFileSync(path.join(DIR, f), 'utf8').trim();
  const mCh = /^(\d{2})_第\d{2}章/.exec(f);
  const mA = /^附录([A-G])_/.exec(f);
  if (mCh) {
    content = '<a name="ch' + mCh[1] + '"></a>\n\n' + content;
  } else if (mA) {
    content = '<a name="app' + mA[1].toLowerCase() + '"></a>\n\n' + content;
  } else if (/^00_/.test(f)) {
    // 扉页目录：分章文件链接 → 合订本内锚点跳转
    content = content
      .replace(/\]\((\d{2})_第\d{2}章_[^)]*\.md\)/g, '](#ch$1)')
      .replace(/\]\(附录([A-Ga-g])_[^)]*\.md\)/g, (m, l) => '](#app' + l.toLowerCase() + ')');
  }
  return content;
}).join('\n\n---\n\n');

const outFile = path.join(DIR, '小六壬通识·合订本.md');
fs.writeFileSync(outFile, header + body + '\n', 'utf8');
const size = fs.statSync(outFile).size;
console.log('合订本已生成：' + ordered.length + ' 个文件 → ' + path.basename(outFile) + '（' + (size / 1024).toFixed(0) + ' KB）');
console.log('文件顺序：' + ordered.join(' | '));
