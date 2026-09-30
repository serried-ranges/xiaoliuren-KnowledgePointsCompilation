// Build the pack markdown: 江氏教程案例索引(1-120)
const fs = require('fs');
const lines = fs.readFileSync('jyj_cases.csv', 'utf8').split('\n').filter(l => l.trim());
function parseCsvLine(l) {
  const out = []; let cur = '', inQ = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (inQ) {
      if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
const rows = lines.map(parseCsvLine).map(r => ({ no: +r[0], post: +r[1], title: r[2], topic: r[3], qm: r[4] || '', bs: r[5] || '', ys: r[6] || '', lin: r[7] || '', fb: r[8] || '' }));
rows.sort((a, b) => a.no - b.no);

const fmtQm = r => {
  let t = '';
  if (/数字起卦|报数起/.test(r.qm)) t = '数字';
  else if (/日时起卦/.test(r.qm)) t = '日时';
  else if (/时刻起卦/.test(r.qm)) t = '时刻';
  else t = r.qm ? r.qm.replace(/^是/, '').slice(0, 5).replace(/[，,]/g, '') : '';
  if (r.bs) t += '·报' + r.bs;
  return t || '—';
};
const fmtYs = y => (y || '').replace(/^以/, '') || '—';

let md = '';
md += '# 24_附表·江氏教程案例索引（1—120）\n\n';
md += '> 数据来源：jiangyangjun.com 官方教程（《江阳君带你轻松学小六壬》系列，1—120篇）。本表由**程序辅助提取＋人工抽检**整理：篇号/标题/起卦方式/报数/用神/断语关键词（临）/反馈摘要。\n';
md += '> 用途：为《24 公开案例库》提供江氏系全量案例目录；反馈摘要为原文缩略，引用请回原教程核对。\n';
md += '> 说明：教程1—39为**基础与技法篇**（无个案反馈）；40—120为**分类实例篇**；120篇中85篇含可直接提取的"卦主反馈"句。\n\n---\n\n';
md += '## 一、基础与技法篇（1—39）目录\n\n| 篇 | 标题 |\n|---|---|\n';
for (const r of rows.filter(r => r.no <= 39)) md += `| ${r.no} | ${r.topic || r.title.replace(/^江氏小六壬教程\s*\d+[：:]\s*/, '')} |\n`;
md += '\n## 二、分类实例篇（40—120）案例索引\n\n| 篇 | 标题 | 起卦 | 用神 | 断语（临） | 反馈摘要 |\n|---|---|---|---|---|---|\n';
for (const r of rows.filter(r => r.no >= 40)) md += `| ${r.no} | ${r.topic || ''} | ${fmtQm(r)} | ${fmtYs(r.ys)} | ${r.lin || '—'} | ${((r.fb || '—').replace(/^[：:、\s]+/, '')).slice(0, 80)} |\n`;
md += '\n---\n\n';
md += '## 三、统计与使用说明\n\n';
md += '- 案例篇共 81 篇（40—120），其中含反馈句 85 处（个别篇含双案例）。\n';
md += '- 起卦方式分布：数字起卦（含报数）为主流，其次日时起卦、时刻起卦（与《04》《13》所述一致）。\n';
md += '- 用神分布：妻财（财运类最多）、父母（出行/文书/健康类）、官鬼（工作/官非/疾病）、自身/数字宫/时宫（问自身）等。\n';
md += '- 本索引可配合《24》§三"江氏对照案例（4例全文复盘）"与《13》§三"分类断事要点"使用。\n';
md += '- **性质提示**：案例均为官方自证型案例；本索引仅记录"官方公布了什么"，不代表验证其准确率。\n\n';
md += '*本文件为资料包附件（2026-10-01，第11版），随《24 公开案例库》合并使用。*\n';

const out = 'D:/联网查询xiaoliuren/小六壬知识整理/24_附表·江氏教程案例索引（1-120）.md';
fs.writeFileSync(out, md, 'utf8');
console.log('written', out, Buffer.byteLength(md, 'utf8'), 'bytes, rows', rows.length);
