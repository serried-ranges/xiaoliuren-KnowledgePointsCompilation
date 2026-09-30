// 小六壬资料治理 · 04研究成品 · 审计脚本（常设工具）
// 用法：在本文件夹运行  node audit.js
// 输出：控制台摘要 + 同目录生成《审计报告.md》
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

fs.writeFileSync(path.join(__dirname, '审计报告.md'), report.join('\n'), 'utf8');
log('\n报告已存：' + path.join(__dirname, '审计报告.md'));
