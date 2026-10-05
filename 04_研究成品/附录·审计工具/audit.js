// 小六壬资料治理 · 04研究成品 · 审计脚本（常设工具）
// 用法：在本文件夹运行  node audit.js
// 输出：控制台摘要 + 同目录生成《审计报告.md》
// 说明：本版新增"书稿目录扫描"——《05_整理书籍/01_小六壬通识》一并纳入政治合规与交叉引用检查；
//       元文档《书稿审计记录》与派生文件《合订本》不参与扫描。
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..'); // 知识包根目录（本脚本位于其子文件夹）
const files = fs.readdirSync(DIR, { withFileTypes: true });
const mdFiles = files.filter(f => f.isFile() && f.name.endsWith('.md')).map(f => f.name).sort();
const csvFiles = files.filter(f => f.isFile() && f.name.endsWith('.csv')).map(f => f.name).sort();
const dirs = files.filter(f => f.isDirectory()).map(f => f.name).sort();
const report = [];
const log = s => { report.push(s); console.log(s); };

log('=== 文件清单 ===');
log('MD (' + mdFiles.length + '): ' + mdFiles.join(' | '));
log('CSV (' + csvFiles.length + '): ' + csvFiles.join(' | '));
log('DIR (' + dirs.length + '): ' + dirs.join(' | '));

// 1) 00 索引完整性
const idx = fs.readFileSync(path.join(DIR, '00_总览与阅读指南.md'), 'utf8');
log('\n=== 00 索引完整性 ===');
const missingIdx = [...mdFiles, ...csvFiles].filter(n => n !== '00_总览与阅读指南.md' && !idx.includes(n.replace('.md', '').slice(0, 12)));
log(missingIdx.length ? '未在00中出现的文件: ' + missingIdx.join(' | ') : '全部文件均被00提及');

// 2) 交叉引用 《NN》
log('\n=== 交叉引用检查（《NN》→ 应存在 NN_ 文件） ===');
const nums = new Set(mdFiles.filter(n => /^\d\d_/.test(n)).map(n => n.slice(0, 2)));
for (const d of dirs) { const m = /^(\d\d)_/.exec(d); if (m) nums.add(m[1]); } // 数字前缀子文件夹也可被《NN》引用
let refBad = 0;
for (const f of mdFiles) {
  if (f.startsWith('24_附表')) continue; // 附表按24处理
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  const refs = [...t.matchAll(/《\s*(\d{2})(?!\d)[^》]*》/g)].map(m => m[1]);
  const bad = [...new Set(refs)].filter(n => !nums.has(n));
  if (bad.length) { log(f + ' → 无效引用: ' + bad.join(',')); refBad++; }
}
if (!refBad) log('无失效引用');

// 3) 版本戳
log('\n=== 版本戳 ===');
for (const f of mdFiles) {
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  const v = [...new Set([...t.matchAll(/第\s*(\d+)\s*版/g)].map(m => +m[1]))].sort((a, b) => a - b);
  if (v.length) log(f + ' → ' + v.join(','));
}

// 4) 来源编号
log('\n=== 来源编号检查（10号文件） ===');
const t10 = fs.readFileSync(path.join(DIR, '10_资料来源清单.md'), 'utf8');
const src = [...t10.matchAll(/^\|\s*(\d+)\s*\|/gm)].map(m => +m[1]);
const dup = src.filter((n, i) => src.indexOf(n) !== i);
const gaps = [];
for (let i = 1; i <= Math.max(...src); i++) if (!src.includes(i)) gaps.push(i);
log('来源总数: ' + src.length + '，最大编号: ' + Math.max(...src));
log(dup.length ? '重复编号: ' + [...new Set(dup)].join(',') : '无重复编号');
log(gaps.length ? '缺号: ' + gaps.slice(0, 30).join(',') : '无缺号');

// 5) 计数
log('\n=== 实际计数 ===');
log('实际: ' + mdFiles.length + ' md, ' + csvFiles.length + ' csv, ' + dirs.length + ' dirs');

// 6) 政治合规扫描（一个中国原则：涉台/涉港/涉澳表述须带规范限定词）
log('\n=== 政治合规扫描（一个中国原则） ===');
const QUAL = ['中国', '地区', '特别行政区', '台北', '港澳'];
const KW = /(台湾|臺灣|香港|澳门|澳門)/g;
const scanList = mdFiles.map(f => [f, path.join(DIR, f)]);
const extra = [
  ['README.md', path.join(DIR, '..', 'README.md')],
  ['00_治理说明', path.join(DIR, '..', '00_治理说明（架构·规则·长期计划）.md')],
  ['01_层说明', path.join(DIR, '..', '01_原始资料', 'README.md')],
  ['02_层说明', path.join(DIR, '..', '02_初步处理', '00_初步处理说明.md')],
  ['03_层说明', path.join(DIR, '..', '03_去封建迷信', 'README.md')],
  ['05_层说明', path.join(DIR, '..', '05_整理书籍', 'README.md')],
];
for (const [label, p] of extra) if (fs.existsSync(p)) scanList.push([label, p]);
let polWarn = 0;
for (const [label, p] of scanList) {
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(KW)) {
      const idx = m.index;
      const win = line.slice(Math.max(0, idx - 15), idx + m[0].length + 15);
      if (!QUAL.some(q => win.includes(q))) {
        polWarn++;
        log('⚠ ' + label + ' L' + (i + 1) + '：' + line.trim().slice(0, 60));
      }
    }
  });
}
log(polWarn ? ('存在 ' + polWarn + ' 处待规范表述') : '通过：未发现未加规范限定的涉台/涉港/涉澳表述');

// 7) 书稿目录扫描（《05_整理书籍/01_小六壬通识》）
log('\n=== 书稿目录扫描（05_整理书籍/01_小六壬通识） ===');
const BOOK_DIR = path.join(DIR, '..', '05_整理书籍', '01_小六壬通识');
const BOOK_SKIP = new Set(['书稿审计记录.md']); // 元文档：政治与内容扫描均排除
if (fs.existsSync(BOOK_DIR)) {
  const bookEntries = fs.readdirSync(BOOK_DIR, { withFileTypes: true });
  const bookAll = bookEntries.map(f => f.name).sort();
  const bookScan = bookAll.filter(n => n.endsWith('.md') && !BOOK_SKIP.has(n) && !n.includes('合订本'));
  log('书稿文件总数: ' + bookEntries.length + '（md ' + bookAll.filter(n => n.endsWith('.md')).length + ' 个）');
  log('书稿清单: ' + bookAll.join(' | '));
  log('扫描对象: ' + bookScan.length + ' 个 md（排除：书稿审计记录、合订本）');
  // 政治合规
  let bookPol = 0;
  for (const f of bookScan) {
    const lines = fs.readFileSync(path.join(BOOK_DIR, f), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const m of line.matchAll(KW)) {
        const idx = m.index;
        const win = line.slice(Math.max(0, idx - 15), idx + m[0].length + 15);
        if (!QUAL.some(q => win.includes(q))) {
          bookPol++;
          log('⚠ 书稿/' + f + ' L' + (i + 1) + '：' + line.trim().slice(0, 60));
        }
      }
    });
  }
  log(bookPol ? ('书稿政治合规：存在 ' + bookPol + ' 处待规范表述') : '书稿政治合规：通过');
  // 交叉引用（《NN》→ 研究层 NN_ 文件；章级锚点 #chNN 不参与）
  let bookRefBad = 0;
  for (const f of bookScan) {
    const t = fs.readFileSync(path.join(BOOK_DIR, f), 'utf8');
    const refs = [...new Set([...t.matchAll(/《\s*(\d{2})(?!\d)/g)].map(m => m[1]))];
    const bad = refs.filter(n => !nums.has(n));
    if (bad.length) { log('书稿/' + f + ' → 无效引用: ' + bad.join(',')); bookRefBad++; }
  }
  log(bookRefBad ? ('书稿交叉引用：存在 ' + bookRefBad + ' 个文件含失效引用') : '书稿交叉引用：无失效引用');
  // 合订本与工具
  log(bookAll.some(n => n.includes('合订本')) ? '合订本：存在' : '合订本：未生成（运行 _工具_生成合订本.js 生成）');
} else {
  log('未发现书稿目录（跳过）');
}

fs.writeFileSync(path.join(__dirname, '审计报告.md'), report.join('\n'), 'utf8');
log('\n报告已存：' + path.join(__dirname, '审计报告.md'));
