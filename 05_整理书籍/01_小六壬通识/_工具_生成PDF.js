// 《小六壬通识》PDF 生成脚本（书稿常设工具 · 零 npm 依赖）
// 用法：在本文件夹运行  node _工具_生成PDF.js   （或双击 _工具_生成PDF.bat）
// 流程：①重生成合订本 md → ②MD→HTML（含排版 CSS）→ ③Paged.js 浏览器内分页（目录页码＋页脚页码）
//       → ④Edge/Chrome 无头 CDP 打印 PDF（自动生成书签目录）
// 输出：小六壬通识·合订本.pdf（本文件夹）
// 依赖文件：_工具_paged.polyfill.js（Paged.js v0.4.3，MIT；本地附带，用于目录/页脚页码）
// 可选环境变量：
//   PDF_BROWSER=C:\path\to\msedge.exe   指定浏览器（默认自动查找 Edge/Chrome）
//   KEEP_HTML=1                         保留中间 HTML（默认输出到系统临时目录）
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const { pathToFileURL } = require('url');

const DIR = __dirname;
const OUT_PDF = path.join(DIR, '小六壬通识·合订本.pdf');
const MD_FILE = path.join(DIR, '小六壬通识·合订本.md');
const PAGED_FILE = path.join(DIR, '_工具_paged.polyfill.js');

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
md = md.replace(/^# 《小六壬通识：源流·体系·诸派》· 合订本[\s\S]*?\n---\n/, '');

// ---------- ② 极简 Markdown → HTML ----------
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
    while (stack.length && stack[stack.length - 1].indent >= indent) html += '</' + stack.pop().type + '>';
  };
  for (const it of items) {
    if (!stack.length) { html += '<' + it.type + '>'; stack.push({ indent: it.indent, type: it.type }); }
    else if (it.indent > stack[stack.length - 1].indent) { html += '<' + it.type + '>'; stack.push({ indent: it.indent, type: it.type }); }
    else if (it.indent < stack[stack.length - 1].indent) {
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
    if (/^<a\s+[^>]*><\/a>$/.test(line.trim())) { out.push(line.trim()); i++; continue; } // 锚点行原样保留
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
function convertLines(linesArr) { return convert(linesArr.join('\n')); }
const body = convert(md);

const css = `
@page {
  size: A4;
  margin: 16mm 14mm 20mm;
  @bottom-center { content: "第 " counter(page) " / " counter(pages) " 页"; font-family: "Microsoft YaHei", sans-serif; font-size: 9pt; color: #777; }
}
@page :first { @bottom-center { content: none; } }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: "Microsoft YaHei", "微软雅黑", "PingFang SC", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif; font-size: 10.5pt; line-height: 1.7; color: #222; }
section.cover { page-break-after: always; text-align: center; padding-top: 32vh; }
section.cover .t { font-size: 30pt; font-weight: 700; letter-spacing: 4px; }
section.cover .s { font-size: 14pt; color: #555; margin-top: 14px; letter-spacing: 6px; }
section.cover .m { font-size: 10pt; color: #777; margin-top: 40px; line-height: 2; }
h1 { font-size: 20pt; margin: 26px 0 14px; padding-bottom: 8px; border-bottom: 2px solid #444; page-break-before: always; break-before: page; }
h1:first-of-type { page-break-before: avoid; break-before: avoid; }
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
/* 目录页码（Paged.js）：章节/附录条目自动显示目标页码 */
a[href^="#ch"]::after, a[href^="#app"]::after { content: "…… " target-counter(attr(href), page); color: #555; }
`;

// 目录页码所需的 Paged.js（本地文件，内联注入）
let pagedCfg = '';
let pagedScript = '';
if (fs.existsSync(PAGED_FILE)) {
  pagedCfg = '<script>window.PagedConfig={auto:true,after:function(){window.__pagedDone=true;}};</script>';
  pagedScript = '<script>' + fs.readFileSync(PAGED_FILE, 'utf8') + '</script>';
} else {
  console.warn('⚠ 未找到 _工具_paged.polyfill.js：本次生成将不含目录页码与页脚页码（书签仍可用）。');
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>小六壬通识：源流·体系·诸派</title>
<style>${css}</style>
${pagedCfg}
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
${pagedScript}
</body>
</html>`;

const htmlPath = path.join(os.tmpdir(), 'xiaoliuren-book-' + Date.now() + '.html');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML 已生成：' + htmlPath + (pagedScript ? '（含 Paged.js 排版）' : ''));

// ---------- ③ 查找浏览器 ----------
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
  process.exit(2);
}

// ---------- ④ CDP 打印（页脚页码由 @page 提供；书签由 generateDocumentOutline 生成） ----------
function cdpPrint(fileUrl) {
  return new Promise((resolve, reject) => {
    const profile = path.join(os.tmpdir(), 'xiaoliuren-pdf-profile-' + Date.now());
    const child = spawn(browser, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      '--allow-file-access-from-files', '--user-data-dir=' + profile, '--remote-debugging-port=0', fileUrl,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    let port = null;
    let settled = false;
    const fail = e => { if (!settled) { settled = true; try { child.kill(); } catch (_) {} reject(e); } };
    const timer = setTimeout(() => fail(new Error('CDP 启动超时（未取得调试端口）')), 30000);
    child.stderr.on('data', d => {
      stderr += d.toString();
      const m = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (m && !port) { port = m[1]; clearTimeout(timer); run(port).then(resolve, fail); }
    });
    child.on('exit', code => { if (!settled && !port) { clearTimeout(timer); fail(new Error('浏览器进程退出：' + code + '\n' + stderr.slice(-500))); } });

    async function run(p) {
      try {
        // 找页面目标
        let target = null;
        for (let i = 0; i < 60 && !target; i++) {
          try {
            const list = await (await fetch('http://127.0.0.1:' + p + '/json/list')).json();
            target = (list || []).find(t => t.type === 'page' && String(t.url).startsWith('file:'));
          } catch (e) { /* 稍后再试 */ }
          if (!target) await new Promise(r => setTimeout(r, 500));
        }
        if (!target) throw new Error('未找到页面调试目标');
        // WebSocket 连接
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WebSocket 连接失败')); });
        let msgId = 0;
        const pending = new Map();
        const send = (method, params) => new Promise(res => {
          const id = ++msgId;
          pending.set(id, res);
          ws.send(JSON.stringify({ id, method, params: params || {} }));
        });
        ws.onmessage = ev => {
          try {
            const m = JSON.parse(ev.data);
            if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
          } catch (e) { /* 忽略事件帧 */ }
        };
        // 等待 Paged.js 完成（若启用）
        if (pagedScript) {
          const t0 = Date.now();
          let done = false;
          while (Date.now() - t0 < 300000) {
            const r = await send('Runtime.evaluate', { expression: 'window.__pagedDone === true', returnByValue: true });
            if (r.result && r.result.result && r.result.result.value === true) { done = true; break; }
            await new Promise(r2 => setTimeout(r2, 700));
          }
          const stats = await send('Runtime.evaluate', {
            expression: 'JSON.stringify({pages:document.querySelectorAll(".pagedjs_page").length, tocLinks:document.querySelectorAll(\'a[href^="#ch"],a[href^="#app"]\').length, toc:(function(){var a=document.querySelector(\'a[href="#ch20"]\');return a?getComputedStyle(a,"::after").content:null;})(), footer:(document.querySelector(".pagedjs_margin-bottom-center")||{}).textContent})',
            returnByValue: true,
          });
          console.log((done ? 'Paged.js 排版完成' : '⚠ Paged.js 未在时限内完成（继续打印）') + '：' + (stats.result && stats.result.result ? stats.result.result.value : ''));
        } else {
          await new Promise(r => setTimeout(r, 2000));
        }
        await new Promise(r => setTimeout(r, 800));
        // 打印
        const res = await send('Page.printToPDF', {
          printBackground: true,
          preferCSSPageSize: true,
          generateDocumentOutline: true,
        });
        if (res.error) throw new Error('printToPDF 错误：' + JSON.stringify(res.error));
        const data = res.result && res.result.data;
        if (!data) throw new Error('printToPDF 无返回数据');
        fs.writeFileSync(OUT_PDF, Buffer.from(data, 'base64'));
        try { ws.close(); } catch (e) { /* 忽略 */ }
        settled = true;
        try { child.kill(); } catch (e) { /* 忽略 */ }
        resolve();
      } catch (e) { fail(e); }
    }
  });
}

function legacyPrint(fileUrl) { // 备用：老式 --print-to-pdf（无页码/书签）
  const profile = path.join(os.tmpdir(), 'xiaoliuren-pdf-profile');
  const args = [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + profile, '--virtual-time-budget=20000', '--run-all-compositor-stages-before-draw',
    '--no-pdf-header-footer', '--print-to-pdf-no-header', '--print-to-pdf=' + OUT_PDF, fileUrl,
  ];
  execFileSync(browser, args, { stdio: 'pipe', timeout: 300000 });
}

(async () => {
  const fileUrl = pathToFileURL(htmlPath).href;
  try {
    await cdpPrint(fileUrl);
  } catch (e) {
    console.warn('⚠ CDP 打印失败（' + e.message + '），回退到基础打印（无页码/书签）。');
    legacyPrint(fileUrl);
  }
  if (!fs.existsSync(OUT_PDF)) { console.error('✗ PDF 生成失败。'); process.exit(3); }
  const buf = fs.readFileSync(OUT_PDF);
  const size = buf.length;
  const head = buf.slice(0, 5).toString('latin1');
  const hasOutline = buf.includes(Buffer.from('/Outlines'));
  console.log('✓ PDF 已生成：' + path.basename(OUT_PDF) + '（' + (size / 1024 / 1024).toFixed(2) + ' MB，' +
    (head === '%PDF-' ? '格式校验通过' : '⚠ 头部异常') + '，' + (hasOutline ? '含书签目录' : '无书签（回退模式）') + '）');
  if (process.env.KEEP_HTML !== '1') { try { fs.unlinkSync(htmlPath); } catch (e) { /* 忽略 */ } }
})();
