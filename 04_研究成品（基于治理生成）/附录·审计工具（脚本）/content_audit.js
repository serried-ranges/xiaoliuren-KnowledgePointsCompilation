// 小六壬资料治理 · 04研究成品 · 内容审计脚本（门禁：封建迷信等内容的扫描与降权提示）
// 用法：在本文件夹运行  node content_audit.js
// 输出：控制台摘要 + 同目录生成《内容审计报告.md》
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..'); // 知识包根目录
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md'));
const buckets = {
  '神通符咒': /符咒|画符|书符|符板|符头|灵符|法事|法术|法门|咒语|神咒|咒|开坛|坛场/,
  '仙鬼巫': /大仙|仙家|出马|收魂|招魂|鬼门十三针|阴脉|阴魂|阴灵|野鬼|鬼魂|附体|附身/,
  '命理恐吓': /克夫|克妻|克子|克老|少亡|夭折|血光|折寿|短命|牢狱|断子/,
  '改运化解': /改命|转运|禳解|化解|辟邪|开光|趋吉避凶|镇宅/,
  '信仰供养': /供奉|香火|敬神|拜佛|菩萨|城隍|土地公|报应|阴德|轮回|六道/,
  '疾病干预': /治病|疗病|医治|病人|病者|疾病|康复|痊愈/
};
const rows = [];
for (const f of files) {
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  const line = { file: f, hits: {}, total: 0 };
  for (const [k, re] of Object.entries(buckets)) {
    const g = t.match(new RegExp(re.source, 'g'));
    const n = g ? g.length : 0;
    line.hits[k] = n;
    line.total += n;
  }
  rows.push(line);
}
rows.sort((a, b) => b.total - a.total);
let out = '# 内容审计报告（门禁扫描结果）\n\n';
out += '> 分级说明：命中词多为 C 级"研究对象"（民俗文本原文样貌）。**收录≠采信**——如发现正文出现为迷信内容背书、指导实操、恐吓读者等表述，应修改并降权。\n\n';
out += '| 文档 | 神通符咒 | 仙鬼巫 | 命理恐吓 | 改运化解 | 信仰供养 | 疾病干预 | 合计 |\n|---|---|---|---|---|---|---|---|\n';
for (const r of rows) {
  out += `| ${r.file} | ${r.hits['神通符咒']} | ${r.hits['仙鬼巫']} | ${r.hits['命理恐吓']} | ${r.hits['改运化解']} | ${r.hits['信仰供养']} | ${r.hits['疾病干预']} | **${r.total}** |\n`;
}
out += `\n*生成时间：${new Date().toISOString().slice(0, 10)} ｜ 扫描对象：${files.length} 份文档*\n`;
fs.writeFileSync(path.join(__dirname, '内容审计报告.md'), out, 'utf8');
console.log('内容审计完成：' + files.length + ' 份文档，共命中 ' + rows.reduce((s, r) => s + r.total, 0) + ' 处（C级研究对象）。报告：内容审计报告.md');
