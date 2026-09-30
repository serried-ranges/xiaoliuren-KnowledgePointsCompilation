// 27_江氏案例精编（30篇）
const fs = require('fs');
// 篇号 → post 映射（来自 jyj_cases.csv 重建）
function parseCsvLine(l) {
  const out = []; let cur = '', inQ = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (inQ) {
      if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else { if (c === '"') inQ = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
  }
  out.push(cur); return out;
}
const cases = fs.readFileSync('jyj_cases.csv', 'utf8').split('\n').filter(Boolean).map(parseCsvLine)
  .map(r => ({ no: +r[0], post: +r[1], title: r[2], topic: r[3] })).sort((a, b) => a.no - b.no);
const want = [40,41,42,43,44,45,46,47,48,49,50,52,53,54,55,56,58,62,63,67,71,72,83,84,93,94,98,107,111,120];
const paras = txt => txt.split('\n').map(s => s.trim()).filter(s => s.length > 12 && !/^(本文是|标签|上一篇|下一篇|相关文章|返回列表|发表评论)/.test(s));

let out = '';
out += '# 27 江氏案例精编（30篇 · 逐案拆解）\n\n';
out += '> 用途：从官方教程1—120中精选**30篇**，逐案提取"背景→起卦→解卦思路→反馈"，作为《24 公开案例库》的深度配套。\n';
out += '> 方法：程序辅助摘录（段落级，原文节选）＋人工抽检；**装卦盘面多为图片，本精编以文字描述为准**，需要看盘面请回原教程。\n';
out += '> 提醒：官方自证型案例，学习其思路即可，不作准确率证据。\n\n---\n\n';
out += '## 速览表\n\n| 篇 | 标题 | 起卦 | 要点 | 反馈 |\n|---|---|---|---|---|\n';
const detail = [];
for (const no of want) {
  const meta = cases.find(c => c.no === no);
  if (!meta) { out += `| ${no} | （未找到） | | | |\n`; continue; }
  const f = `jyj_txt/post_${meta.post}.txt`;
  if (!fs.existsSync(f)) { out += `| ${no} | ${meta.topic} | | 文件缺失 | |\n`; continue; }
  let t = fs.readFileSync(f, 'utf8');
  const cut = t.indexOf('标签:');
  if (cut > 0) t = t.slice(0, cut);
  const P = paras(t);
  const bg = P.filter(p => /背景|卦主|求测|问/.test(p) && !/起卦|装卦|解卦|反馈/.test(p)).slice(0, 2);
  const qm = P.filter(p => /起卦|报数|装卦/.test(p)).slice(0, 1);
  const sx = P.filter(p => /解卦思路|用神|临|代表/.test(p) && !/起卦|报数/.test(p)).slice(0, 4);
  const fk = t.split('\n').map(s => s.trim()).filter(p => /反馈/.test(p) && p.length < 300).slice(0, 1);
  const qmTxt = (qm[0] || '').replace(/本文是[^。]*。/, '').slice(0, 130);
  const fkTxt = (fk[0] || '').replace(/^.*?反馈[：:]?/, '').replace(/[：:]/g, '').slice(0, 90);
  out += `| ${no} | ${meta.topic} | ${qmTxt.slice(0, 26)} | ${sx.length ? sx.length + '条' : '—'} | ${fkTxt.replace(/\|/g, '/').slice(0, 40)} |\n`;
  detail.push(`### 教程${no}｜${meta.topic}\n\n- **原文**：https://www.jiangyangjun.com/post/${meta.post}.html\n` +
    (bg.length ? `- **背景**：${bg.join(' ').slice(0, 220)}\n` : '') +
    (qmTxt ? `- **起卦**：${qmTxt}\n` : '') +
    (sx.length ? `- **解卦思路**：\n${sx.map(s => '  - ' + s.slice(0, 200)).join('\n')}\n` : '') +
    (fkTxt ? `- **反馈**：${fkTxt}\n` : '- **反馈**：原文未含（或未提取到）\n') + '\n');
}
out += '\n---\n\n## 逐案拆解\n\n' + detail.join('');
out += '\n---\n\n*本文件为资料包文档之一（2026-10-01，第12版）。全文索引见《24_附表》；江氏体系详解见《13》。*\n';
fs.writeFileSync('D:/联网查询xiaoliuren/小六壬知识整理/27_江氏案例精编（30篇逐案拆解）.md', out, 'utf8');
console.log('written 27, bytes:', Buffer.byteLength(out, 'utf8'));
