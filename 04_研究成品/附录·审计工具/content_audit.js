// 小六壬资料治理 · 内容审计脚本
// 用法：在本目录运行 node content_audit.js
// 自动扫描用于定位复核线索；命中数不是审核结论，必须由审阅者查看上下文。
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..');
const BOOK = path.join(DIR, '..', '06_小六壬通识', '书稿');
const buckets = {
  '神通符咒': /符咒|画符|书符|符板|符头|灵符|法事|法术|法门|咒语|神咒|咒|开坛|坛场/,
  '仙鬼巫': /大仙|仙家|出马|收魂|招魂|鬼门十三针|阴脉|阴魂|阴灵|野鬼|鬼魂|附体|附身/,
  '命理恐吓': /克夫|克妻|克子|克老|少亡|夭折|血光|折寿|短命|牢狱|断子/,
  '改运化解': /改命|转运|禳解|化解|辟邪|开光|趋吉避凶|镇宅/,
  '信仰供养': /供奉|香火|敬神|拜佛|菩萨|城隍|土地公|报应|阴德|轮回|六道/,
  '疾病干预': /治病|疗病|医治|病人|病者|疾病|康复|痊愈/
};

function scanFile(fp, file) {
  const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/);
  const hits = Object.fromEntries(Object.keys(buckets).map(k => [k, 0]));
  const contexts = [];
  for (let i = 0; i < lines.length; i++) {
    const perLine = [];
    for (const [category, pattern] of Object.entries(buckets)) {
      const found = lines[i].match(new RegExp(pattern.source, 'g')) || [];
      if (found.length) {
        hits[category] += found.length;
        perLine.push([category, found.length]);
      }
    }
    if (perLine.length) {
      const excerpt = lines[i].trim().replace(/\s+/g, ' ').replace(/\|/g, '¦').replace(/`/g, "'").slice(0, 180);
      contexts.push({ line: i + 1, categories: perLine, excerpt });
    }
  }
  return { file, hits, total: Object.values(hits).reduce((sum, n) => sum + n, 0), contexts };
}

function rowsForFiles(files, base) {
  return files.map(file => scanFile(path.join(base, file), file));
}

function walkMarkdown(dir, rel = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMarkdown(full, rel + entry.name + '/'));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(scanFile(full, rel + entry.name));
    }
  }
  return results;
}

function renderSection(title, rows) {
  let out = `## ${title}\n\n`;
  out += '| 文档 | 神通符咒 | 仙鬼巫 | 命理恐吓 | 改运化解 | 信仰供养 | 疾病干预 | 命中数 |\n';
  out += '|---|---:|---:|---:|---:|---:|---:|---:|\n';
  for (const row of rows) {
    const h = row.hits;
    out += `| ${row.file} | ${h['神通符咒']} | ${h['仙鬼巫']} | ${h['命理恐吓']} | ${h['改运化解']} | ${h['信仰供养']} | ${h['疾病干预']} | ${row.total} |\n`;
  }
  out += '\n### 命中位置与上下文\n\n';
  let n = 0;
  for (const row of rows) {
    for (const hit of row.contexts) {
      const labels = hit.categories.map(([category, count]) => count > 1 ? `${category}×${count}` : category).join('、');
      out += `- \`${row.file}:${hit.line}\`（${labels}）：${hit.excerpt}\n`;
      n++;
    }
  }
  if (!n) out += '无关键词命中。\n';
  out += '\n';
  return out;
}

const mdFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort();
const researchRows = rowsForFiles(mdFiles, DIR);
const csvFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.csv')).sort();
const csvRows = rowsForFiles(csvFiles, DIR);
const appendixDirs = fs.readdirSync(DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.startsWith('附录·') && d.name !== '附录·审计工具')
  .map(d => d.name).sort();
const appendixRows = appendixDirs.flatMap(d => walkMarkdown(path.join(DIR, d), d + '/'));
const bookFiles = fs.existsSync(BOOK)
  ? fs.readdirSync(BOOK).filter(f => f.endsWith('.md') && f !== '书稿审计记录.md' && !f.includes('合订本')).sort()
  : [];
const bookRows = rowsForFiles(bookFiles, BOOK);

const totals = [researchRows, csvRows, appendixRows, bookRows].map(group =>
  group.reduce((sum, row) => sum + row.total, 0));
let report = '# 内容审计报告（关键词扫描与人工复核）\n\n';
report += '> 自动扫描只用于定位上下文，不预设命中分类，也不单独构成通过/失败结论。请逐项复核命中位置，并在发布审计记录中注明处理结果。\n\n';
report += `扫描范围：研究 Markdown ${researchRows.length} 份；CSV ${csvRows.length} 份；附录 Markdown ${appendixRows.length} 份；书稿 Markdown ${bookRows.length} 份。二进制图片/PDF 不由此脚本扫描，其来源与许可须由材料状态表另行审阅。\n\n`;
report += renderSection('研究层 Markdown', researchRows);
report += renderSection('研究层 CSV', csvRows);
report += renderSection('附录 Markdown', appendixRows);
report += renderSection('书稿 Markdown', bookRows);
report += `*生成时间：${new Date().toISOString().slice(0, 10)}。命中总数（研究 Markdown/CSV/附录/书稿）：${totals.join(' / ')}。人工复核状态：待记录。*\n`;
fs.writeFileSync(path.join(__dirname, '内容审计报告.md'), report, 'utf8');
console.log(`内容扫描完成：研究 MD ${researchRows.length} 份、CSV ${csvRows.length} 份、附录 MD ${appendixRows.length} 份、书稿 MD ${bookRows.length} 份；命中 ${totals.reduce((a, b) => a + b, 0)} 处；报告含行号和上下文。`);
