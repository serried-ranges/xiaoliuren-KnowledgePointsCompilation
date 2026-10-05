// 《小六壬通识》PDF 生成脚本（书稿常设工具 · 零第三方依赖）
// 用法：在本文件夹运行  node _工具_生成PDF.js   （或双击 _工具_生成PDF.bat）
// 流程：①重生成合订本 md → ②自带转换器 MD→HTML（内嵌排版 CSS） → ③Edge/Chrome 无头打印为 PDF
// 输出：小六壬通识·合订本.pdf（本文件夹）
// 可选环境变量：
//   PDF_BROWSER=C:\path\to\msedge.exe   指定浏览器（默认自动查找 Edge/Chrome）
//   KEEP_HTML=1                         保留中间 HTML（默认输出到系统临时目录）
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const DIR = __dirname;
const OUT_PDF = path.join(DIR, '小六壬通识·合订本.pdf');
const MD_FILE = path.join(DIR, '小六壬通识·合订本.md');

// ---------- ① 先重新生成合订本 ----------
const genScript = path.join(DIR, '_工具_生成合订本.js');
if (fs.existsSync(genScript)) {
  try {
    execFileSync(process.execPath, [genScript], { cwd: DIR, stdio: 'inherit' });
  } catch (e) {
    console.warn('⚠ 合订本重新生成失败，将使用现有合订本继续。');
  }
}
if (!fs.existsSync(MD_FILE)) {
  console.error('✗ 未找到合订本：' + MD_FILE + '\n  请先运行 _工具_生成合订本.js');
  process.exit(1);
}
let md = fs.readFileSync(MD_FILE, 'utf8');
// 去掉生成器头部（PDF 有独立封面页）
md = md.replace(/^# 《小六壬通识：源流·体系·诸派》· 合订本[\s\S]*?\n---\n/, '');

// ---------- ② 极简 Markdown → HTML（覆盖本书所用语法：标题/表格/引用/列表/代码/链接） ----------
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
  const parts = s.split(/(`[^`]+`)/g);
  return parts.map(p => {
    if (p.length > 2 && p.startsWith('`') && p.endsWith('`')) return '<code>' + esc(p.slice(1, -1)) + '</code>';
    let x = esc(p);
    x = x.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
    x = x.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    x = x.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
    x = x.replace(/(^|[\s（(])(https?:\/\/[^\s<）)]+)/g, '$1<a href="$2">$2</a>');
    return x;
  }).join('');
}
const isFence = l => /^```/.test(l);
const isHeading = l => /^(#{1,6})\s+(.*)$/.exec(l);
const isHr = l => /^\s*---+\s*$/.test(l);
const isBq = l => /^>\s?/.test(l);
const isUl = l => /^\s*[-*]\s+\S/.test(l);
const isOl = l => /^\s*\d+\.\s+\S/.test(l);
const hasPipe = l => l.includes('|');
function isTableSep(l) {
  if (!l.includes('|')) return false;
  const t = l.replace(/[|\s:]/g, '');
  return t.length > 0 && /^-+$/.test(t);
}
function splitRow(l) {
  return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
}
function renderList(items) {
  let html = '';
  const stack = [];
  const closeDeeper = indent => {
    while (stack.length && stack[stack.length - 1].indent >= indent) {
      html += '</' + stack.pop().type + '>';
    }
  };
  for (const it of items) {
    if (!stack.length) {
      html += '<' + it.type + '>';
      stack.push({ indent: it.indent, type: it.type });
    } else if (it.indent > stack[stack.length - 1].indent) {
      html += '<' + it.type + '>';
      stack.push({ indent: it.indent, type: it.type });
    } else if (it.indent < stack[stack.length - 1].indent) {
      closeDeeper(it.indent + 1);
      if (!stack.length) { html += '<' + it.type + '>'; stack.push({ indent: it.indent, type: it.type }); }
    } else if (stack[stack.length - 1].type !== it.type) {
      html += '</' + stack.pop().type + '><' + it.type + '>';
      stack.push({ indent: it.indent, type: it.type });
    }
    html += '<li>' + inline(it.text) + '</li>';
  }
  while (stack.length) html += '</' + stack.pop().type + '>';
  return html;
}
function convert(mdText) {
  const lines = mdText.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    if (/^<a\s+name="[^"]*"><\/a>$/.test(line.trim())) { out.push(line.trim()); i++; continue; } // 锚点行原样保留
    if (isFence(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !isFence(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }
    const h = isHeading(line);
    if (h) { out.push('<h' + h[1].length + '>' + inline(h[2].trim()) + '</h' + h[1].length + '>'); i++; continue; }
    if (isHr(line)) { out.push('<hr>'); i++; continue; }
    if (isBq(line)) {
      const buf = [];
      while (i < lines.length && isBq(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push('<blockquote>' + convertLines(buf) + '</blockquote>');
      continue;
    }
    if (hasPipe(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && hasPipe(lines[i]) && !/^\s*$/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      let t = '<table><thead><tr>';
      for (const c of header) t += '<th>' + inline(c) + '</th>';
      t += '</tr></thead><tbody>';
      for (const r of rows) {
        t += '<tr>';
        const n = Math.max(header.length, r.length);
        for (let c = 0; c < n; c++) t += '<td>' + inline(r[c] || '') + '</td>';
        t += '</tr>';
      }
      t += '</tbody></table>';
      out.push(t);
      continue;
    }
    if (isUl(line) || isOl(line)) {
      const items = [];
      while (i < lines.length && (isUl(lines[i]) || isOl(lines[i]))) {
        const raw = lines[i];
        const m = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(raw);
        const indent = raw.match(/^\s*/)[0].length;
        const type = /\d/.test(m[1][0]) ? 'ol' : 'ul';
        items.push({ indent, type, text: m[2] });
        i++;
      }
      out.push(renderList(items));
      continue;
    }
    out.push('<p>' + inline(line) + '</p>');
    i++;
  }
  return out.join('\n');
}
function convertLines(linesArr) { // 引用框内部：段落＋列表（复用同套规则）
  return convert(linesArr.join('\n'));
}
const body = convert(md);

const css = `
@page { size: A4; margin: 16mm 14mm 18mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: "Microsoft YaHei", "微软雅黑", "PingFang SC", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif; font-size: 10.5pt; line-height: 1.7; color: #222; }
section.cover { page-break-after: always; text-align: center; padding-top: 32vh; }
section.cover .t { font-size: 30pt; font-weight: 700; letter-spacing: 4px; }
section.cover .s { font-size: 14pt; color: #555; margin-top: 14px; letter-spacing: 6px; }
section.cover .m { font-size: 10pt; color: #777; margin-top: 40px; line-height: 2; }
h1 { font-size: 20pt; margin: 26px 0 14px; padding-bottom: 8px; border-bottom: 2px solid #444; page-break-before: always; }
h1:first-of-type { page-break-before: avoid; }
h2 { font-size: 15pt; margin: 20px 0 10px; border-left: 5px solid #666; padding-left: 8px; page-break-after: avoid; }
h3 { font-size: 12.5pt; margin: 15px 0 8px; page-break-after: avoid; }
h4 { font-size: 11pt; margin: 12px 0 6px; page-break-after: avoid; }
p { margin: 6px 0; text-align: justify; }
hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
blockquote { margin: 8px 0; padding: 8px 12px; border-left: 4px solid #b58900; background: #faf7ef; page-break-inside: avoid; }
blockquote p { margin: 4px 0; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; }
th, td { border: 1px solid #999; padding: 4px 6px; vertical-align: top; word-break: break-word; }
th { background: #eee; }
tr { page-break-inside: avoid; }
code { background: #f2f2f2; padding: 0 3px; border-radius: 3px; font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; }
pre { background: #f5f5f5; border: 1px solid #ddd; padding: 10px; white-space: pre-wrap; word-break: break-all; page-break-inside: avoid; font-size: 9pt; }
pre code { background: none; padding: 0; }
a { color: #1a5fb4; text-decoration: none; word-break: break-all; }
strong { font-weight: 700; }
em { font-style: normal; font-weight: 600; }
ul, ol { margin: 6px 0; padding-left: 22px; }
li { margin: 2px 0; text-align: justify; }
`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>小六壬通识：源流·体系·诸派</title>
<style>${css}</style>
</head>
<body>
<section class="cover">
  <div class="t">小六壬通识</div>
  <div class="s">源流 · 体系 · 诸派</div>
  <div class="m">
    依据《小六壬资料治理》04 研究成品层 通识化重写<br>
    书稿第 1 稿 · 完整稿 ｜ 2026-10-05<br>
    传统文化与民俗研究读物 · 非占卜指导手册
  </div>
</section>
${body}
</body>
</html>`;

const htmlPath = path.join(os.tmpdir(), 'xiaoliuren-book-' + Date.now() + '.html');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML 已生成：' + htmlPath);

// ---------- ③ 查找浏览器并打印 PDF ----------
function findBrowser() {
  const env = process.env.PDF_BROWSER;
  if (env && fs.existsSync(env)) return env;
  const cands = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  for (const c of cands) if (fs.existsSync(c)) return c;
  for (const name of ['msedge', 'chrome']) {
    try {
      const r = execFileSync('where.exe', [name], { encoding: 'utf8' }).split(/\r?\n/).find(Boolean);
      if (r && fs.existsSync(r.trim())) return r.trim();
    } catch (e) { /* 未找到 */ }
  }
  return null;
}
const browser = findBrowser();
if (!browser) {
  console.error('✗ 未找到 Edge/Chrome。请安装 Microsoft Edge，或用环境变量指定：PDF_BROWSER="C:\\path\\msedge.exe"');
  console.error('  也可手动打开上述 HTML 文件，在浏览器中"打印 → 另存为 PDF"。');
  process.exit(2);
}
const profile = path.join(os.tmpdir(), 'xiaoliuren-pdf-profile');
const baseArgs = [
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + profile,
  '--virtual-time-budget=20000',
  '--run-all-compositor-stages-before-draw',
  '--no-pdf-header-footer',
  '--print-to-pdf-no-header',
  '--print-to-pdf=' + OUT_PDF,
  pathToFileURL(htmlPath).href,
];
function tryPrint(headlessFlag) {
  try {
    execFileSync(browser, [headlessFlag, ...baseArgs], { stdio: 'pipe', timeout: 180000 });
    return true;
  } catch (e) {
    return false;
  }
}
let ok = tryPrint('--headless=new');
if (!ok || !fs.existsSync(OUT_PDF)) ok = tryPrint('--headless');
if (!ok || !fs.existsSync(OUT_PDF)) {
  console.error('✗ PDF 生成失败。可手动打开 HTML 打印，或检查浏览器版本：' + browser);
  process.exit(3);
}
const size = fs.statSync(OUT_PDF).size;
const head = fs.readFileSync(OUT_PDF).slice(0, 5).toString('latin1');
console.log('✓ PDF 已生成：' + path.basename(OUT_PDF) + '（' + (size / 1024 / 1024).toFixed(2) + ' MB，' + (head === '%PDF-' ? '格式校验通过' : '⚠ 头部异常') + '）');
if (process.env.KEEP_HTML !== '1') {
  try { fs.unlinkSync(htmlPath); } catch (e) { /* 忽略 */ }
}
