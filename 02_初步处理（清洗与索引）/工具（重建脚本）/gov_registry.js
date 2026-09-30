// Build source registry for the governance raw zone
const fs = require('fs');
const path = require('path');
const BASE = 'D:/联网查询xiaoliuren/小六壬资料治理/01_原始资料（保持原样）';
const rows = [['编号', '文件名', '类型', '来源站点', '原始URL', '获取日期', '保存位置', '备注']];
let n = 0;
const add = (file, type, site, url, loc, note) => { n++; rows.push([n, file, type, site, url, '2026-10', loc, note]); };

const web = path.join(BASE, '网页抓取');
for (const dir of fs.readdirSync(web)) {
  const full = path.join(web, dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) {
    let site = '', url = '', note = '';
    const m1 = f.match(/^jyj_post_(\d+)\.html$/);
    const m2 = f.match(/^jcy_post_(\d+)\.html$/);
    const m3 = f.match(/^jcy_(\d+)\.html$/);
    if (m1) { site = 'jiangyangjun.com（江阳君学社）'; url = `https://www.jiangyangjun.com/post/${m1[1]}.html`; note = '小六壬教程系列页'; }
    else if (m2) { site = 'jiangchunyi.com（江春义博客）'; url = `http://www.jiangchunyi.com/post/${m2[1]}.html`; note = ''; }
    else if (m3) { site = 'jiangchunyi.com（江春义博客）'; url = `http://www.jiangchunyi.com/post/${m3[1]}.html`; note = ''; }
    else { site = dir.includes('江阳君') ? 'jiangyangjun.com' : 'jiangchunyi.com'; url = '（见归档页）'; note = '首页/分类/数据页'; }
    add(f, '网页HTML（原始抓取）', site, url, `01_原始资料/网页抓取/${dir}`, note);
  }
}
add('道家小六壬-理论基础-网络传播件.pdf', 'PDF（网络传播件）', 'GitHub raw（Auroraol/-divination）', 'https://github.com/Auroraol/-divination', '01_原始资料/文档与扫描', '59页；来源与内容见知识包《21》《附录》');
add('居家必用事类全集-第3册-国图扫描.pdf', 'PDF（古籍扫描）', '维基共享资源（NLC892系列）', 'https://upload.wikimedia.org/wikipedia/commons/', '01_原始资料/文档与扫描', '国家图书馆藏本');
add('头书长历1688-早稻田藏本-全68页', '图片集（68张jpg）', '早稻田大学图书馆数字档', 'https://archive.wul.waseda.ac.jp/kosho/bunko31/bunko31_e1341/', '01_原始资料/文档与扫描', '1688年刊本逐页图像');

const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
fs.writeFileSync('D:/联网查询xiaoliuren/小六壬资料治理/01_原始资料（保持原样）/来源登记表.csv', '\ufeff' + csv, 'utf8');
console.log('registry rows:', rows.length - 1);
